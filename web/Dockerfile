# Build stage
FROM node:20-alpine AS builder

WORKDIR /root/monorepo

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace config files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy web package files
COPY web/package.json ./web/
COPY web/tsconfig.json ./web/
COPY web/next.config.ts ./web/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy web source code
COPY web/app ./web/app
COPY web/public ./web/public

# Build the Next.js app
WORKDIR /root/monorepo/web
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /root/monorepo

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace config files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy web package files
COPY web/package.json ./web/
COPY web/next.config.ts ./web/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built files from builder
COPY --from=builder /root/monorepo/web/.next ./web/.next
COPY --from=builder /root/monorepo/web/public ./web/public

# Set working directory to web
WORKDIR /root/monorepo/web

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["pnpm", "start"]
