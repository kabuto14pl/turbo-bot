#!/bin/bash
# 🚀 [PRODUCTION-OPERATIONAL]
# Production operational script

# 🚀 PRODUCTION DEPLOYMENT ORCHESTRATOR
# Complete production deployment system with zero-downtime and auto-scaling

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly APP_NAME="trading-bot"
readonly NAMESPACE="trading-production"
readonly VERSION="${VERSION:-v2.0.0}"
readonly REGISTRY="${REGISTRY:-ghcr.io/your-org}"
readonly ENVIRONMENT="${ENVIRONMENT:-production}"

# Kubernetes configuration
readonly KUBECTL_TIMEOUT="600s"
readonly ROLLOUT_TIMEOUT="300s"

# Health check configuration
readonly HEALTH_CHECK_RETRIES=5
readonly HEALTH_CHECK_DELAY=10

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" >&2
}

log_info() {
    echo -e "${CYAN}[INFO]${NC} $*" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $*" >&2
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    local missing_tools=()
    
    command -v docker >/dev/null 2>&1 || missing_tools+=("docker")
    command -v kubectl >/dev/null 2>&1 || missing_tools+=("kubectl")
    command -v helm >/dev/null 2>&1 || missing_tools+=("helm")
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_error "Please install missing tools and try again"
        exit 1
    fi
    
    # Check Kubernetes connectivity
    if ! kubectl cluster-info &>/dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        log_error "Please check your kubeconfig and cluster connectivity"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# ============================================================================
# DOCKER BUILD AND PUSH
# ============================================================================
build_and_push_image() {
    log_step "Building and pushing Docker image..."
    
    local image_tag="${REGISTRY}/${APP_NAME}:${VERSION}"
    local latest_tag="${REGISTRY}/${APP_NAME}:latest"
    
    # Build TypeScript first
    log_info "Building TypeScript..."
    npm run build || {
        log_error "TypeScript build failed"
        exit 1
    }
    
    # Build Docker image
    log_info "Building Docker image: ${image_tag}"
    docker build \
        --file Dockerfile.production.fixed \
        --tag "${image_tag}" \
        --tag "${latest_tag}" \
        --build-arg VERSION="${VERSION}" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$(git rev-parse HEAD 2>/dev/null || echo 'unknown')" \
        . || {
        log_error "Docker build failed"
        exit 1
    }
    
    # Push to registry
    log_info "Pushing images to registry..."
    docker push "${image_tag}" || {
        log_error "Failed to push ${image_tag}"
        exit 1
    }
    
    docker push "${latest_tag}" || {
        log_error "Failed to push ${latest_tag}"
        exit 1
    }
    
    log_success "Docker image built and pushed successfully"
}

# ============================================================================
# KUBERNETES DEPLOYMENT
# ============================================================================
create_namespace() {
    log_step "Creating namespace if not exists..."
    
    if kubectl get namespace "${NAMESPACE}" &>/dev/null; then
        log_info "Namespace ${NAMESPACE} already exists"
    else
        log_info "Creating namespace ${NAMESPACE}"
        kubectl create namespace "${NAMESPACE}" || {
            log_error "Failed to create namespace"
            exit 1
        }
        
        # Add labels to namespace
        kubectl label namespace "${NAMESPACE}" \
            app.kubernetes.io/name="${APP_NAME}" \
            app.kubernetes.io/instance="${APP_NAME}-${ENVIRONMENT}" \
            environment="${ENVIRONMENT}" \
            security.compliance/gdpr="enabled" || {
            log_warning "Failed to add labels to namespace"
        }
    fi
    
    log_success "Namespace ready"
}

