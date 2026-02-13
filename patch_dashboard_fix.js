#!/usr/bin/env node
'use strict';

/**
 * Patch #16-FIX: Dashboard Layout Fix
 * - Reverts 3-column grid to 2-column (1fr 340px)
 * - Moves AI sections (Chat, Brain, Activity) into right sidebar
 * - Makes AI sections compact (like sys-section panels)
 * - Removes standalone AI panel div
 * - Clean Binance-style aesthetic preserved
 */

const fs = require('fs');
const FILE = '/root/turbo-bot/enterprise-dashboard.html';

console.log('='.repeat(56));
console.log(' Patch #16-FIX: Dashboard Layout Fix');
console.log(' Compact AI in Right Sidebar (Binance-style)');
console.log('='.repeat(56));

let h = fs.readFileSync(FILE, 'utf8');
const origLines = h.split('\n').length;
console.log(`[READ] ${origLines} lines`);

fs.writeFileSync(FILE + '.v6fixbak', h);
console.log('[BAK] Backup saved');

let ok = 0, fail = 0;

// ============================================================
// STEP 1: Revert grid to 2-column layout
// ============================================================
if (h.includes('1fr 300px 360px')) {
    h = h.replace('1fr 300px 360px', '1fr 340px');
    ok++; console.log('[OK] Step 1: Grid reverted to 1fr 340px');
} else {
    console.log('[SKIP] Step 1: Grid already correct');
}

// ============================================================
// STEP 2: Hide .ai-panel CSS class globally
// ============================================================
const oldPanelCSS = `.ai-panel {
            display: flex;
            flex-direction: column;
            background: var(--bg-card);
            border-left: 1px solid var(--border);
            overflow: hidden;
            grid-row: 2 / -1;
        }`;

if (h.includes(oldPanelCSS)) {
    h = h.replace(oldPanelCSS, '.ai-panel { display: none !important; }');
    ok++; console.log('[OK] Step 2: .ai-panel CSS hidden');
} else {
    console.log('[SKIP] Step 2: .ai-panel CSS not found as expected');
}

// ============================================================
// STEP 3: Fix responsive @media 1400px rule
// ============================================================
if (h.includes('.main { grid-template-columns: 1fr 300px; }')) {
    h = h.replace(
        '.main { grid-template-columns: 1fr 300px; }',
        '.main { grid-template-columns: 1fr 280px; }'
    );
    ok++; console.log('[OK] Step 3: Responsive 1400px fixed');
} else {
    console.log('[SKIP] Step 3: Responsive rule not found');
}

// ============================================================
// STEP 4: Remove old AI panel HTML block entirely
// ============================================================
const brainMarker = '<!-- AI BRAIN PANEL';
const footerMarker = '<!-- FOOTER -->';
const brainIdx = h.indexOf(brainMarker);

if (brainIdx > 0) {
    // Find the start of the comment block (the === line before AI BRAIN PANEL)
    let lineEnd = h.lastIndexOf('\n', brainIdx);
    let lineStart = h.lastIndexOf('\n', lineEnd - 1);
    // This should be the start of the first === comment line
    // Double check by looking for === in that line
    const checkLine = h.substring(lineStart, lineEnd);
    if (!checkLine.includes('===')) {
        // Try one more line back
        lineStart = h.lastIndexOf('\n', lineStart - 1);
    }
    
    // Find FOOTER marker after the panel
    const footerIdx = h.indexOf(footerMarker, brainIdx);
    if (footerIdx > 0) {
        // Find start of FOOTER line
        let footerLineStart = h.lastIndexOf('\n', footerIdx);
        if (footerLineStart < 0) footerLineStart = footerIdx;
        
        // Remove from lineStart to footerLineStart (keep FOOTER)
        h = h.substring(0, lineStart) + '\n\n' + h.substring(footerLineStart);
        ok++; console.log('[OK] Step 4: Old AI panel HTML removed');
    } else {
        fail++; console.log('[FAIL] Step 4: Footer marker not found');
    }
} else {
    console.log('[SKIP] Step 4: AI panel not found (already removed?)');
}

