#!/bin/bash

echo "🔍 PROFESSIONAL DASHBOARD DIAGNOSTICS - JavaScript Console Test"
echo "==============================================================="

echo "📊 Testing JavaScript errors in browser..."
echo ""

# Create a simple HTML test file to check JavaScript execution
cat > /tmp/test_dashboard.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Dashboard Test</title>
    <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
</head>
<body>
    <div id="test-results"></div>
    <canvas id="test-chart" width="400" height="200"></canvas>
    
    <script>
        console.log("🧪 Starting dashboard diagnostics...");
        
        const results = {
            socketIo: typeof io !== 'undefined',
            chartJs: typeof Chart !== 'undefined',
            testCanvas: document.getElementById('test-chart') !== null,
            canvasContext: null
        };
        
        try {
            const canvas = document.getElementById('test-chart');
            results.canvasContext = canvas.getContext('2d') !== null;
        } catch (e) {
            results.canvasContext = false;
            console.error("Canvas context error:", e);
        }
        
        console.log("📋 Diagnostic Results:", results);
        
        const div = document.getElementById('test-results');
        div.innerHTML = `
            <h2>🔍 Dashboard JavaScript Diagnostics</h2>
            <ul>
                <li>Socket.IO: ${results.socketIo ? '✅ Available' : '❌ Missing'}</li>
                <li>Chart.js: ${results.chartJs ? '✅ Available' : '❌ Missing'}</li>
                <li>Canvas Element: ${results.testCanvas ? '✅ Found' : '❌ Missing'}</li>
                <li>Canvas Context: ${results.canvasContext ? '✅ Working' : '❌ Failed'}</li>
            </ul>
        `;
        
        // Test Chart.js initialization
        if (results.chartJs && results.canvasContext) {
            try {
                const ctx = document.getElementById('test-chart').getContext('2d');
                const testChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Test1', 'Test2', 'Test3'],
                        datasets: [{
                            label: 'Test Data',
                            data: [10, 20, 30],
                            borderColor: 'red'
                        }]
                    }
                });
                console.log("✅ Chart.js test successful");
                div.innerHTML += "<p>✅ Chart.js initialization test: SUCCESS</p>";
            } catch (e) {
                console.error("❌ Chart.js test failed:", e);
                div.innerHTML += `<p>❌ Chart.js initialization test: FAILED - ${e.message}</p>`;
            }
        }
        
        // Test DOM queries for dashboard elements
        const dashboardElements = {
            'main-chart': document.getElementById('main-chart'),
            'macd-chart': document.getElementById('macd-chart'),
            'chart-resize-handle': document.getElementById('chart-resize-handle'),
            'chart-resize-handle-vertical': document.getElementById('chart-resize-handle-vertical')
        };
        
        div.innerHTML += "<h3>🎯 Dashboard Elements Check</h3><ul>";
        Object.keys(dashboardElements).forEach(id => {
            const exists = dashboardElements[id] !== null;
            div.innerHTML += `<li>${id}: ${exists ? '✅ Found' : '❌ Missing'}</li>`;
            console.log(`Element ${id}:`, exists ? 'Found' : 'Missing');
        });
        div.innerHTML += "</ul>";
        
    </script>
</body>
</html>
EOF

echo "📋 Test file created at /tmp/test_dashboard.html"
echo "🌐 Testing libraries availability..."

# Test if Chart.js loads properly
curl -s "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js" | head -5 | grep -q "Chart" && echo "✅ Chart.js CDN accessible" || echo "❌ Chart.js CDN failed"

# Test if Socket.io loads properly  
curl -s "https://cdn.socket.io/4.7.2/socket.io.min.js" | head -5 | grep -q "socket" && echo "✅ Socket.IO CDN accessible" || echo "❌ Socket.IO CDN failed"

echo ""
echo "🔧 Checking for common JavaScript errors in dashboard..."

# Check for syntax errors in the dashboard file
echo "📝 Syntax validation:"
node -c /workspaces/turbo-bot/src/professional_trading_dashboard.ts 2>/dev/null && echo "✅ No Node.js syntax errors" || echo "❌ Syntax errors detected"

echo ""
echo "🎯 Next steps:"
echo "1. Open dashboard in browser: http://localhost:3002"
echo "2. Open browser console (F12)"
echo "3. Look for red error messages"
echo "4. Check if elements exist with: document.getElementById('main-chart')"

echo ""
echo "==============================================================="
echo "🔍 Diagnostics completed. Check browser console for details."