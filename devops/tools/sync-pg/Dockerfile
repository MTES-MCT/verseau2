FROM node:20-alpine

RUN apk add --no-cache postgresql-client

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

COPY package*.json ./
RUN pnpm install

COPY . .

CMD ["pnpm", "start"]
