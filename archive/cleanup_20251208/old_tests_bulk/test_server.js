/**
 * 🧪 [TESTING-FRAMEWORK]
 * Testing framework component
 */
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3002;

app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test_syntax.html'));
});

app.listen(PORT, () => {
    console.log(`Test server running on http://localhost:${PORT}/test`);
});