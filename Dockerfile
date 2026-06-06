FROM node:26-alpine AS backend

WORKDIR /app

RUN apk add --no-cache ffmpeg

COPY backend-node/package*.json ./backend-node/
RUN cd backend-node && npm ci --omit=dev

COPY . .

EXPOSE 3000 8080

CMD ["node", "backend-node/src/server.js"]

FROM node:26-alpine AS frontend

WORKDIR /app

COPY frontend/package*.json ./frontend/
COPY frontend/scripts ./frontend/scripts
RUN cd frontend && npm ci

COPY . .

RUN cd frontend && npm run sync:fontisto && npm run build

EXPOSE 8081

CMD ["npm", "--prefix", "frontend", "start"]
