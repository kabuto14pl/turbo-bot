#!/bin/bash
# Redis Configuration Helper

echo "🔧 Redis Configuration Helper"
echo "=============================="
echo ""
echo "Current Redis status:"

if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo "   ✅ Redis is running and responding to ping"
        
        # Show Redis info
        echo ""
        echo "Redis Information:"
        redis-cli INFO server | grep -E "redis_version|uptime_in_seconds"
        
        # Update .env
        if grep -q "^REDIS_ENABLED=false" .env; then
            echo ""
            echo "   Recommendation: Update .env to enable Redis:"
            echo "   REDIS_ENABLED=true"
        fi
    else
        echo "   ⚠️  Redis is installed but not running"
        echo ""
        echo "To start Redis:"
        echo "   redis-server --daemonize yes"
    fi
else
    echo "   ℹ️  Redis is not installed"
    echo ""
    echo "The bot will use in-memory cache (fallback mode)"
    echo ""
    echo "To install Redis (optional):"
    echo "   Ubuntu/Debian: sudo apt-get install redis-server"
    echo "   macOS: brew install redis"
    echo ""
    echo "Redis is OPTIONAL - bot works fine with in-memory cache"
fi

echo ""
echo "Current .env setting:"
if grep -q "^REDIS_ENABLED=" .env; then
    grep "^REDIS_ENABLED=" .env
else
    echo "   REDIS_ENABLED not set (defaults to false)"
fi