// ============================================================
// STEP 5: Insert compact AI sections into right sidebar
// ============================================================
const compactAIHTML = `
        <!-- MEGATRON CHAT (Compact) -->
        <div class="sys-section ai-sidebar-chat">
            <div class="ai-section-header">
                <span class="ai-header-left"><i class="fas fa-robot" style="color:#00d4ff"></i> MEGATRON</span>
                <span class="ai-chat-provider" id="aiChatProvider">offline</span>
            </div>
            <div class="ai-chat-messages" id="aiChatMessages">
                <div class="ai-chat-msg ai-chat-system"><strong>MEGATRON AI</strong> \u2014 Bot brain. Type <strong>help</strong>.</div>
            </div>
            <div class="ai-chat-typing" id="aiChatTyping">MEGATRON analyzes...</div>
            <div class="ai-chat-suggestions">
                <button class="ai-suggest-btn" data-aimsg="status">\u{1F4CB} Status</button>
                <button class="ai-suggest-btn" data-aimsg="performance">\u{1F4CA} Results</button>
                <button class="ai-suggest-btn" data-aimsg="strategie">\u2696\uFE0F Strategies</button>
                <button class="ai-suggest-btn" data-aimsg="help">\u2753 Help</button>
            </div>
            <div class="ai-chat-input-area">
                <input type="text" id="aiChatInput" placeholder="Message Megatron..." autocomplete="off">
                <button id="aiChatSend" class="ai-chat-send-btn">\u25B6</button>
            </div>
        </div>

        <!-- AI BRAIN STATUS (Compact) -->
        <div class="sys-section ai-sidebar-brain">
            <div class="ai-section-header">
                <span class="ai-header-left"><i class="fas fa-brain" style="color:#00d4ff"></i> AI BRAIN</span>
                <span class="ai-brain-phase heuristic" id="aiBrainPhaseTag">INIT</span>
            </div>
            <div class="ai-brain-grid" id="aiBrainGrid">
                <div class="ai-brain-item"><div class="ai-brain-label">Neural</div><div class="ai-brain-value" id="aiBrainNeural">--</div></div>
                <div class="ai-brain-item"><div class="ai-brain-label">Regime</div><div class="ai-brain-value" id="aiBrainRegime">--</div></div>
                <div class="ai-brain-item"><div class="ai-brain-label">ML Conf.</div><div class="ai-brain-value" id="aiBrainConf">--</div></div>
                <div class="ai-brain-item"><div class="ai-brain-label">Q-VaR</div><div class="ai-brain-value quantum" id="aiBrainVaR">--</div></div>
                <div class="ai-brain-item"><div class="ai-brain-label">Decisions</div><div class="ai-brain-value" id="aiBrainDecisions">0</div></div>
                <div class="ai-brain-item"><div class="ai-brain-label">Learn Rate</div><div class="ai-brain-value" id="aiBrainLR">--</div></div>
                <div class="ai-brain-item"><div class="ai-brain-label">Thompson</div><div class="ai-brain-value" id="aiBrainThompson">0</div></div>
                <div class="ai-brain-item"><div class="ai-brain-label">Buffer</div><div class="ai-brain-value" id="aiBrainBuffer">0</div></div>
            </div>
        </div>

        <!-- AI ACTIVITY (Compact) -->
        <div class="sys-section ai-sidebar-activity">
            <div class="ai-section-header">
                <span class="ai-header-left"><i class="fas fa-satellite-dish" style="color:#a855f7"></i> ACTIVITY</span>
                <span class="ai-activity-count" id="aiActivityCount">0</span>
            </div>
            <div class="ai-activity-filter" id="aiActivityFilterBar">
                <button class="ai-filter-btn active" data-aifilter="ALL">All</button>
                <button class="ai-filter-btn" data-aifilter="SIGNAL">Signal</button>
                <button class="ai-filter-btn" data-aifilter="TRADE">Trade</button>
                <button class="ai-filter-btn" data-aifilter="RISK">Risk</button>
            </div>
            <div class="ai-activity-feed" id="aiActivityFeed">
                <div class="ai-activity-empty"><i class="fas fa-satellite-dish"></i> Waiting...</div>
            </div>
        </div>

`;

const botStatusAnchor = '<!-- Bot Status -->';
if (h.includes(botStatusAnchor)) {
    h = h.replace(botStatusAnchor, compactAIHTML + '        ' + botStatusAnchor);
    ok++; console.log('[OK] Step 5: Compact AI inserted into sidebar');
} else {
    fail++; console.log('[FAIL] Step 5: Bot Status anchor not found');
}

