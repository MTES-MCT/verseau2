# Private antivirus backend foundation

## Integration APIs

```ts
// @infra/antivirus/antivirus.gateway
AntivirusGateway.scan(buffer: Buffer): Promise<AntivirusScanResult>
AntivirusGateway.scanStream(stream: Readable, size: number, signal?: AbortSignal): Promise<AntivirusScanResult>

// @infra/s3/s3 — existing download() still returns a Buffer for XML processing
S3.downloadStream(key: string, signal?: AbortSignal): Promise<{ stream: Readable; size: number }>

// @dossier/depot/depotAntivirus.gateway
DepotAntivirusGateway.recordScan(
  depotId: string,
  response: AntivirusScanResponse,
  expectedFilePath: string,
): Promise<DepotModel | null>
DepotAntivirusGateway.completeScan(
  job: FichierDeDepot,
  result?: AntivirusScanResponse,
  signal?: AbortSignal,
): Promise<DepotModel | null>

// @dossier/depot/antivirusAnalysis.model
normalizeAntivirusAnalysis(depotId, analysis?): AntivirusAnalysisModel
```

Upload completion publishes `antivirus_scan`, consumed by `AntivirusProcessorService`. It pipes the immutable S3 object's readable stream directly to `AntivirusGateway.scanStream`, with bounded buffering/backpressure, incremental byte counting and SHA-256 verification, and cancellation/stream cleanup on every outcome. It never downloads a full Buffer or writes a temporary file. The existing `S3.download` and `AntivirusGateway.scan` methods remain available unchanged.

`DepotAntivirusGateway.completeScan(job, result?, signal?)` validates and persists the verdict, and publishes `process_file` on the same PostgreSQL transaction under the depot row lock, only when the persisted verdict becomes clean. Duplicate clean scans do not enqueue again; a clean retry means its processing job already committed, so it does not rescan or republish. An enqueue failure rolls back the clean verdict too, so its retry rescans. Errors use `recordScan` to retain their failure evidence; infection remains terminal and wins over concurrent clean. `FileProcessorService` requires persisted clean before any buffered download, decoding/parsing or business-control dispatch; it no longer invokes the antivirus.

The scan and parsing queues have independent retry/dead-letter handling (`antivirus_scan_failed` and `process_file_failed`). Scan exhaustion must not reject a clean file waiting for its already-published processing job. Both processors ignore stale keys/terminal/advanced depots. Queued payloads contain deposit metadata and the S3 key, never file bytes or local paths.

pg-boss owns job expiration and the persisted retry budget. Processors use direct `await`s and the queue's cancellation signal, passed to streaming I/O and checked before transactional handoffs; there is no additional processor deadline or promise-racing wrapper. Operations without cancellation support are awaited to completion before checking the signal.

The persistence helper checks the expected key against the locked depot's path. A stale job throws `DepotAntivirusConflictError` (`code=ANTIVIRUS_OBJECT_MISMATCH`, `retryable=false`) without publishing a verdict for the wrong object. Do not retry deterministic failures indefinitely.

Downstream business controls, SANDRE, SFTP/FTP and report diffusion trust the initial handoff: they do not inspect antivirus evidence or rehash file contents, and their existing sequential workflow is unchanged. XML downloads only require the saved `CLEAN` status for access; they do not revalidate audit metadata or downloaded bytes. The processing key must remain immutable after upload completion.

## One-to-one storage

`AntivirusAnalysisEntity` lives in `@dossier/depot/antivirusAnalysis.entity`. Table `antivirus_analysis` owns a **one-to-one** `depot` relation via `@JoinColumn({name:'depot_id'})`: `depot_id` is unique, nonnull, and references `depot.id` with `ON DELETE CASCADE`. `DepotEntity.antivirusAnalysis` is the optional inverse relation; there are **no antivirus columns/status on depot** and no attempt history.

The unshipped additive migration `1793836800000-AddAntivirusAnalysis.ts` creates this table only. It leaves historical rows absent (meaning pending/nonclean), never backfills clean, and has a table-only down migration. New depots also start absent/pending; the first `recordScan` locks the depot row and lazily creates its analysis, preventing concurrent creation races. Every retry updates that same row/id.

Analysis fields: `depotId`, `filePath`, `status` (`pending|clean|infected|error`), `scannedAt`, `sha256`, `engineVersion`, `signatureVersion`, `signatureUpdatedAt`, `detection`, `errorCode`, `retryable`, plus standard id/createdAt/updatedAt. Audit instants are nullable `Date`; local transport failures do not invent a scan timestamp. Unscannable maps to `status=error` with its stable reason and `retryable=false`.

`recordScan` validates complete response metadata. Infected is terminal. Clean duplicates and late errors for the same object are no-ops, errors can recover to clean, and infection can supersede clean. Changed content/key invalidates prior clean as `SCANNER_DIGEST_CHANGED`/`SCANNER_OBJECT_CHANGED` (nonretryable). `DepotRepository` generic create/update and upload repository save exclude caller-supplied analysis; only the dedicated helper should modify antivirus evidence.

`DepotModel.antivirusAnalysis` is a normalized `AntivirusAnalysisModel`, without ORM relations. The mapper always supplies it; the TS property is optional solely for legacy fixtures. `normalizeAntivirusAnalysis` maps absent, unloaded, or mismatched relations to pending; it does not validate file integrity. Never interpret undefined/null/unloaded analysis as clean.

