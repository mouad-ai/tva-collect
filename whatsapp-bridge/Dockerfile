FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
# npm install, not npm ci: this service's package-lock.json was generated
# with the only npm available in this dev environment (v6, bundled with a
# very old local Node) because there's no modern Node here to do it properly.
# `npm ci` demands an exact package.json/lockfile sync and can be pickier
# about lockfile provenance than `npm install`. Regenerate this lockfile
# with a real npm 10+ (`npm install` from this directory) and switch back to
# `npm ci` once that's done — see whatsapp-bridge/README.md.
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN addgroup -S bridge && adduser -S bridge -G bridge && mkdir -p /app/auth_session && chown -R bridge:bridge /app
USER bridge
EXPOSE 8088
HEALTHCHECK --interval=30s --timeout=8s --start-period=20s --retries=5 \
  CMD wget -q -O - http://127.0.0.1:8088/health >/dev/null || exit 1
CMD ["node", "dist/index.js"]