// ============================================================
// STEP 6: Add compact AI sidebar CSS before </style>
// ============================================================
const compactCSS = `
        /* ============================================ */
        /* COMPACT AI SIDEBAR (Binance-style)           */
        /* ============================================ */
        .ai-sidebar-chat, .ai-sidebar-brain, .ai-sidebar-activity {
            border-bottom: 1px solid var(--border);
        }
        .ai-sidebar-chat .ai-section-header,
        .ai-sidebar-brain .ai-section-header,
        .ai-sidebar-activity .ai-section-header {
            padding: 0.5rem 0.7rem;
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border-light);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .ai-sidebar-chat .ai-header-left,
        .ai-sidebar-brain .ai-header-left,
        .ai-sidebar-activity .ai-header-left {
            display: flex; align-items: center; gap: 6px;
            font-size: 0.75rem; font-weight: 700;
            color: var(--text-primary); letter-spacing: 0.5px;
        }
        .ai-sidebar-chat .ai-header-left i,
        .ai-sidebar-brain .ai-header-left i,
        .ai-sidebar-activity .ai-header-left i {
            font-size: 0.7rem;
        }
        /* --- Chat compact --- */
        .ai-sidebar-chat .ai-chat-messages {
            max-height: 130px; min-height: 60px;
            overflow-y: auto; padding: 6px;
            background: var(--bg-primary);
            scroll-behavior: smooth;
        }
        .ai-sidebar-chat .ai-chat-msg {
            padding: 5px 7px; font-size: 0.65rem;
            line-height: 1.4; border-radius: 6px;
            margin-bottom: 4px; word-wrap: break-word;
        }
        .ai-sidebar-chat .ai-chat-msg.ai-chat-user {
            background: rgba(0,212,255,0.08);
            border-left: 2px solid #00d4ff;
        }
        .ai-sidebar-chat .ai-chat-msg.ai-chat-assistant {
            background: rgba(168,85,247,0.06);
            border-left: 2px solid var(--purple);
        }
        .ai-sidebar-chat .ai-chat-msg.ai-chat-system {
            background: rgba(240,185,11,0.05);
            border-left: 2px solid rgba(240,185,11,0.3);
            font-style: italic;
        }
        .ai-sidebar-chat .ai-chat-meta {
            display: block; font-size: 0.5rem;
            color: var(--text-third); margin-top: 2px;
        }
        .ai-sidebar-chat .ai-chat-suggestions {
            padding: 4px 6px; display: flex;
            gap: 4px; flex-wrap: wrap;
            border-top: 1px solid var(--border-light);
        }
        .ai-sidebar-chat .ai-suggest-btn {
            padding: 2px 7px; font-size: 0.58rem;
            background: var(--bg-tertiary);
            color: var(--text-secondary);
            border: 1px solid var(--border);
            border-radius: 4px; cursor: pointer;
            transition: all 0.15s;
            font-family: inherit;
        }
        .ai-sidebar-chat .ai-suggest-btn:hover {
            background: rgba(0,212,255,0.1);
            border-color: rgba(0,212,255,0.3);
            color: #00d4ff;
        }
        .ai-sidebar-chat .ai-chat-input-area {
            display: flex; gap: 4px;
            padding: 5px 6px;
            border-top: 1px solid var(--border);
            background: var(--bg-secondary);
        }
        .ai-sidebar-chat .ai-chat-input-area input {
            flex: 1; padding: 5px 8px;
            font-size: 0.68rem;
            background: var(--bg-primary);
            border: 1px solid var(--border);
            border-radius: 4px;
            color: var(--text-primary);
            font-family: inherit;
        }
        .ai-sidebar-chat .ai-chat-input-area input:focus {
            border-color: #00d4ff; outline: none;
        }
        .ai-sidebar-chat .ai-chat-input-area input::placeholder {
            color: var(--text-third);
        }
        .ai-sidebar-chat .ai-chat-send-btn {
            width: 26px; height: 26px;
            font-size: 0.6rem;
            background: linear-gradient(135deg, #00d4ff, #a855f7);
            border: none; border-radius: 4px;
            color: #fff; cursor: pointer;
            display: flex; align-items: center;
            justify-content: center;
            transition: opacity 0.15s;
        }
        .ai-sidebar-chat .ai-chat-send-btn:hover { opacity: 0.85; }
        .ai-sidebar-chat .ai-chat-typing {
            display: none; padding: 4px 8px;
            font-size: 0.58rem; color: #00d4ff;
            font-style: italic;
            background: var(--bg-primary);
        }
        .ai-sidebar-chat .ai-chat-typing.visible { display: block; }
        /* --- Brain compact --- */
        .ai-sidebar-brain .ai-brain-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
        }
        .ai-sidebar-brain .ai-brain-item {
            padding: 3px 8px;
            border-bottom: 1px solid var(--border-light);
            border-right: 1px solid var(--border-light);
        }
        .ai-sidebar-brain .ai-brain-item:nth-child(even) { border-right: none; }
        .ai-sidebar-brain .ai-brain-item:nth-last-child(-n+2) { border-bottom: none; }
        .ai-sidebar-brain .ai-brain-label {
            font-size: 0.55rem; color: var(--text-third);
            text-transform: uppercase; letter-spacing: 0.3px;
        }
        .ai-sidebar-brain .ai-brain-value {
            font-size: 0.7rem; color: var(--text-primary);
            font-weight: 600;
            font-family: 'JetBrains Mono', monospace;
        }
        .ai-sidebar-brain .ai-brain-value.quantum { color: #00d4ff; }
        .ai-sidebar-brain .ai-brain-value.good { color: var(--green); }
        .ai-sidebar-brain .ai-brain-value.warn { color: var(--accent); }
        .ai-sidebar-brain .ai-brain-value.bad { color: var(--red); }
        .ai-sidebar-brain .ai-brain-phase {
            font-size: 0.55rem; padding: 2px 6px;
            border-radius: 3px; font-weight: 600;
            letter-spacing: 0.5px;
        }
        .ai-sidebar-brain .ai-brain-phase.heuristic {
            background: rgba(168,85,247,0.15); color: var(--purple);
        }
        .ai-sidebar-brain .ai-brain-phase.learning {
            background: rgba(240,185,11,0.15); color: var(--accent);
        }
        .ai-sidebar-brain .ai-brain-phase.active {
            background: var(--green-bg); color: var(--green);
        }
        /* --- Activity compact --- */
        .ai-sidebar-activity .ai-activity-feed {
            max-height: 80px; min-height: 40px;
            overflow-y: auto; padding: 4px;
            background: var(--bg-primary);
        }
        .ai-sidebar-activity .ai-activity-filter {
            display: flex; gap: 3px;
            padding: 3px 6px;
            background: var(--bg-card);
            overflow-x: auto;
        }
        .ai-sidebar-activity .ai-activity-filter::-webkit-scrollbar { display: none; }
        .ai-sidebar-activity .ai-filter-btn {
            padding: 2px 5px; font-size: 0.55rem;
            background: transparent;
            color: var(--text-third);
            border: 1px solid var(--border);
            border-radius: 3px; cursor: pointer;
            white-space: nowrap;
            font-family: inherit;
        }
        .ai-sidebar-activity .ai-filter-btn:hover {
            color: var(--text-secondary);
            border-color: var(--text-secondary);
        }
        .ai-sidebar-activity .ai-filter-btn.active {
            background: rgba(168,85,247,0.1);
            color: #a855f7;
            border-color: rgba(168,85,247,0.3);
        }
        .ai-sidebar-activity .ai-activity-entry {
            padding: 3px 6px; font-size: 0.58rem;
            border-left: 2px solid var(--border);
            margin-bottom: 2px;
            border-radius: 0 3px 3px 0;
            color: var(--text-secondary);
            line-height: 1.3;
        }
        .ai-sidebar-activity .ai-activity-entry:hover {
            background: var(--bg-hover);
        }
        .ai-sidebar-activity .ai-activity-entry.importance-high {
            border-left-color: var(--accent);
        }
        .ai-sidebar-activity .ai-activity-entry.importance-critical {
            border-left-color: var(--red);
            background: rgba(246,70,93,0.05);
        }
        .ai-sidebar-activity .ai-activity-empty {
            text-align: center; padding: 6px;
            color: var(--text-third); font-size: 0.58rem;
        }
        .ai-sidebar-activity .ai-activity-count {
            font-size: 0.55rem;
            background: rgba(168,85,247,0.15);
            color: #a855f7; padding: 1px 5px;
            border-radius: 8px; font-weight: 600;
        }
`;

if (h.includes('    </style>')) {
    h = h.replace('    </style>', compactCSS + '\n    </style>');
    ok++; console.log('[OK] Step 6: Compact AI sidebar CSS added');
} else {
    fail++; console.log('[FAIL] Step 6: </style> not found');
}

// ============================================================
// FINAL: Write and report
// ============================================================
fs.writeFileSync(FILE, h);
const newLines = h.split('\n').length;
console.log('');
console.log('='.repeat(56));
console.log(` RESULT: ${origLines} -> ${newLines} lines`);
console.log(` STEPS:  ${ok} OK, ${fail} FAIL`);
console.log(' Layout: 2-column (1fr 340px)');
console.log(' AI:     Compact in right sidebar');
console.log(' Chat:   Above Bot Status');
console.log('='.repeat(56));
