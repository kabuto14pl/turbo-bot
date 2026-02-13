#!/usr/bin/env node
'use strict';

/**
 * Patch: Add GitHub Models as LLM Provider for Megatron
 * 
 * GitHub Models API:
 * - Endpoint: https://models.inference.ai.github.com/chat/completions
 * - Auth: Bearer <GITHUB_TOKEN> (PAT with models:read scope)
 * - Format: OpenAI-compatible (same as GPT-4o / Grok)
 * - Models: gpt-4o, gpt-4o-mini, o3-mini, Phi-4, etc.
 * - Free tier available for GitHub users
 */

const fs = require('fs');
const FILE = '/root/turbo-bot/trading-bot/src/core/ai/megatron_system.js';

console.log('='.repeat(60));
console.log(' Patch: GitHub Models Provider for Megatron');
console.log('='.repeat(60));

let h = fs.readFileSync(FILE, 'utf8');
const origLen = h.length;
console.log(`[READ] ${h.split('\n').length} lines`);

fs.writeFileSync(FILE + '.pre-github-bak', h);
console.log('[BAK] Backup saved');

let ok = 0, fail = 0;

function step(name, old, nw) {
    if (h.includes(old)) {
        h = h.replace(old, nw);
        ok++;
        console.log('[OK] ' + name);
        return true;
    }
    fail++;
    console.log('[FAIL] ' + name);
    return false;
}

// ============================================================
// STEP 1: Update header to include GitHub Models
// ============================================================
step('Step 1: Header update',
    ' *  Supports: OpenAI GPT-4o, Anthropic Claude, xAI Grok, Ollama',
    ' *  Supports: GitHub Models, OpenAI GPT-4o, Anthropic Claude, xAI Grok, Ollama'
);

// ============================================================
// STEP 2: Add 'github' to preferredOrder (first priority)
// ============================================================
step('Step 2: Preferred order',
    "this.preferredOrder = ['grok', 'claude', 'openai', 'ollama'];",
    "this.preferredOrder = ['github', 'grok', 'claude', 'openai', 'ollama'];"
);

// ============================================================
// STEP 3: Add GitHub Models provider in configure()
// ============================================================
const oldConfigure = `    configure(config) {
        if (config.openaiKey) {`;

const newConfigure = `    configure(config) {
        if (config.githubToken) {
            this.providers.set('github', {
                url: 'https://models.inference.ai.github.com/chat/completions',
                model: config.githubModel || 'gpt-4o',
                headers: { 'Authorization': 'Bearer ' + config.githubToken, 'Content-Type': 'application/json' },
                format: 'openai',
            });
        }
        if (config.openaiKey) {`;

step('Step 3: GitHub provider in configure()', oldConfigure, newConfigure);

// ============================================================
// STEP 4: Add GITHUB_TOKEN to initialize() env vars
// ============================================================
const oldInit = `        // Configure LLM providers from environment
        this.llm.configure({
            openaiKey: process.env.OPENAI_API_KEY,
            openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',`;

const newInit = `        // Configure LLM providers from environment
        this.llm.configure({
            githubToken: process.env.GITHUB_TOKEN,
            githubModel: process.env.GITHUB_MODEL || 'gpt-4o',
            openaiKey: process.env.OPENAI_API_KEY,
            openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',`;

step('Step 4: GITHUB_TOKEN in initialize()', oldInit, newInit);

// ============================================================
// STEP 5: Update rule-based fallback message
// ============================================================
step('Step 5a: Fallback status msg',
    "Aby uzyskać pełne odpowiedzi AI, skonfiguruj OPENAI_API_KEY, ANTHROPIC_API_KEY lub XAI_API_KEY w pliku .env.",
    "Aby uzyskać pełne odpowiedzi AI, skonfiguruj GITHUB_TOKEN (najłatwiej — GitHub PAT), OPENAI_API_KEY, ANTHROPIC_API_KEY lub XAI_API_KEY w pliku .env."
);

step('Step 5b: Fallback help msg',
    "Aby włączyć AI chat, dodaj klucze API (OpenAI/Claude/Grok) do .env na VPS.",
    "Aby włączyć AI chat, dodaj GITHUB_TOKEN (GitHub PAT) lub klucze API (OpenAI/Claude/Grok) do .env na VPS."
);

step('Step 5c: Fallback offline msg',
    "Aby włączyć pełny AI chat, dodaj do .env: OPENAI_API_KEY, ANTHROPIC_API_KEY lub XAI_API_KEY.",
    "Aby włączyć pełny AI chat, dodaj do .env: GITHUB_TOKEN (GitHub PAT), OPENAI_API_KEY, ANTHROPIC_API_KEY lub XAI_API_KEY."
);

// ============================================================
// FINAL
// ============================================================
fs.writeFileSync(FILE, h);
const newLen = h.length;
console.log('');
console.log('='.repeat(60));
console.log(` RESULT: ${origLen} -> ${newLen} bytes`);
console.log(` STEPS:  ${ok} OK, ${fail} FAIL`);
console.log(' Provider: GitHub Models (models.inference.ai.github.com)');
console.log(' Priority: github > grok > claude > openai > ollama');
console.log(' Env var:  GITHUB_TOKEN (GitHub PAT)');
console.log(' Format:   OpenAI-compatible');
console.log('='.repeat(60));
