# devops/local/Dockerfile.app

FROM node:22-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files, excluding dist and node_modules
COPY apps/back ./

# Install production dependencies
RUN npm install

RUN npm run build

# Dev environment + default heap cap (docker-compose also sets this)
ENV NODE_ENV=development
ENV NODE_OPTIONS=--max-old-space-size=1024

EXPOSE 3000 

COPY devops/local/start.sh ./start.sh
RUN chmod +x ./start.sh

CMD ["./start.sh"]
