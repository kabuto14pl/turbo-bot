# Multi-stage Dockerfile optimized for Codespaces
FROM node:20-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000 8080 9090
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
COPY . .
RUN npm ci && npm run build

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache sqlite curl

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S trading -u 1001

WORKDIR /app

# Copy built application
COPY --from=build --chown=trading:nodejs /app/dist ./dist
COPY --from=build --chown=trading:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=trading:nodejs /app/package.json ./package.json

# Create necessary directories
RUN mkdir -p logs data config && \
    chown -R trading:nodejs /app

USER trading

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "dist/main.js"]
