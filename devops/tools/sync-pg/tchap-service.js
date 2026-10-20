const { MatrixClient } = require('matrix-bot-sdk');
const { setTimeout: sleep } = require('node:timers/promises');
const { getErrorDiagnostics, TchapDeliveryError } = require('./tchap-diagnostics');

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_MESSAGE_BYTES = 55_000;
const IDENTITY_CHECK_MAX_ATTEMPTS = 3;

function utf8Prefix(value, maxBytes) {
  let bytes = 0;
  let index = 0;

  for (const character of value) {
    const characterBytes = Buffer.byteLength(character, 'utf8');
    if (bytes + characterBytes > maxBytes) {
      break;
    }
    bytes += characterBytes;
    index += character.length;
  }

  return value.slice(0, index);
}

function splitMessage(text, maxBytes = DEFAULT_MAX_MESSAGE_BYTES) {
  if (Buffer.byteLength(text, 'utf8') <= maxBytes) {
    return [text];
  }

  const payloadLimit = maxBytes - 32;
  const chunks = [];
  let current = '';

  for (const line of text.split('\n')) {
    let remaining = line;
    while (Buffer.byteLength(remaining, 'utf8') > payloadLimit) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      const prefix = utf8Prefix(remaining, payloadLimit);
      chunks.push(prefix);
      remaining = remaining.slice(prefix.length);
    }

    const candidate = current ? `${current}\n${remaining}` : remaining;
    if (Buffer.byteLength(candidate, 'utf8') > payloadLimit) {
      chunks.push(current);
      current = remaining;
    } else {
      current = candidate;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.map((chunk, index) => `[${index + 1}/${chunks.length}]\n${chunk}`);
}

class TchapService {
  constructor(
    config,
    {
      MatrixClientClass = MatrixClient,
      requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
      maxMessageBytes = DEFAULT_MAX_MESSAGE_BYTES,
      logger = console,
      wait = sleep,
      random = Math.random,
      now = Date.now,
    } = {},
  ) {
    this.config = config;
    this.maxMessageBytes = maxMessageBytes;
    this.logger = logger;
    this.wait = wait;
    this.random = random;
    this.now = now;
    this.requestTimeoutMs = requestTimeoutMs;
    this.homeserverHostname = config.homeserverUrl ? new URL(config.homeserverUrl).hostname : undefined;
    this.client = new MatrixClientClass(config.homeserverUrl, config.accessToken);

    const doRequest = this.client.doRequest.bind(this.client);
    this.client.doRequest = (method, endpoint, qs, body, timeout, raw, contentType, noEncoding) =>
      doRequest(
        method,
        endpoint,
        qs,
        body,
        Number.isFinite(timeout) ? Math.min(timeout, requestTimeoutMs) : requestTimeoutMs,
        raw,
        contentType,
        noEncoding,
      );
  }

  async checkIdentity() {
    const startedAt = this.now();
    for (let attempt = 1; attempt <= IDENTITY_CHECK_MAX_ATTEMPTS; attempt++) {
      const metadata = () => ({
        stage: 'identity-check',
        homeserverHostname: this.homeserverHostname,
        attempt,
        elapsedMs: this.now() - startedAt,
      });
      this.logger.log('Vérification de l’identité Tchap :', JSON.stringify({
        ...metadata(), timeoutMs: this.requestTimeoutMs,
      }));

      try {
        const authenticatedUserId = await this.client.getUserId();
        if (authenticatedUserId !== this.config.userId) {
          const error = new Error(
            `Le token Tchap appartient à ${authenticatedUserId}, alors que TCHAP_USER_ID vaut ${this.config.userId}.`,
          );
          error.code = 'TCHAP_USER_ID_MISMATCH';
          throw error;
        }
      } catch (error) {
        const retryable = error?.code === 'ETIMEDOUT' && error?.connect === true;
        if (!retryable || attempt === IDENTITY_CHECK_MAX_ATTEMPTS) {
          throw new TchapDeliveryError(error, {
            ...metadata(), outcome: retryable ? 'exhausted' : 'failed',
          });
        }

        const delayMs = 1000 * 2 ** (attempt - 1) + Math.floor(this.random() * 250);
        this.logger.warn('Nouvelle tentative de vérification de l’identité Tchap :', JSON.stringify({
          ...metadata(), ...getErrorDiagnostics(error), outcome: 'retrying', delayMs,
        }));
        await this.wait(delayMs);
        continue;
      }

      this.logger.log('Identité Tchap vérifiée :', JSON.stringify({
        ...metadata(), outcome: attempt > 1 ? 'recovered' : 'successful',
      }));
      return;
    }
  }

  async sendText(text, html) {
    await this.checkIdentity();

    const messages = splitMessage(text, this.maxMessageBytes);
    const startedAt = this.now();
    let deliveredMessages = 0;
    const metadata = () => ({
      stage: 'message-send',
      homeserverHostname: this.homeserverHostname,
      attempt: 1,
      elapsedMs: this.now() - startedAt,
      deliveredMessages,
      messageCount: messages.length,
    });
    try {
      // Message sends are not retried: a failed response does not prove non-delivery.
      if (html && messages.length === 1) {
        await this.client.sendMessage(this.config.roomId, {
          body: text,
          msgtype: 'm.text',
          format: 'org.matrix.custom.html',
          formatted_body: html,
        });
        deliveredMessages++;
      } else {
        for (const message of messages) {
          await this.client.sendText(this.config.roomId, message);
          deliveredMessages++;
        }
      }
    } catch (error) {
      throw new TchapDeliveryError(error, { ...metadata(), outcome: 'failed' });
    }
    this.logger.log('Bilan Tchap envoyé :', JSON.stringify({ ...metadata(), outcome: 'successful' }));
  }
}

module.exports = {
  DEFAULT_MAX_MESSAGE_BYTES,
  DEFAULT_REQUEST_TIMEOUT_MS,
  TchapService,
  splitMessage,
};
