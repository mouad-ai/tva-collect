FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts && npm install --no-save --ignore-scripts @esbuild/linux-x64@0.23.1

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG APP_URL=https://app.tvacollect.com
ARG ADMIN_URL=https://admin.tvacollect.com
ARG PUBLIC_URL=https://tvacollect.com
ARG APP_HOST=app.tvacollect.com
ARG ADMIN_HOST=admin.tvacollect.com
ARG PUBLIC_HOST=tvacollect.com
ARG NEXTAUTH_URL=https://app.tvacollect.com
ARG SKIP_BUILD_ASSERT=0
ENV APP_URL=$APP_URL
ENV ADMIN_URL=$ADMIN_URL
ENV PUBLIC_URL=$PUBLIC_URL
ENV APP_HOST=$APP_HOST
ENV ADMIN_HOST=$ADMIN_HOST
ENV PUBLIC_HOST=$PUBLIC_HOST
ENV NEXTAUTH_URL=$NEXTAUTH_URL
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN rm -rf .next && npm run build
RUN if [ "$SKIP_BUILD_ASSERT" = "1" ]; then echo "Skipping production build assertion for debug build"; else node scripts/assert-production-build.mjs; fi

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache openssl
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/tsconfig.json ./tsconfig.json
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs && mkdir -p /app/uploads && chown -R nextjs:nextjs /app
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=8s --start-period=45s --retries=5 CMD node scripts/docker-healthcheck.mjs
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && npm run start"]
