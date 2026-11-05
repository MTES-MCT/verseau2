# Private antivirus gateway

Independent Node 24 / pnpm 12.5.0 application. Raw Node HTTP and Unix sockets only: **no Nest, PostgreSQL, S3, workspace imports, runtime dependencies or application file storage**. Its own workspace and lockfile make `PROJECT_DIR=apps/antivirus` deployable without the rest of the repository. Wire API: [CONTRACT.md](CONTRACT.md).

## Local checks

From `apps/antivirus`:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm test:integration:docker
```

Unit tests use a fake Unix-socket daemon, need no ClamAV/Docker, and include exact 70 MiB boundaries. The last command builds a test-only Node/ClamAV container, downloads **real official signatures** using freshclam, and runs clean XML, harmless EICAR, nested-gzip recursion-limit and oversized-body fixtures through the HTTP gateway. It works with local or sibling/DinD Docker without bind mounts. Allow ~4 GiB RAM and Docker Hub/Debian/ClamAV CDN access; network/rate-limit failures are failures, never silently skipped. No port is published. The engine comes from current Debian security packages, intentionally not a frozen vulnerable version. Ordinary `pnpm test` never runs this integration.

With an existing local clamd running in **UTC** and using this project's policy, `CLAMD_SOCKET_PATH=/absolute/clamd.sock pnpm test:integration` uses it without starting another daemon. Otherwise this command starts a test daemon from `CLAMD_BINARY` (default `clamd`) and the official database at `CLAMD_DATABASE_DIRECTORY` (default `/var/lib/clamav`); set `CLAMD_TEST_USER` when not running as root. A live daemon and fresh signatures are mandatory.

For local serving, export `ANTIVIRUS_TOKEN` and `CLAMD_SOCKET_PATH`, then `pnpm build && pnpm start`. Default local bind is `127.0.0.1:3011`. Tests bind OS-assigned loopback ports and publish nothing.

## Environment

| Variable | Default / rule |
| --- | --- |
| `NODE_ENV` | Set `production` on Scalingo. |
| `ANTIVIRUS_TOKEN` | Required, 32–512 non-space printable ASCII characters; use a cryptographically random secret, identical on backend/scanner. Never put it in URLs. |
| `ANTIVIRUS_PRIVATE_ONLY` | Must be exactly `true` in production. |
| `SCALINGO_PRIVATE_HOSTNAME` | Platform-injected private container hostname; required in production. DNS must resolve to this container's single `10.240.0.0/22` address, verified before listening. |
| `ANTIVIRUS_PORT` | `3011`, integer 1–65535. Fixed private port known by clients; public-router `PORT` is deliberately ignored. |
| `ANTIVIRUS_HOST` | Local only, default `127.0.0.1`; any override is rejected in production, never fall back to `0.0.0.0`. |
| `CLAMD_SOCKET_PATH` | `/app/clamav/run/clamd.sock`, absolute Unix path. Do not expose clamd TCP. |
| `CLAMAV_VERSION` | Buildpack variable: explicitly select a currently supported audited release (real integration tested 1.4.6). Do not rely on upstream's old 1.4.2 default. |
| `SCAN_TIMEOUT_MS` | `120000`, 1000–180000, absolute wall-clock deadline including upload/probes/scan. Client timeout must exceed it. |
| `CLAMD_PROBE_TIMEOUT_MS` | `3000`, 100–10000, bounded coalesced readiness probe. |
| `SIGNATURE_MAX_AGE_HOURS` | `48`, 1–72, loaded daily database date; missing/invalid/future/stale fails readiness **and every scan**. |

Do not set `CLAMD_DISABLE_DAEMON` or `FRESHCLAM_DISABLE_DAEMON`; do not include `scanner` in `CLAMAV_DISABLE_PROCESS_TYPES`. Production rejects those configurations. The buildpack defaults (`postdeploy,one-off`) are appropriate. Keep `CLAMD_DISABLE_CONCURRENT_RELOAD` unset initially; concurrent signature reloads double engine RAM temporarily.

## Verified buildpack lifecycle and limits

`.buildpacks` order is ClamAV, then Node. The upstream ClamAV `bin/compile` generates:

- `<build-dir>/clamav/conf/clamd.conf` → runtime `/app/clamav/conf/clamd.conf`;
- `<build-dir>/clamav/conf/freshclam.conf` with `Checks 12` and `NotifyClamd /app/clamav/conf/clamd.conf`;
- runtime database `/app/clamav/data` and Unix socket `/app/clamav/run/clamd.sock`;
- runtime `.profile.d/010-clamav.sh`, `020-clamd.sh`, `030-freshclam.sh`.

The Node buildpack chooses `scalingo-postbuild` **instead of** `build` when both exist. Our postbuild explicitly runs `pnpm build`, then `scripts/configure-clamd.mjs` in the build directory. The hook validates the generated paths (fails deployment on an unexpected upstream layout), replaces only policy directives idempotently, and adds `.profile.d/005-antivirus-timezone.sh` so clamd's VERSION dates are UTC. It does not modify config after daemon startup. No postdeploy/runtime patch race.

The buildpack's existing `020-clamd.sh` starts/supervises clamd; `030-freshclam.sh` starts/supervises freshclam after random jitter up to one hour. **Procfile/start must never start either daemon again.** Freshclam downloads signatures during build, refreshes 12/day at runtime and notifies clamd; readiness proves the loaded engine's date, not a disk timestamp.

Policy: `StreamMaxLength = MaxFileSize = MaxScanSize = 73400320` bytes; `MaxThreads=1`, `MaxQueue=1`, `MaxRecursion=10`, `MaxFiles=1000`, `MaxScanTime=90000` ms, `AlertExceedsMax=yes`, `AlertEncrypted=yes`, cache disabled, bounded command/read/send timeouts. Clean logging/debug/syslog are off; daemon log sink is `/dev/null` to avoid stream/detection records. Temporary-file retention is explicitly disabled. Freshclam operational update logs contain no submitted objects.

The gateway checks the **actual** streamed byte count independent of Content-Length, hashes while streaming, and pauses HTTP reads until each framed socket write completes. It does not buffer a complete upload. Exactly 70 MiB is accepted by the transport; decompressed/normalized/nested content can still exceed the engine's aggregate scan budget and is then `unscannable`, **not clean or infected**. Encrypted content is also unscannable. Malware labels and daemon raw errors never go into logs.

One scan slot per process, immediately retryable BUSY on overlap, no gateway queue. A clamd scan cannot be cancelled once INSTREAM's terminator is submitted. If the client/daemon disconnects after submission, sockets are destroyed and new scans conservatively remain BUSY until the 90s engine budget (+1s margin) expires, avoiding work queued behind an abandoned scan. Before submission, disconnect/timeout frees the slot immediately. `MaxThreads=1` independently bounds daemon scan concurrency. Any engine/signature change across a completed scan yields retryable `ENGINE_CHANGED`, never clean metadata from an uncertain engine generation.

**Storage caveat:** Node never writes uploaded bytes. ClamAV itself uses ephemeral scratch files for INSTREAM/decompression, automatically removed (`LeaveTemporaryFiles no`); this is intrinsic to clamd, not a persistent upload store. There is no mounted persistent object volume. If policy forbids even ephemeral filesystem scratch, provision an adequately sized memory-backed scratch directory and benchmark its RAM impact before deployment; stock INSTREAM alone cannot satisfy that stronger requirement. Do not blindly use a typical 64 MiB `/dev/shm` for 70 MiB uploads.

Sources reviewed 2026-11-05:

- [ClamAV buildpack README](https://github.com/Scalingo/clamav-buildpack/blob/master/README.md), [compile](https://github.com/Scalingo/clamav-buildpack/blob/master/bin/compile), [generated clamd template](https://github.com/Scalingo/clamav-buildpack/blob/master/files/clamd.conf.erb), [freshclam template](https://github.com/Scalingo/clamav-buildpack/blob/master/files/freshclam.conf.erb), [daemon startup](https://github.com/Scalingo/clamav-buildpack/blob/master/files/profile.d/020-clamd.sh), [updater startup](https://github.com/Scalingo/clamav-buildpack/blob/master/files/profile.d/030-freshclam.sh).
- [Node build script selection](https://github.com/Scalingo/nodejs-buildpack/blob/master/lib/package_manager.sh), [monorepo PROJECT_DIR](https://doc.scalingo.com/platform/app/monorepo), [private binding/process names](https://doc.scalingo.com/platform/networking/private/working-with-private-networks), [private DNS](https://doc.scalingo.com/platform/networking/private/concepts).
- [Clamd protocol](https://github.com/Cisco-Talos/clamav/blob/main/docs/man/clamd.8.in), [scan limits](https://github.com/Cisco-Talos/clamav/blob/main/etc/clamd.conf.sample).

Buildpack URLs follow upstream as requested. Review deployment logs/config and rerun real integration when upgrading ClamAV/buildpacks; pin audited buildpack revisions operationally if your release policy requires it.

At research time the buildpack's [DEFAULT_VERSIONS](https://github.com/Scalingo/clamav-buildpack/blob/master/DEFAULT_VERSIONS) still specified **1.4.2**. Set `CLAMAV_VERSION` explicitly to an audited supported release, verify its official binary is available for the Scalingo stack, and test that exact release before production. The Docker integration used Debian ClamAV **1.4.6**, so it validates the real protocol/policy but is not an exact Scalingo-image test.

## Independent Scalingo deployment runbook (operator action, not performed here)

1. Create a **separate scanner application**, same region/project and attached to the **same Private Network** as API/worker. Same project alone is not sufficient. Configure `PROJECT_DIR=apps/antivirus` before first build; only this directory ships. No database/S3 addons or backend storage credentials belong here.
2. Set required environment above (`NODE_ENV=production`, `ANTIVIRUS_PRIVATE_ONLY=true`, random shared token, private port 3011), keep daemon/updater enabled, and use the two `.buildpacks` URLs in the committed order. `Procfile` is exactly `scanner: pnpm start`. Start with **2XL**, following the buildpack's RAM recommendation for concurrent signature reloads.
3. Deploy the scanner image independently. Formation must be **`scanner:1`, `web:0`**, no `tcp`/public listener. Verify the process really binds the private interface, not `0.0.0.0` or public `PORT`; production fails fast without the platform hostname/private opt-in. Disable any automatically created web process before enabling clients. No public DNS/custom domain/router exposure is needed.
4. Discover process-type private DNS via `scalingo --app <scanner-app> private-networks-domain-names`. Backend URL is `http://scanner.<application-id>.<private-network-id>.private-network.internal:3011`, **not** application bare DNS (defaults to web) and not a hardcoded container number/IP. Private DNS TTL is 5s; clients must reconnect after restarts. The platform's Private Network encrypts inter-container traffic; token authentication is still mandatory on every endpoint.
5. From a trusted same-network container, verify authorized `/health/live` and `/health/ready` (no public monitor, no token in command history/logs), clean XML → complete clean metadata, harmless EICAR → infected, and budgets → unscannable. Wrong token must return 401. From outside the network, prove scanner is unreachable. A ready process can still return BUSY under load.
6. Benchmark realistic XML sizes and worst-case nested fixtures, **during signature reloads as well as ordinary scans**. Track peak RSS/CPU/disk scratch, latency p50/p95/p99, updater failures, signature age, timeout and BUSY rates. Tune container size/deadlines using measured headroom; do not increase concurrency from 1 without a separate capacity/security review. Concurrent reload can temporarily load two signature engines.
7. Only after scanner readiness/contract validation, deploy backend schema/gating/client configuration using the matching URL/token. Enable scanning of frozen processing objects before parsing/business queues/export; errors must fail closed. Do not automatically replay POSTs. Use bounded worker retries/backoff for transient errors. Rotate token by coordinated client/server rollout (one active token, no unauthenticated migration window).
8. Historical files are **not implicitly clean**. Keep pending/unscanned history blocked; any backfill must explicitly rescan each immutable object and record verified metadata. Never bulk mark historical rows clean. Preserve infected/unscannable outcomes as distinct from temporary service failure.

## Observability and operational risks

Gateway stdout emits only fixed JSON events (`listening`, `startup_configuration_error`, `server_error`) and scan metrics `{event, verdict, errorCode?, durationMs}`. It logs no URL/header/token/hash/body/original filename/detection/daemon message, and has no access-log middleware. Export aggregate counts/latencies to your log drain; alert on error/timeout/BUSY rate, missing readiness, stale signatures and Scalingo memory/restarts. Private traffic bypasses public router metrics, so do not rely on router RPM/latency/autoscaling. Probe `/health/ready` with the shared secret via a protected internal monitor.

No malware scanner guarantees all malicious content is detected. Maintain engine/signature updates, resource budgets, safe XML parsing and downstream gates. A clean result certifies only the exact fully consumed bytes and observed engine generation; backend must verify immutable-object hash/size. A sender can intentionally declare a shorter valid HTTP body; the gateway cannot know the intended object. HTTP parser/framing failures can close the connection without a JSON envelope, which must never be interpreted as clean. CDN/network failures may prevent builds or freshclam updates; stale readiness and scan refusal are intentional fail-closed behavior.
