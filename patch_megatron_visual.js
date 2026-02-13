#!/usr/bin/env node
'use strict';

/**
 * Patch: Megatron Visual Upgrade
 * 1. Replace robot icon with Decepticon SVG logo at MEGATRON header
 * 2. Increase chat messages area 240px → 360px
 * 3. Increase chat msg font slightly
 * 4. Increase activity feed 160px → 220px
 * 5. Better activity entry styling — cleaner, more readable, with type badges
 * 6. Better activity timestamp formatting
 * 7. Decepticon SVG inline as CSS mask icon
 */

const fs = require('fs');
const FILE = '/root/turbo-bot/enterprise-dashboard.html';

console.log('='.repeat(60));
console.log(' Patch: Megatron Visual Upgrade');
console.log(' Decepticon icon + Bigger Chat + Cleaner Activity');
console.log('='.repeat(60));

let h = fs.readFileSync(FILE, 'utf8');
const origLines = h.split('\n').length;
console.log(`[READ] ${origLines} lines`);

fs.writeFileSync(FILE + '.pre-visual-bak', h);
console.log('[BAK] Backup saved');

let ok = 0, fail = 0;

function step(name, oldStr, newStr) {
    if (h.includes(oldStr)) {
        h = h.replace(oldStr, newStr);
        ok++;
        console.log(`[OK] ${name}`);
        return true;
    } else {
        fail++;
        console.log(`[FAIL] ${name}`);
        return false;
    }
}

// Decepticon SVG (simplified, fits in data URI)
const decepticonSVG = `<svg class="decepticon-icon" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><path d="M50 0 L65 25 L80 15 L75 40 L100 35 L85 55 L95 65 L70 65 L75 80 L60 72 L50 120 L40 72 L25 80 L30 65 L5 65 L15 55 L0 35 L25 40 L20 15 L35 25 Z" fill="currentColor"/></svg>`;

// ============================================================
// STEP 1: Add Decepticon CSS before </style>
// ============================================================
const decepticonCSS = `
        /* ============================================ */
        /* DECEPTICON ICON + MEGATRON VISUAL UPGRADE    */
        /* ============================================ */
        .decepticon-icon {
            width: 16px;
            height: 18px;
            color: #00d4ff;
            filter: drop-shadow(0 0 4px rgba(0,212,255,0.5));
            flex-shrink: 0;
            transition: filter 0.3s, transform 0.3s;
        }
        .decepticon-icon:hover {
            filter: drop-shadow(0 0 8px rgba(0,212,255,0.8));
            transform: scale(1.15);
        }
        .decepticon-header-icon {
            width: 13px;
            height: 15px;
            color: #00d4ff;
            filter: drop-shadow(0 0 3px rgba(0,212,255,0.4));
            vertical-align: middle;
            margin-right: 2px;
        }
        /* Activity upgrade — type badge pills */
        .ai-sidebar-activity .ai-activity-entry {
            padding: 5px 8px;
            font-size: 0.62rem;
            border-left: 2px solid var(--border);
            margin-bottom: 3px;
            border-radius: 0 4px 4px 0;
            color: var(--text-secondary);
            line-height: 1.45;
            background: var(--bg-card);
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .ai-activity-type-badge {
            display: inline-block;
            padding: 1px 5px;
            border-radius: 3px;
            font-size: 0.5rem;
            font-weight: 700;
            letter-spacing: 0.4px;
            text-transform: uppercase;
            margin-right: 4px;
            vertical-align: middle;
        }
        .ai-activity-type-badge.type-signal {
            background: rgba(0,212,255,0.12);
            color: #00d4ff;
        }
        .ai-activity-type-badge.type-trade {
            background: rgba(14,203,129,0.12);
            color: var(--green);
        }
        .ai-activity-type-badge.type-risk {
            background: rgba(246,70,93,0.12);
            color: var(--red);
        }
        .ai-activity-type-badge.type-learning {
            background: rgba(168,85,247,0.12);
            color: var(--purple);
        }
        .ai-activity-type-badge.type-quantum {
            background: rgba(0,212,255,0.08);
            color: #00d4ff;
        }
        .ai-activity-type-badge.type-system {
            background: rgba(240,185,11,0.1);
            color: var(--accent);
        }
        .ai-activity-type-badge.type-command {
            background: rgba(30,128,255,0.12);
            color: var(--blue);
        }
        .ai-activity-type-badge.type-chat {
            background: rgba(168,85,247,0.1);
            color: #c084fc;
        }
        .ai-activity-time {
            font-size: 0.48rem;
            color: var(--text-third);
            font-family: 'JetBrains Mono', monospace;
        }
        .ai-activity-title {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.6rem;
        }
        .ai-activity-desc {
            color: var(--text-third);
            font-size: 0.55rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        /* Chat message upgrade — slightly bigger */
        .ai-sidebar-chat .ai-chat-msg {
            padding: 6px 8px;
            font-size: 0.72rem;
            line-height: 1.5;
            border-radius: 6px;
            margin-bottom: 5px;
            word-wrap: break-word;
        }
        .ai-sidebar-chat .ai-chat-msg strong {
            color: #00d4ff;
        }
        .ai-sidebar-chat .ai-chat-msg.ai-chat-assistant strong {
            color: var(--purple);
        }
        /* Chat input larger */
        .ai-sidebar-chat .ai-chat-input-area input {
            flex: 1; padding: 7px 10px;
            font-size: 0.74rem;
            background: var(--bg-primary);
            border: 1px solid var(--border);
            border-radius: 5px;
            color: var(--text-primary);
            font-family: inherit;
        }
        .ai-sidebar-chat .ai-chat-send-btn {
            width: 30px; height: 30px;
            font-size: 0.65rem;
        }
        .ai-sidebar-chat .ai-chat-input-area {
            padding: 6px 8px;
        }
        /* Suggestion buttons slightly bigger */
        .ai-sidebar-chat .ai-suggest-btn {
            padding: 3px 8px; font-size: 0.62rem;
        }
`;

