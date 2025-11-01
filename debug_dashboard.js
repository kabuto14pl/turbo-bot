/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component for validation and development
 */
const express = require('express');
const app = express();

app.get('/debug', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Debug Dashboard</title>
</head>
<body>
    <h1>Debug Dashboard</h1>
    <div>
        <button onclick="showTab('test', event)">Test Tab</button>
    </div>
    
    <div id="test" style="display: block;">
        <p>Test content</p>
    </div>

    <script>
        console.log('Script loading...');
        
        function showTab(tabName, event) {
            console.log('showTab called:', tabName);
            alert('Tab: ' + tabName);
        }
        
        window.showTab = showTab;
        console.log('showTab defined globally');
        
        setTimeout(() => {
            console.log('Ready');
        }, 1000);
    </script>
</body>
</html>`);
});

app.listen(3003, () => {
    console.log('Debug server on http://localhost:3003/debug');
});