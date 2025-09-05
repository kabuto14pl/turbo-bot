#!/bin/bash

# 🚀 PRODUCTION QUICK START SCRIPT
# One-command deployment of complete trading bot infrastructure

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

show_banner() {
    echo
    echo "🚀 ENTERPRISE TRADING BOT - PRODUCTION DEPLOYMENT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 Zero-downtime deployment with auto-scaling"
    echo "🛡️ Enterprise security and monitoring"
    echo "⚡ Load-balanced high availability"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
}

check_requirements() {
    log_info "Checking requirements..."
    
    local missing=()
    command -v docker >/dev/null 2>&1 || missing+=("docker")
    command -v docker-compose >/dev/null 2>&1 || missing+=("docker-compose")
    command -v kubectl >/dev/null 2>&1 || missing+=("kubectl")
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing[*]}"
        log_error "Please install missing tools and try again"
        exit 1
    fi
    
    log_success "Requirements check passed"
}

choose_deployment_mode() {
    echo
    echo "Choose deployment mode:"
    echo "1) 🐳 Docker Compose (Recommended for local/single server)"
    echo "2) ☸️  Kubernetes (Enterprise production)"
    echo "3) 🎯 Demo Mode (Safe testing)"
    echo
    read -p "Enter choice [1-3]: " choice
    
    case $choice in
        1)
            DEPLOYMENT_MODE="docker"
            ;;
        2)
            DEPLOYMENT_MODE="kubernetes"
            ;;
        3)
            DEPLOYMENT_MODE="demo"
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac
    
    log_info "Deployment mode: ${DEPLOYMENT_MODE}"
}

configure_environment() {
    log_info "Configuring environment..."
    
    # Create .env file if not exists
    if [[ ! -f .env ]]; then
        log_info "Creating .env configuration file..."
        cat > .env << EOF
# Trading Bot Configuration
NODE_ENV=production
BOT_MODE=demo
EXECUTION_ENGINE=simulated

# Initial Configuration
INITIAL_CAPITAL=10000
MAX_DRAWDOWN=0.15
MAX_DAILY_DRAWDOWN=0.05
AUTO_HEDGING=true

# Monitoring
GRAFANA_PASSWORD=admin
PROMETHEUS_RETENTION=30d

# Security
ENABLE_REAL_TRADING=false
PRODUCTION_CONFIRMED=false
EOF
        log_warning "Created .env file with safe defaults"
        log_warning "Edit .env file for production configuration"
    fi
    
    source .env
    log_success "Environment configured"
}

deploy_docker_compose() {
    log_info "Deploying with Docker Compose..."
    
    # Build and start services
    docker-compose -f docker-compose.prod.yml build
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Health check
    if curl -f -s http://localhost/health >/dev/null 2>&1; then
        log_success "Docker deployment successful"
        show_docker_status
    else
        log_error "Health check failed"
        docker-compose -f docker-compose.prod.yml logs --tail=50
        exit 1
    fi
}

deploy_kubernetes() {
    log_info "Deploying to Kubernetes..."
    
    # Run the production deployment script
    chmod +x deploy_production.sh
    ./deploy_production.sh
    
    log_success "Kubernetes deployment completed"
}

deploy_demo_mode() {
    log_info "Starting demo mode..."
    
    # Update environment for demo
    export BOT_MODE=demo
    export EXECUTION_ENGINE=simulated
    export ENABLE_REAL_TRADING=false
    
    # Start monitoring stack first
    docker-compose -f analytics/docker-compose.yml up -d
    
    # Start single trading bot instance
    docker-compose -f docker-compose.production.yml up -d trading-bot
    
    log_success "Demo mode started"
    show_demo_status
}

show_docker_status() {
    echo
    log_success "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo
    echo "📊 Service URLs:"
    echo "  • Trading Bot Dashboard: http://localhost"
    echo "  • Health Check: http://localhost/health"
    echo "  • Grafana: http://localhost:3000 (admin/admin)"
    echo "  • Prometheus: http://localhost:9090"
    echo "  • Kibana: http://localhost:5601"
    echo
    echo "🔍 Service Status:"
    docker-compose -f docker-compose.prod.yml ps
    echo
    echo "📋 Quick Commands:"
    echo "  • View logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "  • Stop all: docker-compose -f docker-compose.prod.yml down"
    echo "  • Scale bots: docker-compose -f docker-compose.prod.yml up -d --scale trading-bot-1=2"
    echo
}

show_demo_status() {
    echo
    log_success "🎯 DEMO MODE STARTED!"
    echo
    echo "📊 Demo URLs:"
    echo "  • Grafana: http://localhost:3000"
    echo "  • Prometheus: http://localhost:9090"
    echo "  • Trading Bot: Check logs with 'docker logs autonomous-trading-bot'"
    echo
    echo "🛡️ Demo Mode Features:"
    echo "  • ✅ Safe paper trading only"
    echo "  • ✅ Real market data"
    echo "  • ✅ Full monitoring stack"
    echo "  • ❌ No real money trades"
    echo
}

monitor_deployment() {
    log_info "Setting up monitoring..."
    
    # Wait a bit for services to stabilize
    sleep 10
    
    # Check service health
    local services=("trading-bot-1" "trading-bot-2" "trading-bot-3" "nginx" "prometheus" "grafana")
    
    for service in "${services[@]}"; do
        if docker-compose -f docker-compose.prod.yml ps | grep -q "$service.*Up"; then
            log_success "$service is running"
        else
            log_warning "$service may not be running properly"
        fi
    done
    
    # Setup log monitoring
    if command -v tail >/dev/null 2>&1; then
        log_info "To monitor logs in real-time, run:"
        echo "  docker-compose -f docker-compose.prod.yml logs -f trading-bot-1"
    fi
}

cleanup_on_exit() {
    if [[ "${1:-}" == "error" ]]; then
        log_error "Deployment failed, cleaning up..."
        docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    fi
}

main() {
    trap 'cleanup_on_exit error' ERR
    
    show_banner
    check_requirements
    configure_environment
    choose_deployment_mode
    
    case $DEPLOYMENT_MODE in
        "docker")
            deploy_docker_compose
            monitor_deployment
            ;;
        "kubernetes")
            deploy_kubernetes
            ;;
        "demo")
            deploy_demo_mode
            ;;
    esac
    
    echo
    log_success "🚀 Production deployment completed!"
    echo
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
