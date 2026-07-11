FROM node:20-alpine

WORKDIR /app

# Install server dependencies
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Copy application code
COPY server ./server
COPY public ./public

WORKDIR /app/server

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "index.js"]
