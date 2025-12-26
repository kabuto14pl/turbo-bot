#!/bin/bash
# Fix SimpleMonitoringSystem import error

FILE="src/enterprise/monitoring/simple_monitoring_system.js"

if [ -f "$FILE" ]; then
    echo "🔧 Checking $FILE for import issues..."
    
    # Check if express import exists
    if grep -q "const express = require('express');" "$FILE" 2>/dev/null; then
        echo "   ✅ Import statement found"
        echo "   Recommendation: Verify express is being called correctly"
        echo "   Check line 52 for: this.app = express();"
    elif grep -q "import express from 'express';" "$FILE" 2>/dev/null; then
        echo "   ✅ ES6 import found"
    else
        echo "   ⚠️  No express import found"
    fi
    
    echo ""
    echo "   Manual review required:"
    echo "   1. Open $FILE"
    echo "   2. Check line ~52 for express initialization"
    echo "   3. Ensure: const app = express(); or this.app = express();"
    echo "   4. Verify express is imported correctly at top of file"
else
    echo "   ℹ️  File not found: $FILE"
fi