deploy_secrets_and_configs() {
    log_step "Deploying secrets and configuration..."
    
    # Apply ConfigMaps
    log_info "Applying ConfigMaps..."
    kubectl apply -f k8s/production/configmaps.yaml || {
        log_error "Failed to apply ConfigMaps"
        exit 1
    }
    
    # Check if secrets exist
    if ! kubectl get secret trading-bot-secrets -n "${NAMESPACE}" &>/dev/null; then
        log_warning "Trading bot secrets not found. Please create them manually:"
        log_warning "kubectl apply -f k8s/production/secrets.yaml"
        log_warning "Then update the secret values for your environment"
    fi
    
    # Apply RBAC
    log_info "Applying RBAC configuration..."
    kubectl apply -f k8s/production/secrets.yaml || {
        log_error "Failed to apply RBAC configuration"
        exit 1
    }
    
    log_success "Secrets and configuration deployed"
}

deploy_services() {
    log_step "Deploying services..."
    
    kubectl apply -f k8s/production/services.yaml || {
        log_error "Failed to deploy services"
        exit 1
    }
    
    log_success "Services deployed"
}

deploy_application() {
    log_step "Deploying application..."
    
    # Update image version in deployment
    local temp_deployment="/tmp/deployment-${VERSION}.yaml"
    sed "s|image: ghcr.io/your-org/trading-bot:.*|image: ${REGISTRY}/${APP_NAME}:${VERSION}|g" \
        k8s/production/deployment.yaml > "${temp_deployment}"
    
    # Apply deployment
    kubectl apply -f "${temp_deployment}" || {
        log_error "Failed to apply deployment"
        exit 1
    }
    
    # Wait for rollout to complete
    log_info "Waiting for deployment rollout to complete..."
    kubectl rollout status deployment/trading-bot-green \
        -n "${NAMESPACE}" \
        --timeout="${ROLLOUT_TIMEOUT}" || {
        log_error "Deployment rollout failed or timed out"
        kubectl rollout undo deployment/trading-bot-green -n "${NAMESPACE}"
        exit 1
    }
    
    # Clean up temporary file
    rm -f "${temp_deployment}"
    
    log_success "Application deployed successfully"
}

# ============================================================================
# HEALTH CHECKS AND VALIDATION
# ============================================================================
health_check() {
    log_step "Performing health checks..."
    
    local service_ip
    service_ip=$(kubectl get service trading-bot-service \
        -n "${NAMESPACE}" \
        -o jsonpath='{.spec.clusterIP}')
    
    if [[ -z "${service_ip}" ]]; then
        log_error "Could not get service IP"
        return 1
    fi
    
    log_info "Service IP: ${service_ip}"
    
    # Port forward for health check
    log_info "Setting up port forward for health check..."
    kubectl port-forward service/trading-bot-service 8080:80 \
        -n "${NAMESPACE}" &>/dev/null &
    local pf_pid=$!
    
    # Wait for port forward to be ready
    sleep 5
    
    # Perform health checks
    local attempt=1
    while [[ ${attempt} -le ${HEALTH_CHECK_RETRIES} ]]; do
        log_info "Health check attempt ${attempt}/${HEALTH_CHECK_RETRIES}"
        
        if curl -f -s http://localhost:8080/health/ready &>/dev/null; then
            log_success "Health check passed"
            kill ${pf_pid} 2>/dev/null || true
            return 0
        fi
        
        log_warning "Health check failed, retrying in ${HEALTH_CHECK_DELAY}s..."
        sleep ${HEALTH_CHECK_DELAY}
        ((attempt++))
    done
    
    log_error "Health check failed after ${HEALTH_CHECK_RETRIES} attempts"
    kill ${pf_pid} 2>/dev/null || true
    return 1
}

check_autoscaling() {
    log_step "Checking auto-scaling configuration..."
    
    # Check HPA status
    local hpa_status
    hpa_status=$(kubectl get hpa trading-bot-hpa \
        -n "${NAMESPACE}" \
        -o jsonpath='{.status.conditions[0].type}' 2>/dev/null || echo "NotFound")
    
    if [[ "${hpa_status}" == "AbleToScale" ]]; then
        log_success "Auto-scaling is properly configured and active"
        
        # Show current scaling metrics
        kubectl get hpa trading-bot-hpa -n "${NAMESPACE}"
    else
        log_warning "Auto-scaling may not be properly configured"
        log_info "HPA Status: ${hpa_status}"
    fi
}

