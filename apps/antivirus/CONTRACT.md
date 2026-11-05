# Scanner HTTP contract v1

Backend implementers: this is the canonical standalone wire contract (no shared workspace dependency).

- `POST /scan`, `Authorization: Bearer <ANTIVIRUS_TOKEN>`, `Content-Type: application/octet-stream`. Raw bytes, never multipart, filenames or storage keys. No content encoding. Maximum **73,400,320 bytes (70 MiB)**, counted from the stream, including chunked requests. Exactly the limit is allowed. Client must verify its expected immutable object's byte count/hash itself; HTTP cannot detect a sender intentionally declaring a shorter valid body.
- Every route, including `GET /health/live` and `GET /health/ready`, requires the same token (minimum 32 printable non-space ASCII characters). No public unauthenticated probes.
- Every scan/rejection JSON has all these keys:

```ts
interface ScanResult {
  verdict: 'clean' | 'infected' | 'unscannable' | 'error';
  scannedAt: string; // UTC ISO8601 response time, not proof of completion
  sha256: string | null; // lowercase hex; null unless full request consumed
  engineVersion: string | null;
  signatureVersion: string | null; // decimal ClamAV daily DB version
  signatureUpdatedAt: string | null; // UTC ISO8601, loaded DB's date
  detection?: string; // only infected; bounded ClamAV detection label
  errorCode?: string;
  retryable: boolean;
}
```

| HTTP | verdict | errorCode | retryable |
| --- | --- | --- | --- |
| 200 | clean | absent | false |
| 200 | infected | absent | false |
| 200 | unscannable | SCAN_LIMIT_EXCEEDED / ENCRYPTED_CONTENT | false |
| 413 | unscannable | PAYLOAD_TOO_LARGE | false |
| 400 | error | INVALID_REQUEST / TRUNCATED_REQUEST | false |
| 401 | error | UNAUTHORIZED | false |
| 404 | error | NOT_FOUND | false |
| 415 | error | UNSUPPORTED_MEDIA_TYPE | false |
| 503 | error | BUSY / CLAMD_UNAVAILABLE / STALE_SIGNATURES / ENGINE_CHANGED | true |
| 503 | error | CLAMD_PROTOCOL | false |
| 504 | error | SCAN_TIMEOUT | true |
| 500 | error | INTERNAL_ERROR | false |

`BUSY` includes `Retry-After: 1`; no queue. Errors may have null metadata. Broken/truncated HTTP connections may yield no HTTP response: always fail closed. Never treat HTTP 200 alone, an omitted/unknown verdict, malformed JSON, timeout, or a transport error as clean. A valid clean verdict requires all metadata and the full-object matching SHA-256. Store verified metadata with the frozen object; only explicit clean permits parsing/download/export. Infected and unscannable are distinct permanent business outcomes; retry technical failures with bounded backoff.

`CLAMD_PROTOCOL` (including malformed/missing metadata and ambiguous framing) is non-retryable automatically: investigate the protocol/configuration. `ENGINE_CHANGED` is a transient signature reload race, retryable like temporary unavailability. `STALE_SIGNATURES` includes invalid/future loaded dates and can be retried only with bounded backoff while operators correct freshness/clock. Limits/recursion/engine budget alerts always use `SCAN_LIMIT_EXCEEDED`, never an infected verdict. Encryption is `ENCRYPTED_CONTENT`. No raw daemon error or unsafe detection string is returned. A daemon-disconnected scan that may still be executing imposes a conservative BUSY cooldown through its 90s scan budget (+1s); there is no waiting queue.

`GET /health/live`: 200 `{ "status": "live" }` (process only).
`GET /health/ready`: 200 `{ "status": "ready", "engineVersion": string, "signatureVersion": string, "signatureUpdatedAt": string }` only after clamd PING + VERSION and freshness validation; otherwise an error envelope above (503). Probes share one bounded in-flight check, not an unbounded daemon queue. Readiness is independent of scan-slot availability.

All responses: JSON, `Cache-Control: no-store`, `Connection: close`. Clients should use a timeout greater than `SCAN_TIMEOUT_MS` (default 120000), no automatic POST replay. Scanner never logs body/hash/token/filename/detection and has no object persistence.
