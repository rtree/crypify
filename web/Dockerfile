# Build stage
FROM node:20-alpine AS builder

# Build arguments for NEXT_PUBLIC_* variables
ARG NEXT_PUBLIC_CDP_PROJECT_ID
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_API_URL

# Set as environment variables for Next.js build
ENV NEXT_PUBLIC_CDP_PROJECT_ID=$NEXT_PUBLIC_CDP_PROJECT_ID
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

WORKDIR /root/monorepo

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace config files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy web package files
COPY web/package.json ./web/
COPY web/tsconfig.json ./web/
COPY web/next.config.js ./web/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy web source code
COPY web/app ./web/app
COPY web/lib ./web/lib
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
COPY web/next.config.js ./web/

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
