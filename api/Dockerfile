# Build stage
FROM node:20-alpine AS builder

WORKDIR /root/monorepo

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace config files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy api package files
COPY api/package.json ./api/
COPY api/tsconfig.json ./api/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy api source code
COPY api/src ./api/src

# Build the API
WORKDIR /root/monorepo/api
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /root/monorepo

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace config files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy api package.json
COPY api/package.json ./api/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built files from builder
COPY --from=builder /root/monorepo/api/dist ./api/dist

# Set working directory to api
WORKDIR /root/monorepo/api

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/index.js"]
