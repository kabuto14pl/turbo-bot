const fs = require('fs');
const FILE = '/root/turbo-bot/trading-bot/src/core/ai/megatron_system.js';
let h = fs.readFileSync(FILE, 'utf8');

let ok = 0, fail = 0;

function step(name, old, nw) {
    // Handle both \r\n and \n
    const old1 = old;
    const old2 = old.replace(/\n/g, '\r\n');
    if (h.includes(old1)) {
        h = h.replace(old1, nw);
        ok++; console.log('[OK] ' + name);
    } else if (h.includes(old2)) {
        h = h.replace(old2, nw.replace(/\n/g, '\r\n'));
        ok++; console.log('[OK] ' + name + ' (CRLF)');
    } else {
        fail++; console.log('[FAIL] ' + name);
    }
}

// STEP 1: Header
step('Header',
    'Supports: OpenAI GPT-4o, Anthropic Claude, xAI Grok, Ollama',
    'Supports: GitHub Models, OpenAI GPT-4o, Anthropic Claude, xAI Grok, Ollama'
);

// STEP 2: Add GitHub provider in configure() — insert before openaiKey block
step('GitHub provider in configure()',
    '    configure(config) {\n        if (config.openaiKey) {',
    '    configure(config) {\n        if (config.githubToken) {\n            this.providers.set(\'github\', {\n                url: \'https://models.inference.ai.github.com/chat/completions\',\n                model: config.githubModel || \'gpt-4o\',\n                headers: { \'Authorization\': \'Bearer \' + config.githubToken, \'Content-Type\': \'application/json\' },\n                format: \'openai\',\n            });\n        }\n        if (config.openaiKey) {'
);

// STEP 3: Add GITHUB_TOKEN to initialize() env vars
step('GITHUB_TOKEN in initialize()',
    '        this.llm.configure({\n            openaiKey: process.env.OPENAI_API_KEY,\n            openaiModel: process.env.OPENAI_MODEL',
    '        this.llm.configure({\n            githubToken: process.env.GITHUB_TOKEN,\n            githubModel: process.env.GITHUB_MODEL || \'gpt-4o\',\n            openaiKey: process.env.OPENAI_API_KEY,\n            openaiModel: process.env.OPENAI_MODEL'
);

fs.writeFileSync(FILE, h);
console.log('\nResult: ' + ok + ' OK, ' + fail + ' FAIL');
console.log('Lines: ' + h.split('\n').length);
