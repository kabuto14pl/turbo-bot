#!/bin/bash

# 🔍 TURBO TRADING BOT - ENHANCED FLAGGING VALIDATION SYSTEM
# Fixed security violation detection logic

echo "🔍 TURBO TRADING BOT - ENHANCED FLAGGING VALIDATION SYSTEM"
echo "========================================================="
echo ""

# Initialize counters
total_files=0
flagged_files=0
production_count=0
development_count=0
testing_count=0
shared_count=0
violations=0

# Arrays to store files
declare -a unflagged_files
declare -a violation_files
declare -a production_files

validate_file_security() {
    local file="$1"
    
    # Skip if file doesn't exist or is not readable
    [[ ! -f "$file" || ! -r "$file" ]] && return 0
    
    # Get file flag
    local flag=$(grep -o '\[PRODUCTION-[A-Z]*\|DEVELOPMENT-[A-Z]*\|TESTING-[A-Z]*\|BACKTEST-[A-Z]*\|SHARED-[A-Z]*\]' "$file" 2>/dev/null | head -1)
    
    # Skip non-flagged files (handled elsewhere)
    [[ -z "$flag" ]] && return 0
    
    # Enhanced logic: Only flag as violation if:
    # 1. File is flagged as TESTING but contains PRODUCTION imports AND
    # 2. File is NOT in a __tests__, test, tests, or spec directory AND  
    # 3. File is NOT a .test. or .spec. file
    if [[ "$flag" =~ TESTING ]] && grep -q "import.*production" "$file" 2>/dev/null; then
        # Allow production imports in test directories and test files
        if [[ ! "$file" =~ (__tests__|/tests?/|\.test\.|\.spec\.|test_) ]]; then
            return 1  # Security violation
        fi
    fi
    
    return 0  # No violation
}

echo "📊 SCANNING PROJECT FILES..."
echo ""

# Scan TypeScript and JavaScript files
echo "🔍 Scanning .ts and .js files..."
while IFS= read -r -d '' file; do
    ((total_files++))
    
    # Check if file has proper flag
    if grep -q '\[PRODUCTION-[A-Z]*\|DEVELOPMENT-[A-Z]*\|TESTING-[A-Z]*\|BACKTEST-[A-Z]*\|SHARED-[A-Z]*\]' "$file" 2>/dev/null; then
        ((flagged_files++))
        
        # Count by category
        if grep -q '\[PRODUCTION-' "$file" 2>/dev/null; then
            ((production_count++))
            production_files+=("$file")
        elif grep -q '\[DEVELOPMENT-' "$file" 2>/dev/null; then
            ((development_count++))
        elif grep -q '\[TESTING-' "$file" 2>/dev/null; then
            ((testing_count++))
        elif grep -q '\[SHARED-' "$file" 2>/dev/null; then
            ((shared_count++))
        fi
        
        # Enhanced security validation
        if ! validate_file_security "$file"; then
            ((violations++))
            violation_files+=("$file")
        fi
    else
        unflagged_files+=("$file")
    fi
    
done < <(find . -type f \( -name "*.ts" -o -name "*.js" \) ! -path "./node_modules/*" ! -path "./.git/*" -print0)

# Scan shell scripts
echo "🔍 Scanning .sh files..."
while IFS= read -r -d '' file; do
    ((total_files++))
    
    if grep -q '\[PRODUCTION-[A-Z]*\|DEVELOPMENT-[A-Z]*\|TESTING-[A-Z]*\|BACKTEST-[A-Z]*\|SHARED-[A-Z]*\]' "$file" 2>/dev/null; then
        ((flagged_files++))
        
        if grep -q '\[PRODUCTION-' "$file" 2>/dev/null; then
            ((production_count++))
            production_files+=("$file")
        elif grep -q '\[DEVELOPMENT-' "$file" 2>/dev/null; then
            ((development_count++))
        elif grep -q '\[TESTING-' "$file" 2>/dev/null; then
            ((testing_count++))
        elif grep -q '\[SHARED-' "$file" 2>/dev/null; then
            ((shared_count++))
        fi
    else
        unflagged_files+=("$file")
    fi
    
