# Multi-stage: dependencies, build, then a runtime image carrying neither
# the source nor the dev dependencies.

FROM node:22-alpine AS deps
WORKDIR /app
# Copy only the manifests first. This layer is cached and re-used on every
# build where dependencies have not changed, so npm ci is skipped entirely.
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# standalone's server.js binds to localhost unless told otherwise, and
# localhost inside a container is unreachable from Caddy. This one line is
# the difference between a working proxy and a 502 with no useful error.
ENV HOSTNAME=0.0.0.0

# Run as a non-root user: a container process that does not need root
# should not have it, so a compromise inside the app is not root inside it.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
# .next/standalone already contains a pruned node_modules and server.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static assets are not part of standalone and must be copied separately,
# or every CSS and JS file 404s while the HTML renders fine.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
