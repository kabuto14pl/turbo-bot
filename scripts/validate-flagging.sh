#!/bin/bash
# 🚀 [PRODUCTION-OPERATIONAL]
# Production operational script

# 🚀 [PRODUCTION-OPERATIONAL]
# FLAGGING VALIDATION SCRIPT
# Automated validation of code classification compliance and separation enforcement
# 
# Production-ready validation script for ensuring flagging standards compliance
# Prevents deployment of unflagged or incorrectly categorized components

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 TURBO TRADING BOT - FLAGGING VALIDATION SYSTEM${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# Define flag patterns
PRODUCTION_FLAGS=("PRODUCTION-FINAL" "PRODUCTION-API" "PRODUCTION-CONFIG" "PRODUCTION-OPERATIONAL")
DEVELOPMENT_FLAGS=("DEVELOPMENT-VERSION" "DEVELOPMENT-TOOL")
TESTING_FLAGS=("TESTING-FRAMEWORK" "BACKTEST-ONLY")
SHARED_FLAGS=("SHARED-INFRASTRUCTURE")

# Counters
TOTAL_FILES=0
FLAGGED_FILES=0
UNFLAGGED_FILES=0
PRODUCTION_FILES=0
DEVELOPMENT_FILES=0
TESTING_FILES=0
SHARED_FILES=0
VIOLATIONS=0

# Arrays to store results
UNFLAGGED_LIST=()
VIOLATION_LIST=()
PRODUCTION_LIST=()
DEVELOPMENT_LIST=()
TESTING_LIST=()

echo -e "${CYAN}📊 SCANNING PROJECT FILES...${NC}"
echo ""

# Function to check if file has proper flag
check_file_flag() {
    local file="$1"
    local filename=$(basename "$file")
    
    # Skip certain files
    if [[ "$filename" == "package-lock.json" ]] || 
       [[ "$filename" == "node_modules" ]] ||
       [[ "$filename" =~ \.min\. ]] ||
       [[ "$filename" =~ \.d\.ts$ ]] ||
       [[ "$file" =~ /node_modules/ ]] ||
       [[ "$file" =~ /dist/ ]] ||
       [[ "$file" =~ /.git/ ]]; then
        return
    fi
    
    ((TOTAL_FILES++))
    
    # Check first 15 lines for flags
    local content=""
    if [[ -f "$file" ]]; then
        content=$(head -n 15 "$file" 2>/dev/null || echo "")
    fi
    
    local has_flag=false
    local flag_type=""
    
    # Check for production flags
    for flag in "${PRODUCTION_FLAGS[@]}"; do
        if echo "$content" | grep -q "\[$flag\]"; then
            has_flag=true
            flag_type="PRODUCTION"
            ((PRODUCTION_FILES++))
            PRODUCTION_LIST+=("$file [$flag]")
            break
        fi
    done
    
    # Check for development flags
    if [[ "$has_flag" == false ]]; then
        for flag in "${DEVELOPMENT_FLAGS[@]}"; do
            if echo "$content" | grep -q "\[$flag\]"; then
                has_flag=true
                flag_type="DEVELOPMENT"
                ((DEVELOPMENT_FILES++))
                DEVELOPMENT_LIST+=("$file [$flag]")
                break
            fi
        done
    fi
    
    # Check for testing flags
    if [[ "$has_flag" == false ]]; then
        for flag in "${TESTING_FLAGS[@]}"; do
            if echo "$content" | grep -q "\[$flag\]"; then
                has_flag=true
                flag_type="TESTING"
                ((TESTING_FILES++))
                TESTING_LIST+=("$file [$flag]")
                break
            fi
        done
    fi
    
    # Check for shared flags
    if [[ "$has_flag" == false ]]; then
        for flag in "${SHARED_FLAGS[@]}"; do
            if echo "$content" | grep -q "\[$flag\]"; then
                has_flag=true
                flag_type="SHARED"
                ((SHARED_FILES++))
                break
            fi
        done
    fi
    
    if [[ "$has_flag" == true ]]; then
        ((FLAGGED_FILES++))
    else
        ((UNFLAGGED_FILES++))
        UNFLAGGED_LIST+=("$file")
    fi
}

# Function to check for violations
check_violations() {
    local file="$1"
    
    if [[ ! -f "$file" ]]; then
        return
    fi
    
    local content=$(cat "$file" 2>/dev/null || echo "")
    
    # Check for dangerous patterns in non-production files
    if echo "$content" | grep -q "enableLiveTrading.*true" && 
       ! echo "$content" | head -n 15 | grep -q "PRODUCTION-"; then
        VIOLATION_LIST+=("$file: Live trading enabled in non-production component")
        ((VIOLATIONS++))
    fi
    
    # Check for real API usage in backtest-only files
    if echo "$content" | head -n 15 | grep -q "BACKTEST-ONLY" &&
       echo "$content" | grep -q -E "(API_KEY|real.*api|live.*trading)"; then
        VIOLATION_LIST+=("$file: Real API usage in backtest-only component")
        ((VIOLATIONS++))
    fi
    
    # Check for production imports in testing files
    if echo "$content" | head -n 15 | grep -q "TESTING-FRAMEWORK" &&
       echo "$content" | grep -q -E "production.*config|live.*trading"; then
        VIOLATION_LIST+=("$file: Production imports in testing component")
        ((VIOLATIONS++))
    fi
}

# Scan TypeScript and JavaScript files
echo -e "${YELLOW}🔍 Scanning .ts and .js files...${NC}"
while IFS= read -r -d '' file; do
    check_file_flag "$file"
    check_violations "$file"
done < <(find . -type f \( -name "*.ts" -o -name "*.js" \) -not -path "./node_modules/*" -not -path "./dist/*" -print0)

# Scan shell scripts
echo -e "${YELLOW}🔍 Scanning .sh files...${NC}"
while IFS= read -r -d '' file; do
    check_file_flag "$file"
    check_violations "$file"
done < <(find . -type f -name "*.sh" -not -path "./node_modules/*" -print0)

# Scan config files
echo -e "${YELLOW}🔍 Scanning configuration files...${NC}"
while IFS= read -r -d '' file; do
    check_file_flag "$file"
done < <(find . -type f \( -name "*.json" -o -name "*.yaml" -o -name "*.yml" \) -not -path "./node_modules/*" -not -path "./dist/*" -print0)

echo ""
echo -e "${BLUE}📈 FLAGGING COMPLIANCE REPORT${NC}"
echo -e "${BLUE}============================${NC}"
echo ""

# Statistics
echo -e "${CYAN}📊 STATISTICS:${NC}"
echo -e "Total Files Scanned: ${TOTAL_FILES}"
echo -e "Flagged Files: ${GREEN}${FLAGGED_FILES}${NC}"
echo -e "Unflagged Files: ${RED}${UNFLAGGED_FILES}${NC}"
echo ""

echo -e "${CYAN}📋 BY CATEGORY:${NC}"
echo -e "🚀 Production Components: ${GREEN}${PRODUCTION_FILES}${NC}"
echo -e "🔄 Development Components: ${YELLOW}${DEVELOPMENT_FILES}${NC}"
echo -e "🧪 Testing Components: ${PURPLE}${TESTING_FILES}${NC}"
echo -e "🔧 Shared Infrastructure: ${CYAN}${SHARED_FILES}${NC}"
echo ""

# Calculate compliance percentage
if [[ $TOTAL_FILES -gt 0 ]]; then
    COMPLIANCE_PERCENT=$((FLAGGED_FILES * 100 / TOTAL_FILES))
    echo -e "${CYAN}📈 COMPLIANCE RATE: ${GREEN}${COMPLIANCE_PERCENT}%${NC}"
else
    echo -e "${CYAN}📈 COMPLIANCE RATE: ${RED}0%${NC}"
fi

echo ""

# Security violations
if [[ $VIOLATIONS -gt 0 ]]; then
    echo -e "${RED}🚨 SECURITY VIOLATIONS DETECTED: ${VIOLATIONS}${NC}"
    echo -e "${RED}================================${NC}"
    for violation in "${VIOLATION_LIST[@]}"; do
        echo -e "${RED}❌ $violation${NC}"
    done
    echo ""
else
    echo -e "${GREEN}✅ NO SECURITY VIOLATIONS DETECTED${NC}"
    echo ""
fi

# Unflagged files (show only first 20 to avoid spam)
if [[ ${#UNFLAGGED_LIST[@]} -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  UNFLAGGED FILES (First 20):${NC}"
    echo -e "${YELLOW}==============================${NC}"
    local count=0
    for file in "${UNFLAGGED_LIST[@]}"; do
        if [[ $count -lt 20 ]]; then
            echo -e "${YELLOW}📄 $file${NC}"
            ((count++))
        fi
    done
    if [[ ${#UNFLAGGED_LIST[@]} -gt 20 ]]; then
        local remaining=$((${#UNFLAGGED_LIST[@]} - 20))
        echo -e "${YELLOW}... and $remaining more files${NC}"
    fi
    echo ""
fi

# Production components summary
if [[ ${#PRODUCTION_LIST[@]} -gt 0 ]]; then
    echo -e "${GREEN}🚀 PRODUCTION COMPONENTS (First 10):${NC}"
    echo -e "${GREEN}===================================${NC}"
    local count=0
    for file in "${PRODUCTION_LIST[@]}"; do
        if [[ $count -lt 10 ]]; then
            echo -e "${GREEN}✅ $file${NC}"
            ((count++))
        fi
    done
    if [[ ${#PRODUCTION_LIST[@]} -gt 10 ]]; then
        local remaining=$((${#PRODUCTION_LIST[@]} - 10))
        echo -e "${GREEN}... and $remaining more production components${NC}"
    fi
    echo ""
fi

# Final assessment
echo -e "${BLUE}🎯 FINAL ASSESSMENT${NC}"
echo -e "${BLUE}=================${NC}"

if [[ $COMPLIANCE_PERCENT -ge 90 && $VIOLATIONS -eq 0 ]]; then
    echo -e "${GREEN}🏆 EXCELLENT: High compliance rate with no security violations${NC}"
    exit 0
elif [[ $COMPLIANCE_PERCENT -ge 70 && $VIOLATIONS -eq 0 ]]; then
    echo -e "${YELLOW}⚠️  GOOD: Acceptable compliance rate, no security violations${NC}"
    exit 0
elif [[ $VIOLATIONS -gt 0 ]]; then
    echo -e "${RED}❌ CRITICAL: Security violations detected - deployment blocked${NC}"
    exit 1
else
    echo -e "${RED}❌ POOR: Low compliance rate - more flagging needed${NC}"
    exit 1
fi