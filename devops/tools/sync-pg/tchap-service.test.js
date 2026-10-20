const assert = require('node:assert/strict');
const { test } = require('node:test');
const { TchapService, splitMessage } = require('./tchap-service');
const { getErrorDiagnostics, TchapDeliveryError } = require('./tchap-diagnostics');

const logger = { log() {}, warn() {} };

test('splits oversized messages within the UTF-8 byte limit', () => {
  const text = 'Long message '.repeat(100);
  const parts = splitMessage(text, 100);
  assert.ok(parts.length > 1);
  assert.ok(parts.every((part) => Buffer.byteLength(part, 'utf8') <= 100));
  assert.equal(parts.map((part) => part.slice(part.indexOf('\n') + 1)).join(''), text);
});

test('checks bot identity, caps request timeouts, and sends chunks sequentially', async () => {
  const requests = [];
  const sent = [];
  class Client {
    async doRequest(...args) { requests.push(args); }
    async getUserId() { return '@bot:example.org'; }
    async sendText(room, text) {
      await new Promise(setImmediate);
      sent.push({ room, text });
    }
  }
  const service = new TchapService({ userId: '@bot:example.org', roomId: '!room:example.org' }, {
    MatrixClientClass: Client, requestTimeoutMs: 1000, maxMessageBytes: 100, logger,
  });
  await service.client.doRequest('GET', '/', null, null, 5000);
  assert.equal(requests[0][4], 1000);
  const message = 'hello '.repeat(100);
  await service.sendText(message);
  assert.deepEqual(sent, splitMessage(message, 100).map((text) => ({ room: '!room:example.org', text })));
  service.config.userId = '@wrong:example.org';
  sent.length = 0;
  await assert.rejects(service.sendText('test'), /TCHAP_USER_ID/);
  assert.equal(sent.length, 0);
});

test('sends a single HTML-formatted message when the text fits in one chunk', async () => {
  const sent = [];
  class Client {
    async doRequest() {}
    async getUserId() { return '@bot:example.org'; }
    async sendText(room, text) { sent.push({ room, text }); }
    async sendMessage(room, content) { sent.push({ room, content }); }
  }
  const service = new TchapService({ userId: '@bot:example.org', roomId: '!room:example.org' }, {
    MatrixClientClass: Client, maxMessageBytes: 100, logger,
  });
  const text = 'Bilan : RÉUSSIE\nEnvironnement : PRODUCTION';
  const html = 'Bilan : RÉUSSIE<br>Environnement : <strong>PRODUCTION</strong>';
  await service.sendText(text, html);
  assert.deepEqual(sent, [{
    room: '!room:example.org',
    content: { body: text, msgtype: 'm.text', format: 'org.matrix.custom.html', formatted_body: html },
  }]);
});

test('falls back to plain chunked text when an HTML report must be split', async () => {
  const sent = [];
  class Client {
    async doRequest() {}
    async getUserId() { return '@bot:example.org'; }
    async sendText(room, text) { sent.push({ room, text }); }
    async sendMessage(room, content) { sent.push({ room, content }); }
  }
  const service = new TchapService({ userId: '@bot:example.org', roomId: '!room:example.org' }, {
    MatrixClientClass: Client, maxMessageBytes: 100, logger,
  });
  const text = 'Environnement : PRODUCTION\n' + 'détail '.repeat(100);
  await service.sendText(text, 'Environnement : <strong>PRODUCTION</strong><br>' + 'détail '.repeat(100));
  assert.ok(sent.length > 1);
  assert.ok(sent.every(({ content }) => content === undefined));
  assert.deepEqual(sent.map(({ text }) => text), splitMessage(text, 100));
});

function createService({
  getUserId = async () => '@bot:example.org',
  sendText = async () => {},
  sendMessage = async () => {},
  config = {},
} = {}) {
  let clock = 0;
  const calls = { identity: 0, text: [], html: [] };
  const logs = [];
  const delays = [];
  class Client {
    async doRequest() {}
    async getUserId() {
      calls.identity++;
      clock += 10;
      return getUserId();
    }
    async sendText(room, text) {
      calls.text.push({ room, text });
      clock += 10;
      return sendText(room, text);
    }
    async sendMessage(room, content) {
      calls.html.push({ room, content });
      clock += 10;
      return sendMessage(room, content);
    }
  }
  const capture = (level) => (message, diagnostics) => {
    logs.push({ level, message, ...JSON.parse(diagnostics) });
  };
  const service = new TchapService({
    homeserverUrl: 'https://matrix.example.org',
    accessToken: 'test-token',
    roomId: '!room:example.org',
    userId: '@bot:example.org',
    ...config,
  }, {
    MatrixClientClass: Client,
    maxMessageBytes: 100,
    logger: { log: capture('log'), warn: capture('warn') },
    wait: async (delay) => { delays.push(delay); clock += delay; },
    random: () => 0.5,
    now: () => clock,
  });
  return { service, calls, logs, delays };
}

