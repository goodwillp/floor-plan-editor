# Use Debian-based Node.js 24 to support native builds (better-sqlite3)
FROM node:24-bookworm-slim AS base

# Install dependencies only when needed
FROM base AS deps
# Install build tools for native modules (better-sqlite3)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
# Install all dependencies (including dev dependencies for build)
RUN npm ci --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
# Install build tools in builder as well (in case postinstall/native rebuilds occur)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application (production build)
RUN npm run build:prod

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy the built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Install serve to serve the static files
RUN npm install -g serve@14

USER nextjs

EXPOSE 3000

ENV PORT=3000

# Serve the built application
CMD ["serve", "-s", "dist", "-l", "3000"]