# ============================================================================
# 🐳 AUTONOMOUS TRADING BOT - PRODUCTION DOCKERFILE
# ============================================================================
# Base: Debian 12 (Bookworm) - GLIBC 2.36 (fixes DuckDB compatibility)
# Node.js: v20 LTS
# Purpose: Production-ready environment for 24/7 trading operations
# ============================================================================

FROM node:20-bookworm-slim

# ============================================================================
# METADATA
# ============================================================================
LABEL maintainer="kabuto14pl"
LABEL description="Autonomous Trading Bot with TIER 1-3 ML Systems"
LABEL version="4.0.4"
LABEL glibc.version="2.36"

# ============================================================================
# ENVIRONMENT VARIABLES
# ============================================================================
ENV NODE_ENV=production
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# DuckDB compatibility
ENV DUCKDB_INSTALL_DIR=/usr/local/lib

# TensorFlow.js optimization
ENV TF_ENABLE_ONEDNN_OPTS=0
ENV KAFKAJS_NO_PARTITIONER_WARNING=1

# ============================================================================
# SYSTEM DEPENDENCIES
# ============================================================================
RUN apt-get update && apt-get install -y \
    # Build essentials for native modules
    build-essential \
    python3 \
    make \
    g++ \
    gcc \
    # DuckDB dependencies
    libc6 \
    libstdc++6 \
    # Networking tools
    curl \
    wget \
    # Process management
    procps \
    # Cleanup
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Verify GLIBC version (should be 2.36+)
RUN ldd --version

# ============================================================================
# WORKING DIRECTORY
# ============================================================================
WORKDIR /app

# ============================================================================
# DEPENDENCY INSTALLATION (leverages Docker layer caching)
# ============================================================================

# Copy package files first
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production --legacy-peer-deps \
    && npm cache clean --force

# ============================================================================
# APPLICATION CODE
# ============================================================================

# Copy trading bot core
COPY trading-bot/ ./trading-bot/

# Copy enterprise dashboard to both locations
COPY enterprise-dashboard.html ./index.html
COPY enterprise-dashboard.html ./dashboard.html
COPY test-endpoints.html ./test-endpoints.html

# Copy source files
COPY src/ ./src/

# Copy configuration
COPY .env.example .env
COPY monitoring/ ./monitoring/

# Create necessary directories
RUN mkdir -p \
    logs/production \
    data/production \
    data/analytics \
    backups/production \
    reports

# ============================================================================
# BUILD TYPESCRIPT (if needed for production)
# ============================================================================
# Uncomment if you want to compile TypeScript to JavaScript
# RUN npm install -D typescript @types/node && \
#     npx tsc && \
#     npm uninstall typescript @types/node

# ============================================================================
# HEALTHCHECK
# ============================================================================
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# ============================================================================
# EXPOSED PORTS
# ============================================================================
# Health checks & API
EXPOSE 3001
# Prometheus metrics (optional)
EXPOSE 9090

# ============================================================================
# USER (non-root for security)
# ============================================================================
RUN useradd -m -u 1001 -s /bin/bash tradingbot && \
    chown -R tradingbot:tradingbot /app

USER tradingbot

# ============================================================================
# VOLUME (for persistent data)
# ============================================================================
VOLUME ["/app/data", "/app/logs", "/app/backups"]

# ============================================================================
# ENTRYPOINT
# ============================================================================
CMD ["npx", "ts-node", "--transpile-only", "trading-bot/autonomous_trading_bot_final.ts"]
