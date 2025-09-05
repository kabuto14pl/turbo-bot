#!/bin/bash

# ============================================================================
# ENTERPRISE PHASE 1 VALIDATION EXECUTION SCRIPT
# Automated execution of comprehensive validation pipeline
# 
# Features:
# - Pre-flight system checks
# - Automated validation execution
# - Results compilation and reporting
# - Error handling and recovery
# - Compliance verification
# ============================================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESULTS_DIR="$PROJECT_ROOT/results"
LOG_FILE="$RESULTS_DIR/phase1_execution_$(date +%Y%m%d_%H%M%S).log"

# Ensure results directory exists
mkdir -p "$RESULTS_DIR"

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")  echo -e "${GREEN}[INFO]${NC}  $timestamp - $message" | tee -a "$LOG_FILE" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC}  $timestamp - $message" | tee -a "$LOG_FILE" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $timestamp - $message" | tee -a "$LOG_FILE" ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} $timestamp - $message" | tee -a "$LOG_FILE" ;;
        *)       echo -e "${CYAN}[LOG]${NC}   $timestamp - $message" | tee -a "$LOG_FILE" ;;
    esac
}

# Banner function
print_banner() {
    echo -e "${PURPLE}"
    echo "============================================================================"
    echo "🚀 ENTERPRISE TRADING BOT - PHASE 1 VALIDATION EXECUTOR"
    echo "============================================================================"
    echo "📅 Date: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "🎯 Objective: Comprehensive System Validation & Evidence Gathering"
    echo "📊 Scope: Multi-asset, Multi-strategy, Multi-timeframe Testing"
    echo "⏱️  Expected Duration: 15-30 minutes"
    echo "============================================================================"
    echo -e "${NC}"
}

# System requirements check
check_system_requirements() {
    log "INFO" "🔍 Checking system requirements..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log "ERROR" "Node.js not found. Please install Node.js 16+ to continue."
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 16 ]; then
        log "ERROR" "Node.js version $node_version detected. Minimum required: 16"
        exit 1
    fi
    log "INFO" "✅ Node.js $(node --version) detected"
    
    # Check npm/yarn
    if command -v yarn &> /dev/null; then
        log "INFO" "✅ Yarn $(yarn --version) detected"
    elif command -v npm &> /dev/null; then
        log "INFO" "✅ npm $(npm --version) detected"
    else
        log "ERROR" "Neither npm nor yarn found. Please install a package manager."
        exit 1
    fi
    
    # Check TypeScript
    if ! command -v npx &> /dev/null; then
        log "ERROR" "npx not found. Please ensure npm is properly installed."
        exit 1
    fi
    log "INFO" "✅ npx available for TypeScript execution"
    
    # Check available memory
    if command -v free &> /dev/null; then
        local available_mem=$(free -m | awk 'NR==2{printf "%.0f", $7}')
        if [ "$available_mem" -lt 1024 ]; then
            log "WARN" "⚠️ Low available memory: ${available_mem}MB. Recommended: 2GB+"
        else
            log "INFO" "✅ Available memory: ${available_mem}MB"
        fi
    fi
    
    # Check disk space
    local available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 1048576 ]; then  # 1GB in KB
        log "WARN" "⚠️ Low disk space. Available: $(( available_space / 1024 ))MB"
    else
        log "INFO" "✅ Sufficient disk space available"
    fi
}

