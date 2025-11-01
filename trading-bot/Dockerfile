# 🔧 [PRODUCTION-CONFIG] Docker configuration for trading bot system
# ENTERPRISE TRADING BOT - DOCKER CONFIGURATION
# Multi-stage build for optimized production deployment

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY *.ts ./

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S trader && \
    adduser -S trader -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create directories for logs and data
RUN mkdir -p /app/logs /app/data && \
    chown -R trader:trader /app

# Switch to non-root user
USER trader

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Expose ports
EXPOSE 3000 8080

# Environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV ENABLE_REAL_DATA=true
ENV REDIS_URL=redis://redis:6379
ENV MONGODB_URL=mongodb://mongo:27017/trading-bot

# Resource limits
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Start application
CMD ["node", "dist/phase2_integration_system.js"]
