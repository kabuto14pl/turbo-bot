const path = require('path');
require('dotenv').config({ path: path.resolve('/root/turbo-bot/.env') });

console.log('CWD:', process.cwd());
console.log('GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? 'SET (' + process.env.GITHUB_TOKEN.substring(0,10) + '...)' : 'NOT SET');
console.log('GITHUB_MODEL:', process.env.GITHUB_MODEL || 'NOT SET');

// Also check if .env exists in trading-bot subdir
const fs = require('fs');
console.log('.env in /root/turbo-bot:', fs.existsSync('/root/turbo-bot/.env'));
console.log('.env in /root/turbo-bot/trading-bot:', fs.existsSync('/root/turbo-bot/trading-bot/.env'));

// Test the dotenv without explicit path (as config.js does)
delete process.env.GITHUB_TOKEN;
require('dotenv').config(); // uses CWD
console.log('GITHUB_TOKEN (from CWD .env):', process.env.GITHUB_TOKEN ? 'SET (' + process.env.GITHUB_TOKEN.substring(0,10) + '...)' : 'NOT SET');