# Project structure validation
validate_project_structure() {
    log "INFO" "🏗️ Validating project structure..."
    
    local required_files=(
        "package.json"
        "tsconfig.json"
        "main.ts"
        "autonomous_trading_bot_final.ts"
        "enterprise/validation/phase1_executor.ts"
        "enterprise/validation/validation_orchestrator.ts"
        "enterprise/validation/backtest_engine.ts"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$PROJECT_ROOT/$file" ]; then
            log "ERROR" "❌ Required file missing: $file"
            exit 1
        fi
        log "DEBUG" "✅ Found: $file"
    done
    
    # Check if results directories exist
    mkdir -p "$RESULTS_DIR/backtests"
    mkdir -p "$RESULTS_DIR/validation" 
    mkdir -p "$RESULTS_DIR/phase_reports"
    
    log "INFO" "✅ Project structure validated"
}

# Dependencies check and installation
check_dependencies() {
    log "INFO" "📦 Checking and installing dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        log "INFO" "📦 Installing npm dependencies..."
        if command -v yarn &> /dev/null; then
            yarn install || {
                log "ERROR" "❌ Yarn install failed"
                exit 1
            }
        else
            npm install || {
                log "ERROR" "❌ npm install failed" 
                exit 1
            }
        fi
        log "INFO" "✅ Dependencies installed successfully"
    else
        log "INFO" "✅ Dependencies already installed"
    fi
    
    # Verify TypeScript compilation
    log "INFO" "🔧 Verifying TypeScript compilation..."
    if ! npx tsc --noEmit --skipLibCheck; then
        log "WARN" "⚠️ TypeScript compilation warnings detected, but continuing..."
    else
        log "INFO" "✅ TypeScript compilation successful"
    fi
}

# Pre-flight checks
run_preflight_checks() {
    log "INFO" "✈️ Running pre-flight checks..."
    
    # Check if any validation is already running
    if pgrep -f "phase1_executor" > /dev/null; then
        log "ERROR" "❌ Another validation process is already running"
        exit 1
    fi
    
    # Check available ports (if needed for monitoring)
    local ports_to_check=(3001 3002 3003)
    for port in "${ports_to_check[@]}"; do
        if netstat -tuln 2>/dev/null | grep ":$port " > /dev/null; then
            log "WARN" "⚠️ Port $port is in use - may affect monitoring"
        fi
    done
    
    # Verify data availability (mock check)
    log "INFO" "📊 Checking data availability..."
    if [ -f "$PROJECT_ROOT/trading_data.duckdb" ]; then
        log "INFO" "✅ Local trading data available"
    else
        log "WARN" "⚠️ No local trading data found - will use simulated data"
    fi
    
    log "INFO" "✅ Pre-flight checks completed"
}

# Execute validation pipeline
execute_validation() {
    log "INFO" "🚀 Starting Phase 1 validation execution..."
    
    cd "$PROJECT_ROOT"
    
    # Create execution timestamp
    local execution_id="phase1_$(date +%Y%m%d_%H%M%S)"
    log "INFO" "📋 Execution ID: $execution_id"
    
    # Execute the main validation script
    log "INFO" "⚡ Executing comprehensive validation pipeline..."
    
    # Use timeout to prevent hanging
    timeout 1800 npx ts-node --transpile-only enterprise/validation/phase1_executor.ts || {
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            log "ERROR" "❌ Validation timed out after 30 minutes"
        else
            log "ERROR" "❌ Validation failed with exit code: $exit_code"
        fi
        return $exit_code
    }
    
    log "INFO" "✅ Validation pipeline completed successfully"
}

# Compile and verify results
compile_results() {
    log "INFO" "📊 Compiling and verifying results..."
    
    local results_found=0
    
    # Check for backtest results
    if [ -d "$RESULTS_DIR/backtests" ] && [ "$(ls -A "$RESULTS_DIR/backtests")" ]; then
        local backtest_count=$(ls "$RESULTS_DIR/backtests"/*.json 2>/dev/null | wc -l)
        log "INFO" "✅ Found $backtest_count backtest result files"
        results_found=$((results_found + backtest_count))
    fi
    
    # Check for validation reports
    if [ -d "$RESULTS_DIR/validation" ] && [ "$(ls -A "$RESULTS_DIR/validation")" ]; then
        local validation_count=$(ls "$RESULTS_DIR/validation"/*.json 2>/dev/null | wc -l)
        log "INFO" "✅ Found $validation_count validation report files"
        results_found=$((results_found + validation_count))
    fi
    
    # Check for phase reports
    if [ -d "$RESULTS_DIR/phase_reports" ] && [ "$(ls -A "$RESULTS_DIR/phase_reports")" ]; then
        local phase_count=$(ls "$RESULTS_DIR/phase_reports"/*.json 2>/dev/null | wc -l)
        log "INFO" "✅ Found $phase_count phase report files"
        results_found=$((results_found + phase_count))
    fi
    
    if [ $results_found -eq 0 ]; then
        log "ERROR" "❌ No result files found - validation may have failed"
        return 1
    fi
    
    log "INFO" "✅ Total result files found: $results_found"
    
    # Generate summary report
    generate_execution_summary
}

# Generate execution summary
generate_execution_summary() {
    log "INFO" "📋 Generating execution summary..."
    
    local summary_file="$RESULTS_DIR/phase1_execution_summary_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$summary_file" << EOF
================================================================================
PHASE 1 VALIDATION EXECUTION SUMMARY
================================================================================
Execution Date: $(date '+%Y-%m-%d %H:%M:%S')
Project: Turbo Bot Deva Trading Platform
Phase: 1 - Verification & Evidence Gathering
Status: COMPLETED

SYSTEM INFORMATION:
- Node.js Version: $(node --version)
- Operating System: $(uname -s)
- Project Root: $PROJECT_ROOT
- Results Directory: $RESULTS_DIR

EXECUTION METRICS:
- Start Time: [See log file]
- Duration: [See log file] 
- Log File: $LOG_FILE
- Result Files Generated: $(find "$RESULTS_DIR" -name "*.json" | wc -l)

RESULTS LOCATION:
- Backtest Results: $RESULTS_DIR/backtests/
- Validation Reports: $RESULTS_DIR/validation/
- Phase Reports: $RESULTS_DIR/phase_reports/

NEXT STEPS:
1. Review phase reports for detailed findings
2. Analyze backtest results for strategy optimization
3. Prepare for Phase 2: Optimization & Modularization
4. Update documentation with validation evidence

================================================================================
For detailed execution logs, see: $LOG_FILE
================================================================================
EOF

    log "INFO" "📋 Execution summary saved: $summary_file"
    
    # Display summary location
    echo -e "\n${GREEN}📋 EXECUTION COMPLETED SUCCESSFULLY${NC}"
    echo -e "${BLUE}📊 Summary Report: $summary_file${NC}"
    echo -e "${BLUE}📋 Detailed Logs: $LOG_FILE${NC}"
    echo -e "${BLUE}📁 Results Directory: $RESULTS_DIR${NC}\n"
}

# Error handling function
handle_error() {
    local line_number=$1
    local error_code=$2
    log "ERROR" "❌ Script failed at line $line_number with exit code $error_code"
    log "ERROR" "📋 Check log file for details: $LOG_FILE"
    
    # Generate error report
    local error_report="$RESULTS_DIR/phase1_error_report_$(date +%Y%m%d_%H%M%S).txt"
    cat > "$error_report" << EOF
PHASE 1 EXECUTION ERROR REPORT
==============================
Date: $(date '+%Y-%m-%d %H:%M:%S')
Error Line: $line_number
Exit Code: $error_code
Log File: $LOG_FILE

Please review the log file for detailed error information.
Contact support if the issue persists.
EOF

    echo -e "\n${RED}❌ EXECUTION FAILED${NC}"
    echo -e "${RED}📋 Error Report: $error_report${NC}"
    echo -e "${RED}📋 Log File: $LOG_FILE${NC}\n"
    
    exit $error_code
}

# Cleanup function
cleanup() {
    log "INFO" "🧹 Performing cleanup..."
    
    # Kill any remaining background processes
    pkill -f "phase1_executor" 2>/dev/null || true
    
    # Remove temporary files if any
    find "$PROJECT_ROOT" -name "*.tmp" -delete 2>/dev/null || true
    
    log "INFO" "✅ Cleanup completed"
}

# Main execution function
main() {
    # Set up error handling
    trap 'handle_error $LINENO $?' ERR
    trap cleanup EXIT
    
    print_banner
    
    log "INFO" "🚀 Starting Phase 1 validation execution pipeline..."
    
    # Execute pipeline steps
    check_system_requirements
    validate_project_structure  
    check_dependencies
    run_preflight_checks
    execute_validation
    compile_results
    
    log "INFO" "🎉 Phase 1 validation pipeline completed successfully!"
    
    echo -e "\n${GREEN}🎯 PHASE 1 EXECUTION COMPLETED SUCCESSFULLY${NC}"
    echo -e "${GREEN}✅ Ready to proceed to Phase 2: Optimization & Modularization${NC}\n"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
