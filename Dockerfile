FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl

# Copy server files
COPY server/package*.json ./
RUN npm install

COPY server/ .

RUN npx prisma generate
RUN npm run build

EXPOSE 8080

ENV NODE_ENV=production
ENV APP_VERSION=3.5-final

# Start command (we're already in /app which has server files)
CMD npx prisma db push --accept-data-loss && node dist/index.js