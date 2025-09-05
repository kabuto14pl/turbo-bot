#!/bin/bash

echo "🔧 Making scripts executable..."
find . -name "*.sh" -type f -exec chmod +x {} \;

echo "✅ All scripts are now executable"
echo "🚀 You can now run: npm run dev"