validate_deployment() {
    log_step "Validating deployment..."
    
    # Check pod status
    local ready_pods
    ready_pods=$(kubectl get pods -l app=trading-bot \
        -n "${NAMESPACE}" \
        -o jsonpath='{.items[?(@.status.phase=="Running")].metadata.name}' | wc -w)
    
    local total_pods
    total_pods=$(kubectl get pods -l app=trading-bot \
        -n "${NAMESPACE}" \
        -o jsonpath='{.items[*].metadata.name}' | wc -w)
    
    log_info "Ready pods: ${ready_pods}/${total_pods}"
    
    if [[ ${ready_pods} -eq 0 ]]; then
        log_error "No pods are ready"
        return 1
    fi
    
    # Check service endpoints
    local endpoints
    endpoints=$(kubectl get endpoints trading-bot-service \
        -n "${NAMESPACE}" \
        -o jsonpath='{.subsets[0].addresses[*].ip}' | wc -w)
    
    log_info "Service endpoints: ${endpoints}"
    
    if [[ ${endpoints} -eq 0 ]]; then
        log_error "No service endpoints available"
        return 1
    fi
    
    log_success "Deployment validation passed"
}

# ============================================================================
# MONITORING AND METRICS
# ============================================================================
setup_monitoring() {
    log_step "Setting up monitoring..."
    
    # Apply monitoring configuration
    kubectl apply -f k8s/production/monitoring.yaml || {
        log_warning "Failed to apply monitoring configuration"
        return 1
    }
    
    log_success "Monitoring setup completed"
}

show_deployment_summary() {
    log_step "Deployment Summary"
    
    echo
    echo "🚀 TRADING BOT PRODUCTION DEPLOYMENT COMPLETE!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
    echo "📦 Version: ${VERSION}"
    echo "🏷️  Registry: ${REGISTRY}/${APP_NAME}:${VERSION}"
    echo "🌐 Namespace: ${NAMESPACE}"
    echo "⏰ Deployed: $(date)"
    echo
    
    # Show pod status
    echo "🔍 Pod Status:"
    kubectl get pods -l app=trading-bot -n "${NAMESPACE}" -o wide
    echo
    
    # Show service information
    echo "🌐 Service Information:"
    kubectl get services -l app=trading-bot -n "${NAMESPACE}"
    echo
    
    # Show HPA status
    echo "📈 Auto-scaling Status:"
    kubectl get hpa -n "${NAMESPACE}" 2>/dev/null || echo "No HPA configured"
    echo
    
    # Show ingress
    echo "🌍 Ingress Information:"
    kubectl get ingress -n "${NAMESPACE}" 2>/dev/null || echo "No ingress configured"
    echo
    
    echo "✅ Deployment completed successfully!"
    echo "🔗 Access your trading bot at: https://trading-bot.yourdomain.com"
    echo "📊 Metrics available at: https://trading-bot.yourdomain.com/metrics"
    echo "🏥 Health check: https://trading-bot.yourdomain.com/health"
    echo
}

# ============================================================================
# MAIN DEPLOYMENT FUNCTION
# ============================================================================
main() {
    log "🚀 Starting production deployment of ${APP_NAME} v${VERSION}"
    
    # Pre-deployment checks
    check_prerequisites
    
    # Build and push
    build_and_push_image
    
    # Kubernetes deployment
    create_namespace
    deploy_secrets_and_configs
    deploy_services
    deploy_application
    
    # Post-deployment validation
    health_check || {
        log_error "Health check failed, rolling back..."
        kubectl rollout undo deployment/trading-bot-green -n "${NAMESPACE}"
        exit 1
    }
    
    validate_deployment || {
        log_error "Deployment validation failed"
        exit 1
    }
    
    # Optional components
    check_autoscaling
    setup_monitoring
    
    # Summary
    show_deployment_summary
    
    log_success "🎉 Production deployment completed successfully!"
}

# ============================================================================
# SCRIPT EXECUTION
# ============================================================================
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