All `DepotRepository` read paths explicitly load the relation. Row-locked generic/upload updates load it separately to avoid PostgreSQL's nullable-outer-join locking restriction. `mapDepotEntityToModel` propagates normalized analysis. Public `DepotDto`/`mapDepotEntityToDepotDto` expose only the derived `antivirusStatus`, not detection or internal audit metadata; omitted legacy DTO status means pending. There is no second persistent status to drift.

## Nest wiring and tests

`DossierModule` registers the analysis entity and exports `DepotAntivirusGateway`. `InfraModule` imports/exports `AntivirusModule`, which exports `AntivirusGateway`. Explicit TypeORM entity lists must include `AntivirusAnalysisEntity` whenever they include `DepotEntity` (the shared test initializer is updated).

Mocking is exclusively a DI override (`MockAntivirusGateway` or `createMock<AntivirusGateway>()`), never an environment-selected clean fallback. Test modules replacing `InfraModule` must import `AntivirusModule` or provide the scanner token themselves.

## Configuration

- `ANTIVIRUS_URL`: HTTP origin with explicit port **3011**, no credentials/path/query/fragment. `/scan` is appended.
- `ANTIVIRUS_TOKEN`: at least 32 printable non-space ASCII characters; same value on backend and scanner.
- `ANTIVIRUS_TIMEOUT_MS`: integer 1–600000; default **150000**, greater than scanner default `SCAN_TIMEOUT_MS=120000`. The `antivirus_scan` lease is the HTTP timeout plus 150 seconds (300 seconds by default), with three bounded retries. `process_file` has its own fixed 300-second lease, independent of this timeout.
- Optional `ANTIVIRUS_PROVIDER` accepts only `http` (default); bypass values are rejected.

Production requires settings and documented non-public Scalingo process-type DNS:

```text
http://antivirus.ap-<application-uuid>.pn-<private-network-uuid>.private-network.internal:3011
```

Container-number prefixes, bare app DNS (implicitly web), public URLs, IPs, and `web`/`tcp`/`postdeploy` types are rejected. Validation checks DNS shape, not deployed network membership: operators must provision the private network and bind the scanner to its private interface. See [Scalingo DNS](https://doc.scalingo.com/platform/networking/private/concepts) and [private interfaces](https://doc.scalingo.com/platform/networking/private/working-with-private-networks). Nonproduction with no scanner settings can boot, but scans throw nonretryable `SCANNER_NOT_CONFIGURED`. Partial/invalid settings fail startup.

## Wire contract and errors

Canonical standalone contract: `apps/antivirus/CONTRACT.md` (no scanner/backend runtime package dependency). Shared schemas/types are exported from `@lib/dossier`: `antivirusScanResponseSchema`, `AntivirusScanResponse`, `AntivirusScanResult`, `AntivirusScanFailure`, `AntivirusStatus`.

`POST /scan`, bearer auth, `application/octet-stream`, exact content length. The queue uses `scanStream` with S3's content length and rejects invalid/oversize/truncated/overlong input. SHA-256 is computed incrementally on the outgoing chunks and checked only against a complete upload. The legacy `scan(Buffer)` still streams views of its supplied Buffer. Neither sends filenames, storage keys, multipart or base64. Proxies, redirects, and automatic POST replay are disabled; JSON response size is capped at 16 KiB and a total timeout is enforced.

Clean/infected require JSON HTTP 200, matching lowercase SHA-256, ISO scannedAt/signatureUpdatedAt, nonempty engineVersion, signatureVersion of 1–256 ASCII decimal digits, and retryable=false. Signature versions are not trimmed/coerced; surrounding whitespace is invalid. Early failures may omit/null metadata. Infected detection labels are bounded/sanitized; clean cannot carry detection/errorCode. HTTP 200 unscannable is deterministic (`SCAN_LIMIT_EXCEEDED`/`ENCRYPTED_CONTENT`); limit heuristic labels are defensively reclassified as unscannable, never infected. HTTP 413 is unscannable; 400/415/auth/protocol failures are nonretryable errors.

All adapter failures extend `AntivirusScanError` with `.code`, `.retryable`, `.failure`; persist `.failure` using `recordScan`:

- `AntivirusTransientError`: local `SCANNER_TIMEOUT`/`SCANNER_UNAVAILABLE`/`SCANNER_SOURCE_FAILED`, HTTP busy/unavailable/timeout, and stable remote `BUSY`, `CLAMD_UNAVAILABLE`, `STALE_SIGNATURES`, `ENGINE_CHANGED` (signature reload race), `SCAN_TIMEOUT`. Caller owns bounded backoff/exhaustion. Interrupted streams have no fabricated full-file digest.
- `AntivirusUnscannableError`: nonretryable limits/encryption/oversize, retaining the stable reason.
- `AntivirusProtocolError`: nonretryable response/metadata/digest/auth/config/protocol issues. Remote `CLAMD_PROTOCOL`/`INTERNAL_ERROR` are nonretryable. Local codes include `SCANNER_INVALID_RESPONSE`, `SCANNER_DIGEST_MISMATCH`, `SCANNER_HTTP_<status>`, `SCANNER_UNEXPECTED_ERROR_STATUS`, `SCANNER_REQUEST_FAILED`, `SCANNER_NOT_CONFIGURED`.

Remote error codes are allowlisted before use. Exceptions never retain raw Axios request/config/response objects, daemon reply bodies, token, filename, or content in their message/cause. Sentinel tests exercise the existing logger boundary. This adapter does not use health endpoints or interpret liveness as a clean verdict.
