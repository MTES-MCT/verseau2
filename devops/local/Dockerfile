# devops/local/Dockerfile.app

FROM node:24-alpine

# Install the package-manager version declared by the project.
RUN npm install -g pnpm@12.4.2

# Create app directory
WORKDIR /usr/src/app

# Copy monorepo package metadata for workspace support
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy local packages that the backend depends on
COPY packages/dossier ./packages/dossier
COPY packages/parser ./packages/parser
COPY packages/shared ./packages/shared

# Copy backend app (excluding dist and node_modules via .dockerignore)
COPY apps/back ./apps/back

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared packages first
RUN pnpm --filter dossier build
RUN pnpm --filter parser build
RUN pnpm --filter shared build

# Build backend (use nest build directly to skip tsc --build project references check)
WORKDIR /usr/src/app/apps/back
RUN pnpm exec nest build

# Change to backend directory for runtime
WORKDIR /usr/src/app/apps/back

# Dev environment + default heap cap (docker-compose also sets this)
ENV NODE_ENV=development
ENV NODE_OPTIONS=--max-old-space-size=1024

EXPOSE 3000 

COPY devops/local/start.sh ./start.sh
RUN chmod +x ./start.sh

CMD ["./start.sh"]