test('retries an identity connection timeout and sends the report exactly once', async () => {
  let attempts = 0;
  const { service, calls, logs, delays } = createService({
    getUserId: async () => {
      if (++attempts === 1) {
        throw Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT', connect: true });
      }
      return '@bot:example.org';
    },
  });

  await service.sendText('report');

  assert.equal(calls.identity, 2);
  assert.equal(calls.text.length, 1);
  assert.deepEqual(delays, [1125]);
  const retry = logs.find((entry) => entry.outcome === 'retrying');
  assert.equal(retry.level, 'warn');
  assert.equal(retry.stage, 'identity-check');
  assert.equal(retry.homeserverHostname, 'matrix.example.org');
  assert.equal(retry.attempt, 1);
  assert.equal(retry.elapsedMs, 10);
  assert.equal(retry.code, 'ETIMEDOUT');
  assert.equal(retry.connect, true);
  assert.equal(retry.delayMs, 1125);
  const recovered = logs.find((entry) => entry.outcome === 'recovered');
  assert.equal(recovered.attempt, 2);
  assert.equal(recovered.elapsedMs, 1145);
  assert.equal(logs[0].timeoutMs, 15_000);
  const delivered = logs.at(-1);
  assert.equal(delivered.stage, 'message-send');
  assert.equal(delivered.outcome, 'successful');
  assert.equal(delivered.attempt, 1);
  assert.equal(delivered.elapsedMs, 10);
  assert.equal(delivered.deliveredMessages, 1);
});

test('stops after three identity connection timeouts without sending a message', async () => {
  const failure = Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT', connect: true });
  const { service, calls, logs, delays } = createService({ getUserId: async () => { throw failure; } });

  await assert.rejects(service.sendText('report'), (error) => {
    assert.ok(error instanceof TchapDeliveryError);
    assert.equal(error.cause, failure);
    assert.deepEqual(getErrorDiagnostics(error), {
      stage: 'identity-check', homeserverHostname: 'matrix.example.org', attempt: 3,
      elapsedMs: 3280, outcome: 'exhausted', code: 'ETIMEDOUT', connect: true,
    });
    return true;
  });

  assert.equal(calls.identity, 3);
  assert.equal(calls.text.length, 0);
  assert.deepEqual(delays, [1125, 2125]);
  assert.equal(logs.filter((entry) => entry.outcome === 'retrying').length, 2);
  assert.ok(logs.every((entry) => entry.stage === 'identity-check'));
});

for (const failure of [
  Object.assign(new Error('unauthorized'), { errcode: 'M_UNKNOWN_TOKEN', statusCode: 401 }),
  Object.assign(new Error('socket timed out'), { code: 'ESOCKETTIMEDOUT', connect: false }),
  Object.assign(new Error('not a connection timeout'), { code: 'ETIMEDOUT', connect: false }),
  Object.assign(new Error('unknown timeout phase'), { code: 'ETIMEDOUT' }),
  Object.assign(new Error('connection reset'), { code: 'ECONNRESET' }),
  new Error('unexpected failure'),
  'non-Error failure',
]) {
  test(`does not retry an unrelated identity failure: ${String(failure)}`, async () => {
    const { service, calls, delays } = createService({ getUserId: async () => { throw failure; } });
    await assert.rejects(service.sendText('report'), (error) => {
      assert.equal(error.cause, failure);
      assert.equal(error.diagnostics.outcome, 'failed');
      assert.equal(error.diagnostics.attempt, 1);
      return true;
    });
    assert.equal(calls.identity, 1);
    assert.equal(calls.text.length, 0);
    assert.deepEqual(delays, []);
  });
}

