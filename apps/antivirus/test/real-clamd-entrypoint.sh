#!/bin/sh
set -eu
# This is a test container, not a production daemon launcher. Do not use in Procfile.
# Official signatures are required: don't fake freshness or silently skip failures.
freshclam --stdout
exec node --test --test-timeout=180000 test/realClamd.integration.ts
