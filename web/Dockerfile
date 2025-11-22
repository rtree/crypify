# Build stage
FROM node:20-alpine AS builder

WORKDIR /root/monorepo

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace config files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy web package
COPY web/package.json ./web/
COPY web/tsconfig.json ./web/
COPY web/next.config.js ./web/

# Install dependencies for entire workspace
RUN pnpm install --frozen-lockfile --filter crypify-web...

# Copy web source
COPY web/app ./web/app
COPY web/lib ./web/lib
COPY web/public ./web/public

# Build
WORKDIR /root/monorepo/web
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built app from builder
COPY --from=builder /root/monorepo/web/.next/standalone ./
COPY --from=builder /root/monorepo/web/.next/static ./.next/static
COPY --from=builder /root/monorepo/web/public ./public

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
