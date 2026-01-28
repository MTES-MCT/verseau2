# devops/local/Dockerfile.app

FROM node:24-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy monorepo package.json and lock file for workspace support
COPY package*.json ./

# Copy local packages that the backend depends on
COPY packages/dossier ./packages/dossier
COPY packages/parser ./packages/parser
COPY packages/shared ./packages/shared

# Copy backend app (excluding dist and node_modules via .dockerignore)
COPY apps/back ./apps/back

# Install root dependencies first (including husky for prepare script)
RUN npm install --include=dev

# Install workspace dependencies 
RUN npm install --workspace=apps/back --workspace=packages/dossier --workspace=packages/parser --workspace=packages/shared

# Build shared packages first
RUN npm run build --workspace=packages/dossier
RUN npm run build --workspace=packages/parser
RUN npm run build --workspace=packages/shared

# Build backend (use nest build directly to skip tsc --build project references check)
WORKDIR /usr/src/app/apps/back
RUN npx nest build

# Change to backend directory for runtime
WORKDIR /usr/src/app/apps/back

# Dev environment + default heap cap (docker-compose also sets this)
ENV NODE_ENV=development
ENV NODE_OPTIONS=--max-old-space-size=1024

EXPOSE 3000 

COPY devops/local/start.sh ./start.sh
RUN chmod +x ./start.sh

CMD ["./start.sh"]
