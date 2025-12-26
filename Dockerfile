FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl

# Set context to server directory content
COPY server/package*.json ./
RUN npm install

COPY server/ .

RUN npx prisma generate

# Build the TypeScript project
RUN npm run build

EXPOSE 8080

ENV NODE_ENV=production
ENV APP_VERSION=3.5-logging

# Start even if prisma push fails
CMD (npx prisma db push --accept-data-loss || true) && node dist/index.js