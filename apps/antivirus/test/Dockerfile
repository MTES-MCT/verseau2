# Test-only image; deployment uses Scalingo's ClamAV + Node buildpacks.
FROM node:24.22.1-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends clamav clamav-daemon ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /scanner
COPY src ./src
COPY test ./test
COPY scripts ./scripts
ENV TZ=UTC
ENTRYPOINT ["sh", "test/real-clamd-entrypoint.sh"]
