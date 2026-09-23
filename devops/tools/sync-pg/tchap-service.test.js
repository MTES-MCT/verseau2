const assert = require('node:assert/strict');
const { test } = require('node:test');
const { TchapService, splitMessage } = require('./tchap-service');

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
    MatrixClientClass: Client, requestTimeoutMs: 1000, maxMessageBytes: 100,
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
    MatrixClientClass: Client, maxMessageBytes: 100,
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
    MatrixClientClass: Client, maxMessageBytes: 100,
  });
  const text = 'Environnement : PRODUCTION\n' + 'détail '.repeat(100);
  await service.sendText(text, 'Environnement : <strong>PRODUCTION</strong><br>' + 'détail '.repeat(100));
  assert.ok(sent.length > 1);
  assert.ok(sent.every(({ content }) => content === undefined));
  assert.deepEqual(sent.map(({ text }) => text), splitMessage(text, 100));
});
