#!/bin/bash
# 🚀 [PRODUCTION-OPERATIONAL]
# Production operational script

# 🚀 [PRODUCTION-OPERATIONAL]
# CI/CD FLAGGING INTEGRATION SCRIPT
# Pre-deployment validation to ensure flagging compliance and prevent production violations
# 
# Production-ready CI/CD integration for automated flagging validation in build pipeline
# Blocks deployment of unflagged or incorrectly categorized components

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 CI/CD FLAGGING VALIDATION PIPELINE${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Environment detection
ENVIRONMENT=${NODE_ENV:-"development"}
DEPLOYMENT_TARGET=${DEPLOYMENT_TARGET:-"staging"}
BUILD_NUMBER=${BUILD_NUMBER:-"local"}

echo -e "${YELLOW}🔧 Environment: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}🎯 Deployment Target: ${DEPLOYMENT_TARGET}${NC}"
echo -e "${YELLOW}📦 Build Number: ${BUILD_NUMBER}${NC}"
echo ""

# Function to validate production deployment
validate_production_deployment() {
    echo -e "${CYAN}🔍 VALIDATING PRODUCTION DEPLOYMENT...${NC}"
    
    # Check if any DEVELOPMENT-VERSION or TESTING-FRAMEWORK files are in production build
    local dev_files=$(find dist/ -type f -name "*.js" -exec grep -l "DEVELOPMENT-VERSION\|TESTING-FRAMEWORK" {} \; 2>/dev/null || true)
    
    if [[ -n "$dev_files" ]]; then
        echo -e "${RED}❌ CRITICAL: Development/Testing components found in production build:${NC}"
        echo "$dev_files"
        return 1
    fi
    
    # Check for backtest components in production
    local backtest_files=$(find dist/ -type f -name "*.js" -exec grep -l "BACKTEST-ONLY" {} \; 2>/dev/null || true)
    
    if [[ -n "$backtest_files" ]]; then
        echo -e "${RED}❌ CRITICAL: Backtest-only components found in production build:${NC}"
        echo "$backtest_files"
        return 1
    fi
    
    echo -e "${GREEN}✅ Production build validation passed${NC}"
    return 0
}

# Function to validate environment consistency
validate_environment_consistency() {
    echo -e "${CYAN}🔍 VALIDATING ENVIRONMENT CONSISTENCY...${NC}"
    
    local violations=0
    
    # Check for live trading enabled in non-production environment
    if [[ "$ENVIRONMENT" != "production" ]]; then
        local live_trading_files=$(grep -r "enableLiveTrading.*true" . --include="*.ts" --include="*.js" 2>/dev/null || true)
        if [[ -n "$live_trading_files" ]]; then
            echo -e "${YELLOW}⚠️  WARNING: Live trading enabled in non-production environment${NC}"
            echo "$live_trading_files"
            ((violations++))
        fi
    fi
    
    # Check for production API keys in development files
    local dev_with_prod_keys=$(grep -r "PRODUCTION.*API" . --include="*.ts" --include="*.js" | grep -v "PRODUCTION-" | head -5 || true)
    if [[ -n "$dev_with_prod_keys" ]]; then
        echo -e "${YELLOW}⚠️  WARNING: Production API references in development code${NC}"
        echo "$dev_with_prod_keys"
        ((violations++))
    fi
    
    if [[ $violations -eq 0 ]]; then
        echo -e "${GREEN}✅ Environment consistency validation passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Environment consistency validation completed with $violations warnings${NC}"
    fi
    
    return 0
}

# Function to check required production components
validate_required_components() {
    echo -e "${CYAN}🔍 VALIDATING REQUIRED PRODUCTION COMPONENTS...${NC}"
    
    local missing_components=()
    
    # Check for main production components
    if [[ ! -f "trading-bot/autonomous_trading_bot_final.ts" ]]; then
        missing_components+=("Main production bot")
    fi
    
    if [[ ! -f "main_enterprise.ts" ]]; then
        missing_components+=("Enterprise API server")
    fi
    
    if [[ ! -f "package.json" ]]; then
        missing_components+=("Package configuration")
    fi
    
    # Check for production configurations
    if [[ ! -f "trading-bot/config/environments/production.config.ts" ]]; then
        missing_components+=("Production configuration")
    fi
    
    if [[ ${#missing_components[@]} -gt 0 ]]; then
        echo -e "${RED}❌ CRITICAL: Missing required production components:${NC}"
        for component in "${missing_components[@]}"; do
            echo -e "${RED}   - $component${NC}"
        done
        return 1
    fi
    
    echo -e "${GREEN}✅ All required production components present${NC}"
    return 0
}

# Function to validate security compliance
validate_security_compliance() {
    echo -e "${CYAN}🔍 VALIDATING SECURITY COMPLIANCE...${NC}"
    
    local security_violations=0
    
    # Check for hardcoded secrets
    local hardcoded_secrets=$(grep -r -i "api_key.*=" . --include="*.ts" --include="*.js" | grep -v "process.env" | grep -v "test" | head -5 || true)
    if [[ -n "$hardcoded_secrets" ]]; then
        echo -e "${RED}❌ SECURITY: Potential hardcoded API keys found${NC}"
        echo "$hardcoded_secrets"
        ((security_violations++))
    fi
    
    # Check for console.log in production code
    if [[ "$DEPLOYMENT_TARGET" == "production" ]]; then
        local console_logs=$(find . -name "*.ts" -o -name "*.js" | grep -v node_modules | grep -v test | xargs grep -l "console.log" | head -5 || true)
        if [[ -n "$console_logs" ]]; then
            echo -e "${YELLOW}⚠️  WARNING: console.log statements found in production code${NC}"
            echo "$console_logs"
        fi
    fi
    
    if [[ $security_violations -gt 0 ]]; then
        echo -e "${RED}❌ CRITICAL: Security violations detected${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Security compliance validation passed${NC}"
    return 0
}

# Main validation pipeline
main() {
    echo -e "${BLUE}🚀 STARTING CI/CD FLAGGING VALIDATION PIPELINE${NC}"
    echo ""
    
    # Run flagging validation script
    echo -e "${CYAN}🔍 Running comprehensive flagging validation...${NC}"
    if ! ./scripts/validate-flagging.sh; then
        echo -e "${RED}❌ Flagging validation failed${NC}"
        exit 1
    fi
    echo ""
    
    # Validate required components
    if ! validate_required_components; then
        echo -e "${RED}❌ Required components validation failed${NC}"
        exit 1
    fi
    echo ""
    
    # Validate security compliance
    if ! validate_security_compliance; then
        echo -e "${RED}❌ Security compliance validation failed${NC}"
        exit 1
    fi
    echo ""
    
    # Validate environment consistency
    if ! validate_environment_consistency; then
        echo -e "${RED}❌ Environment consistency validation failed${NC}"
        exit 1
    fi
    echo ""
    
    # Production-specific validations
    if [[ "$DEPLOYMENT_TARGET" == "production" ]]; then
        echo -e "${YELLOW}🚀 Running production-specific validations...${NC}"
        
        if ! validate_production_deployment; then
            echo -e "${RED}❌ Production deployment validation failed${NC}"
            exit 1
        fi
        echo ""
        
        # Additional production checks
        echo -e "${CYAN}🔍 Checking production readiness...${NC}"
        
        # Ensure build exists
        if [[ ! -d "dist" ]]; then
            echo -e "${RED}❌ Production build directory not found${NC}"
            exit 1
        fi
        
        # Check for production environment variables
        if [[ -z "$NODE_ENV" ]] || [[ "$NODE_ENV" != "production" ]]; then
            echo -e "${YELLOW}⚠️  WARNING: NODE_ENV not set to production${NC}"
        fi
        
        echo -e "${GREEN}✅ Production readiness check passed${NC}"
    fi
    
    # Final summary
    echo -e "${GREEN}🎉 CI/CD FLAGGING VALIDATION PIPELINE COMPLETED SUCCESSFULLY${NC}"
    echo -e "${GREEN}============================================================${NC}"
    echo -e "${GREEN}✅ All flagging validations passed${NC}"
    echo -e "${GREEN}✅ Security compliance verified${NC}"
    echo -e "${GREEN}✅ Environment consistency validated${NC}"
    echo -e "${GREEN}✅ Required components present${NC}"
    
    if [[ "$DEPLOYMENT_TARGET" == "production" ]]; then
        echo -e "${GREEN}✅ Production deployment approved${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}🚀 DEPLOYMENT APPROVED FOR: ${DEPLOYMENT_TARGET}${NC}"
    
    return 0
}

# Error handling
trap 'echo -e "${RED}❌ CI/CD validation pipeline failed${NC}"; exit 1' ERR

# Run main pipeline
main "$@"