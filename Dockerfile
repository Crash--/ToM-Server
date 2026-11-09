# =============================================================================
# ToM Server - production image
#
# Usage:
#   docker build -t tom-server .
#   docker run
#       -v /path/to/config.yaml:/data/config.yaml:ro
#       --rm tom-server
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1 - builder: bundle the sources, keep production dependencies only
# -----------------------------------------------------------------------------
FROM docker.io/library/node:26.13.0-trixie-slim AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.json tsconfig.build.json ./
COPY src/ ./src/

RUN npm ci

RUN npm run build && npm prune --omit=dev

# -----------------------------------------------------------------------------
# Stage 2 - runtime image: fresh with assets files, bundle and dependencies
# -----------------------------------------------------------------------------
FROM docker.io/library/node:26.13.0-trixie-slim AS runtime

# fetch follows HTTP(S)_PROXY and NO_PROXY, as it did under Bun
ENV NODE_USE_ENV_PROXY=1

WORKDIR /usr/share/twake/chat/tom

COPY ./assets/i18n/ ./i18n/
COPY ./assets/static/ ./static/
COPY ./assets/templates/ ./templates/

WORKDIR /app
RUN mkdir -p /data

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/dist/ ./dist/

ENTRYPOINT ["node", "dist/main.js", "--config", "/data/config.yaml"]
