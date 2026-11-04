# Build the browser assets from source, including the local face detector.
FROM node:22-bookworm-slim AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm ci --prefix frontend
COPY frontend/src ./frontend/src
COPY frontend/models ./frontend/models
COPY frontend/public ./frontend/public
COPY frontend/barcode-entry.js ./frontend/barcode-entry.js
COPY scripts/build-design.mjs scripts/build.mjs ./scripts/
RUN node scripts/build.mjs

FROM node:22-bookworm-slim AS deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates tini \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend/package.json ./backend/package.json
COPY backend/src ./backend/src
COPY shared ./shared
COPY db ./db
COPY scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=frontend /app/frontend/public ./frontend/public
COPY docker/entrypoint.sh ./docker/entrypoint.sh

RUN sed -i 's/\r$//' ./docker/entrypoint.sh \
  && chmod +x ./docker/entrypoint.sh \
  && chown -R node:node /app
USER node

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:8080/api/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["./docker/entrypoint.sh"]