test('does not retry or send when the authenticated user does not match', async () => {
  const { service, calls, delays } = createService({ getUserId: async () => '@other:example.org' });
  await assert.rejects(service.sendText('report'), /TCHAP_USER_ID_MISMATCH/);
  assert.equal(calls.identity, 1);
  assert.equal(calls.text.length, 0);
  assert.deepEqual(delays, []);
});

for (const html of [undefined, '<strong>report</strong>']) {
  test(`does not retry a failed message send: ${html ? 'HTML' : 'plain text'}`, async () => {
    const failure = Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT', connect: true });
    const fail = async () => { throw failure; };
    const { service, calls, logs, delays } = createService({ sendText: fail, sendMessage: fail });
    await assert.rejects(service.sendText('report', html), (error) => {
      assert.equal(error.cause, failure);
      assert.equal(error.diagnostics.stage, 'message-send');
      assert.equal(error.diagnostics.outcome, 'failed');
      assert.equal(error.diagnostics.attempt, 1);
      assert.equal(error.diagnostics.deliveredMessages, 0);
      return true;
    });
    assert.equal(calls.identity, 1);
    assert.equal(calls.text.length + calls.html.length, 1);
    assert.deepEqual(delays, []);
    assert.ok(!logs.some((entry) => entry.stage === 'message-send' && entry.outcome === 'successful'));
  });
}

test('does not resend delivered chunks or restart identity checking after a later chunk fails', async () => {
  let attempts = 0;
  let sent = 0;
  const failure = Object.assign(new Error('ETIMEDOUT'), { code: 'ETIMEDOUT', connect: true });
  const { service, calls, delays } = createService({
    getUserId: async () => {
      if (++attempts === 1) throw failure;
      return '@bot:example.org';
    },
    sendText: async () => { if (++sent === 2) throw failure; },
  });
  const text = 'report '.repeat(100);
  await assert.rejects(service.sendText(text), (error) => {
    assert.equal(error.diagnostics.stage, 'message-send');
    assert.equal(error.diagnostics.deliveredMessages, 1);
    assert.equal(error.diagnostics.messageCount, splitMessage(text, 100).length);
    return true;
  });
  assert.equal(calls.identity, 2);
  assert.equal(calls.text.length, 2);
  assert.deepEqual(calls.text.map((entry) => entry.text), splitMessage(text, 100).slice(0, 2));
  assert.deepEqual(delays, [1125]);
});

test('delivery diagnostics omit credentials, message contents, and raw error details', async () => {
  const secret = 'DO_NOT_LOG';
  const failure = Object.assign(new Error(secret), {
    code: 'ETIMEDOUT', connect: true,
    request: { headers: { Authorization: `Bearer ${secret}` } },
    proxy: `https://user:${secret}@proxy.example.org`,
    body: { body: secret },
    cause: new Error(secret),
    toJSON() { return { secret }; },
  });
  let attempts = 0;
  const { service, logs } = createService({
    config: {
      homeserverUrl: `https://user:${secret}@matrix.example.org/${secret}?token=${secret}`,
      accessToken: secret,
    },
    getUserId: async () => {
      if (++attempts === 1) throw failure;
      return '@bot:example.org';
    },
    sendMessage: async () => { throw failure; },
  });
  await assert.rejects(service.sendText(secret, `<strong>${secret}</strong>`), (error) => {
    logs.push(getErrorDiagnostics(error));
    return true;
  });
  assert.doesNotMatch(JSON.stringify(logs), /DO_NOT_LOG|Authorization|Bearer|proxy\.example\.org/);
  assert.ok(logs.every((entry) => entry.homeserverHostname === 'matrix.example.org'));
});

test('error diagnostics allow only safe codes, boolean connection flags, and HTTP statuses', () => {
  assert.deepEqual(getErrorDiagnostics({
    errcode: 'M_UNKNOWN_TOKEN', statusCode: 401, connect: false,
    error: 'secret', body: { secret: true },
  }), { code: 'M_UNKNOWN_TOKEN', statusCode: 401, connect: false });

  for (const error of [
    null,
    'secret',
    { code: 'Bearer secret', connect: 'secret', statusCode: '401' },
    { code: { secret: true }, statusCode: 999 },
    { code: 'A'.repeat(65), statusCode: 0 },
  ]) {
    assert.deepEqual(getErrorDiagnostics(error), { code: 'UNKNOWN_ERROR' });
  }
});
