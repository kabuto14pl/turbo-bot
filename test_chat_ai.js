const http = require('http');

const data = JSON.stringify({ message: 'Cześć Megatron! Jak oceniasz aktualną sytuację na rynku BTC? Czy powinienem się martwić o drawdown?' });

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/megatron/chat',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
    },
    timeout: 60000,
};

console.log('[TEST] Sending AI chat question to Megatron...');
const startTime = Date.now();

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        const latency = Date.now() - startTime;
        console.log('[RESPONSE] HTTP ' + res.statusCode + ' (' + latency + 'ms)');
        try {
            const parsed = JSON.parse(body);
            console.log('[TYPE] ' + parsed.type);
            console.log('[PROVIDER] ' + (parsed.provider || 'N/A'));
            console.log('[LATENCY] ' + (parsed.latencyMs || latency) + 'ms');
            console.log('[RESPONSE TEXT]:');
            console.log(parsed.response || body);
        } catch (e) {
            console.log('[RAW]', body.substring(0, 1500));
        }
    });
});

req.on('error', (e) => console.log('[ERROR]', e.message));
req.on('timeout', () => { req.destroy(); console.log('[TIMEOUT]'); });
req.write(data);
req.end();
