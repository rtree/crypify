# Build stage
FROM node:20-alpine AS builder

WORKDIR /root/monorepo

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace config files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy api package
COPY api/package.json ./api/
COPY api/tsconfig.json ./api/

# Install dependencies for entire workspace
RUN pnpm install --frozen-lockfile --filter crypify-api...

# Copy api source
COPY api/src ./api/src

# Build
WORKDIR /root/monorepo/api
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy only necessary files
COPY --from=builder /root/monorepo/api/package.json ./
COPY --from=builder /root/monorepo/api/dist ./dist
COPY --from=builder /root/monorepo/pnpm-lock.yaml /root/monorepo/pnpm-workspace.yaml /root/monorepo/package.json /root/monorepo/

# Install production dependencies
WORKDIR /root/monorepo
RUN pnpm install --prod --frozen-lockfile --filter crypify-api...

# Set working directory back to app
WORKDIR /app
RUN cp -r /root/monorepo/node_modules ./

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/index.js"]
