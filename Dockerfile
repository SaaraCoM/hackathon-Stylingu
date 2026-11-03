FROM node:22-bookworm-slim@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da AS deps
USER node
WORKDIR /home/node
COPY --chown=node:node backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM deps AS test
RUN node --input-type=module -e "import sharp from 'sharp'; const b=await sharp({create:{width:20,height:20,channels:3,background:'#fff'}}).png().toBuffer(); if((await sharp(b).metadata()).width!==20)process.exit(1)"

FROM node:22-bookworm-slim@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da AS assets
USER node
WORKDIR /home/node
COPY --chown=node:node frontend/package.json frontend/package-lock.json ./frontend/
RUN npm ci --prefix frontend
COPY --from=test --chown=node:node /home/node/node_modules ./backend/node_modules
COPY --chown=node:node backend/package.json ./backend/package.json
COPY --chown=node:node frontend/public ./frontend/public
COPY --chown=node:node frontend/barcode-entry.js ./frontend/barcode-entry.js
COPY --chown=node:node scripts/build.mjs ./scripts/build.mjs
ARG RELEASE_VERSION=development
RUN RELEASE_VERSION="$RELEASE_VERSION" node scripts/build.mjs

FROM gcr.io/distroless/nodejs22-debian13:nonroot@sha256:68e53614d5167d39d180ea74a0ca97827e7876ee1effdbb19521f13c77adfa67 AS runtime
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=test /home/node/node_modules ./backend/node_modules
COPY backend/package.json ./backend/package.json
COPY backend/src ./backend/src
COPY shared ./shared
COPY --from=assets /home/node/frontend/dist ./frontend/public
COPY docker/supervisor.mjs ./docker/supervisor.mjs
USER 65532:65532
EXPOSE 8080
CMD ["docker/supervisor.mjs"]