done < <(find . -type f -name "*.sh" ! -path "./node_modules/*" ! -path "./.git/*" -print0)

# Scan configuration files
echo "🔍 Scanning configuration files..."
while IFS= read -r -d '' file; do
    ((total_files++))
    
    if grep -q '\[PRODUCTION-[A-Z]*\|DEVELOPMENT-[A-Z]*\|TESTING-[A-Z]*\|BACKTEST-[A-Z]*\|SHARED-[A-Z]*\]' "$file" 2>/dev/null; then
        ((flagged_files++))
        
        if grep -q '\[SHARED-' "$file" 2>/dev/null; then
            ((shared_count++))
        fi
    else
        unflagged_files+=("$file")
    fi
    
done < <(find . -type f \( -name "*.json" -o -name "*.yml" -o -name "*.yaml" -o -name "*.env*" -o -name ".eslintrc*" -o -name ".prettierrc*" -o -name "Dockerfile*" -o -name ".dockerignore*" -o -name ".gitignore*" \) ! -path "./node_modules/*" ! -path "./.git/*" -print0)

echo ""
echo "📈 FLAGGING COMPLIANCE REPORT"
echo "============================="
echo ""

# Calculate compliance rate
compliance_rate=0
if (( total_files > 0 )); then
    compliance_rate=$(( (flagged_files * 100) / total_files ))
fi

echo "📊 STATISTICS:"
echo "Total Files Scanned: $total_files"
echo "Flagged Files: $flagged_files"
echo "Unflagged Files: ${#unflagged_files[@]}"
echo ""
echo "📋 BY CATEGORY:"
echo "🚀 Production Components: $production_count"
echo "🔄 Development Components: $development_count"
echo "🧪 Testing Components: $testing_count"
echo "🔧 Shared Infrastructure: $shared_count"
echo ""
echo "📈 COMPLIANCE RATE: ${compliance_rate}%"
echo ""

# Enhanced security violations report
if (( violations > 0 )); then
    echo "🚨 SECURITY VIOLATIONS DETECTED: $violations"
    echo "================================="
    for violation in "${violation_files[@]}"; do
        echo "❌ $violation: Invalid production imports in testing component"
    done
    echo ""
fi

# Show unflagged files (limited)
if (( ${#unflagged_files[@]} > 0 )); then
    echo "⚠️  UNFLAGGED FILES (First 20):"
    echo "==============================="
    
    count=0
    for file in "${unflagged_files[@]}"; do
        if (( count >= 20 )); then
            echo "... and $((${#unflagged_files[@]} - 20)) more files"
            break
        fi
        echo "📄 $file"
        ((count++))
    done
    echo ""
fi

# Show production components (limited)
if (( production_count > 0 )); then
    echo "🚀 PRODUCTION COMPONENTS (First 10):"
    echo "==================================="
    
    count=0
    for file in "${production_files[@]}"; do
        if (( count >= 10 )); then
            echo "... and $((production_count - 10)) more production components"
            break
        fi
        echo "🚀 $file"
        ((count++))
    done
    echo ""
fi

# Final assessment
echo "🎯 FINAL ASSESSMENT"
echo "================="

if (( violations > 0 )); then
    echo "❌ CRITICAL: Security violations detected - deployment blocked"
elif (( compliance_rate >= 95 )); then
    echo "✅ EXCELLENT: 95%+ compliance achieved - ready for enterprise deployment!"
elif (( compliance_rate >= 90 )); then
    echo "✅ GOOD: 90%+ compliance achieved - production ready with minor improvements needed"
elif (( compliance_rate >= 80 )); then
    echo "⚠️  WARNING: 80%+ compliance - additional flagging required before production"
else
    echo "❌ INSUFFICIENT: <80% compliance - major flagging work required"
fi

echo "📋 Final validation completed - check results above."

# Exit codes for automation
if (( violations > 0 )); then
    exit 2  # Security violations
elif (( compliance_rate < 80 )); then
    exit 1  # Insufficient compliance
else
    exit 0  # Success
fi