step('Step 1: Decepticon + visual CSS',
    '    </style>',
    decepticonCSS + '\n    </style>'
);

// ============================================================
// STEP 2: Increase chat messages height 240 → 360
// ============================================================
step('Step 2: Chat height 240→360',
    `.ai-sidebar-chat .ai-chat-messages {
            max-height: 240px; min-height: 80px;`,
    `.ai-sidebar-chat .ai-chat-messages {
            max-height: 360px; min-height: 100px;`
);

// ============================================================
// STEP 3: Increase activity feed height 160 → 220
// ============================================================
step('Step 3: Activity height 160→220',
    `.ai-sidebar-activity .ai-activity-feed {
            max-height: 160px; min-height: 50px;`,
    `.ai-sidebar-activity .ai-activity-feed {
            max-height: 220px; min-height: 60px;`
);

// ============================================================
// STEP 4: Replace robot icon with Decepticon SVG in MEGATRON chat header
// ============================================================
step('Step 4: Decepticon icon in chat header',
    `<span class="ai-header-left"><i class="fas fa-robot" style="color:#00d4ff"></i> MEGATRON</span>`,
    `<span class="ai-header-left">${decepticonSVG} MEGATRON</span>`
);

// ============================================================
// STEP 5: Replace system welcome message with Decepticon branding
// ============================================================
step('Step 5: Welcome message with Decepticon',
    `<div class="ai-chat-msg ai-chat-system"><strong>MEGATRON AI</strong> — Bot brain. Type <strong>help</strong>.</div>`,
    `<div class="ai-chat-msg ai-chat-system"><strong>⬡ MEGATRON</strong> — Autonomous trading brain. Decepticon intelligence online.<br>Type <strong>help</strong> for commands, or ask me anything.</div>`
);

// ============================================================
// STEP 6: Replace header badge Decepticon reference
// ============================================================
// In the top header bar, if there's an AI Brain badge, add decepticon hint
// Already has "AI BRAIN: INIT" — let's keep it, just nice-to-have

// ============================================================
// STEP 7: Upgrade addAIActivity JS function for better formatting
// ============================================================
// Find the addAIActivity function and upgrade it to render type badges
const oldAddActivity = `function addAIActivity(entry) {
    const feed = document.getElementById('aiActivityFeed');
    if (!feed) return;
    // Remove empty placeholder
    const empty = feed.querySelector('.ai-activity-empty');
    if (empty) empty.remove();

    const div = document.createElement('div');
    div.className = 'ai-activity-entry' + (entry.importance === 'critical' ? ' importance-critical' : entry.importance === 'high' ? ' importance-high' : '');
    const time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
    div.innerHTML = '<span style="color:var(--text-third);font-size:0.5rem;">' + time + '</span> '
        + '<strong style="color:var(--text-primary);font-size:0.58rem;">' + escAI(entry.title || '') + '</strong>'
        + (entry.description ? ' <span style="color:var(--text-third);">— ' + escAI(entry.description).substring(0, 60) + '</span>' : '');`;

const newAddActivity = `function addAIActivity(entry) {
    const feed = document.getElementById('aiActivityFeed');
    if (!feed) return;
    // Remove empty placeholder
    const empty = feed.querySelector('.ai-activity-empty');
    if (empty) empty.remove();

    const div = document.createElement('div');
    div.className = 'ai-activity-entry' + (entry.importance === 'critical' ? ' importance-critical' : entry.importance === 'high' ? ' importance-high' : '');
    const time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
    const typeLower = (entry.type || 'system').toLowerCase();
    const typeBadge = '<span class="ai-activity-type-badge type-' + typeLower + '">' + escAI(entry.type || 'SYS') + '</span>';
    div.innerHTML = '<div style="display:flex;align-items:center;gap:4px;">'
        + typeBadge
        + '<span class="ai-activity-title">' + escAI(entry.title || '') + '</span>'
        + '<span class="ai-activity-time">' + time + '</span>'
        + '</div>'
        + (entry.description ? '<div class="ai-activity-desc">' + escAI(entry.description).substring(0, 80) + '</div>' : '');`;

step('Step 7: Activity entry renderer upgrade', oldAddActivity, newAddActivity);

// ============================================================
// STEP 8: Update footer Decepticon reference
// ============================================================
step('Step 8: Footer branding',
    'Turbo Bot Enterprise v6.0 + MEGATRON AI Brain',
    'Turbo Bot Enterprise v6.0 + MEGATRON ⬡ Decepticon AI'
);

// ============================================================
// FINAL
// ============================================================
fs.writeFileSync(FILE, h);
const newLines = h.split('\n').length;
console.log('');
console.log('='.repeat(60));
console.log(` RESULT: ${origLines} -> ${newLines} lines`);
console.log(` STEPS:  ${ok} OK, ${fail} FAIL`);
console.log(' Icon:     Decepticon SVG logo');
console.log(' Chat:     360px (was 240px)');
console.log(' Activity: 220px + type badges');
console.log(' Font:     Larger chat text');
console.log('='.repeat(60));
