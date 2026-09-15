const { MatrixClient } = require('matrix-bot-sdk');

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_MESSAGE_BYTES = 55_000;

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
    } = {},
  ) {
    this.config = config;
    this.maxMessageBytes = maxMessageBytes;
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

  async sendText(text) {
    const authenticatedUserId = await this.client.getUserId();
    if (authenticatedUserId !== this.config.userId) {
      throw new Error(
        `Le token Tchap appartient à ${authenticatedUserId}, alors que TCHAP_USER_ID vaut ${this.config.userId}.`,
      );
    }

    const messages = splitMessage(text, this.maxMessageBytes);
    for (const message of messages) {
      await this.client.sendText(this.config.roomId, message);
    }
  }
}

module.exports = {
  DEFAULT_MAX_MESSAGE_BYTES,
  DEFAULT_REQUEST_TIMEOUT_MS,
  TchapService,
  splitMessage,
};
