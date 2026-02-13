#!/usr/bin/env node
'use strict';

/**
 * Patch: Collapsible Sidebar Sections + Bigger AI Chat & Activity
 * 
 * Changes:
 * 1. Bot Status, Risk Mgmt, Component Health, Configuration → collapsible (click header toggles body)
 * 2. All 4 start collapsed by default to give AI Chat max space
 * 3. AI Chat messages: 130px → 240px
 * 4. AI Activity feed: 80px → 160px
 * 5. Chevron arrows on collapsible headers with smooth CSS animations
 * 6. Right sidebar scrollable so everything fits on any screen
 */

const fs = require('fs');
const FILE = '/root/turbo-bot/enterprise-dashboard.html';

console.log('='.repeat(60));
console.log(' Patch: Collapsible Sidebar + Bigger AI Chat/Activity');
console.log('='.repeat(60));

let h = fs.readFileSync(FILE, 'utf8');
const origLines = h.split('\n').length;
console.log(`[READ] ${origLines} lines`);

fs.writeFileSync(FILE + '.pre-collapse-bak', h);
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
        console.log(`[FAIL] ${name} — string not found`);
        return false;
    }
}

// ============================================================
// STEP 1: Make right-sidebar scrollable
// ============================================================
step('Step 1: Sidebar scrollable',
    `.right-sidebar {
            display: flex;
            flex-direction: column;
            background: var(--bg-card);
        }`,
    `.right-sidebar {
            display: flex;
            flex-direction: column;
            background: var(--bg-card);
            overflow-y: auto;
            overflow-x: hidden;
            max-height: calc(100vh - 60px);
        }`
);

// ============================================================
// STEP 2: Add collapsible CSS before </style>
// ============================================================
const collapsibleCSS = `
        /* ============================================ */
        /* COLLAPSIBLE SIDEBAR SECTIONS                 */
        /* ============================================ */
        .sys-section-header.collapsible {
            cursor: pointer;
            user-select: none;
            transition: background 0.15s;
            position: relative;
            padding-right: 2rem;
        }
        .sys-section-header.collapsible:hover {
            background: var(--bg-tertiary);
        }
        .sys-section-header.collapsible::after {
            content: '\\f078';
            font-family: 'Font Awesome 6 Free';
            font-weight: 900;
            font-size: 0.55rem;
            position: absolute;
            right: 0.75rem;
            top: 50%;
            transform: translateY(-50%) rotate(0deg);
            transition: transform 0.25s ease;
            color: var(--text-third);
        }
        .sys-section.collapsed .sys-section-header.collapsible::after {
            transform: translateY(-50%) rotate(-90deg);
        }
        .sys-section .sys-section-body {
            max-height: 500px;
            overflow: hidden;
            transition: max-height 0.3s ease, opacity 0.2s ease;
            opacity: 1;
        }
        .sys-section.collapsed .sys-section-body {
            max-height: 0;
            opacity: 0;
        }
        .sys-section.collapsed {
            border-bottom: 1px solid var(--border);
        }
        .sys-section.collapsed .sys-section-header.collapsible {
            border-bottom: none;
        }
`;

step('Step 2: Collapsible CSS',
    '    </style>',
    collapsibleCSS + '\n    </style>'
);

// ============================================================
// STEP 3: Increase AI Chat messages height 130px → 240px
// ============================================================
step('Step 3: Chat height 130→240',
    `.ai-sidebar-chat .ai-chat-messages {
            max-height: 130px; min-height: 60px;`,
    `.ai-sidebar-chat .ai-chat-messages {
            max-height: 240px; min-height: 80px;`
);

// ============================================================
// STEP 4: Increase AI Activity feed height 80px → 160px
// ============================================================
step('Step 4: Activity height 80→160',
    `.ai-sidebar-activity .ai-activity-feed {
            max-height: 80px; min-height: 40px;`,
    `.ai-sidebar-activity .ai-activity-feed {
            max-height: 160px; min-height: 50px;`
);

// ============================================================
// STEP 5: Wrap Bot Status rows in collapsible body div
// ============================================================
step('Step 5a: Bot Status collapsible header',
    `<!-- Bot Status -->
        <div class="sys-section">
            <div class="sys-section-header"><i class="fas fa-robot"></i> Bot Status</div>`,
    `<!-- Bot Status -->
        <div class="sys-section collapsed" id="sectionBotStatus">
            <div class="sys-section-header collapsible" onclick="toggleSection('sectionBotStatus')"><i class="fas fa-robot"></i> Bot Status</div>
            <div class="sys-section-body">`
);

// Close the Bot Status body div before Risk Management
step('Step 5b: Bot Status close body',
    `        </div>

        <!-- Risk Management -->`,
    `            </div>
        </div>

        <!-- Risk Management -->`
);

// ============================================================
// STEP 6: Wrap Risk Management in collapsible
// ============================================================
step('Step 6a: Risk Mgmt collapsible header',
    `<!-- Risk Management -->
        <div class="sys-section">
            <div class="sys-section-header"><i class="fas fa-shield-alt"></i> Risk Management</div>`,
    `<!-- Risk Management -->
        <div class="sys-section collapsed" id="sectionRiskMgmt">
            <div class="sys-section-header collapsible" onclick="toggleSection('sectionRiskMgmt')"><i class="fas fa-shield-alt"></i> Risk Management</div>
            <div class="sys-section-body">`
);

// Close Risk body before Components Health
step('Step 6b: Risk close body',
    `        </div>

        <!-- Components Health -->`,
    `            </div>
        </div>

        <!-- Components Health -->`
);

// ============================================================
// STEP 7: Wrap Component Health in collapsible
// ============================================================
step('Step 7a: Components collapsible header',
    `<!-- Components Health -->
        <div class="sys-section">
            <div class="sys-section-header"><i class="fas fa-heartbeat"></i> Component Health</div>`,
    `<!-- Components Health -->
        <div class="sys-section collapsed" id="sectionCompHealth">
            <div class="sys-section-header collapsible" onclick="toggleSection('sectionCompHealth')"><i class="fas fa-heartbeat"></i> Component Health</div>
            <div class="sys-section-body">`
);

// Close Components body before Configuration
step('Step 7b: Components close body',
    `        </div>

        <!-- Configuration -->`,
    `            </div>
        </div>

        <!-- Configuration -->`
);

// ============================================================
// STEP 8: Wrap Configuration in collapsible
// ============================================================
step('Step 8a: Config collapsible header',
    `<!-- Configuration -->
        <div class="sys-section">
            <div class="sys-section-header"><i class="fas fa-cog"></i> Configuration</div>`,
    `<!-- Configuration -->
        <div class="sys-section collapsed" id="sectionConfig">
            <div class="sys-section-header collapsible" onclick="toggleSection('sectionConfig')"><i class="fas fa-cog"></i> Configuration</div>
            <div class="sys-section-body">`
);

// Close Config body before end of sidebar
step('Step 8b: Config close body',
    `        </div>
    </div>



    <!-- FOOTER -->`,
    `            </div>
        </div>
    </div>



    <!-- FOOTER -->`
);

// ============================================================
// STEP 9: Add toggleSection() JS function before </script>
// ============================================================
const toggleJS = `
// ---- COLLAPSIBLE SIDEBAR SECTIONS ----
function toggleSection(sectionId) {
    const el = document.getElementById(sectionId);
    if (!el) return;
    el.classList.toggle('collapsed');
    // Save state to localStorage
    const collapsed = el.classList.contains('collapsed');
    try {
        const states = JSON.parse(localStorage.getItem('sidebarStates') || '{}');
        states[sectionId] = collapsed;
        localStorage.setItem('sidebarStates', JSON.stringify(states));
    } catch(e) {}
}

// Restore sidebar states from localStorage on load
function restoreSidebarStates() {
    try {
        const states = JSON.parse(localStorage.getItem('sidebarStates') || '{}');
        const defaults = {
            sectionBotStatus: true,
            sectionRiskMgmt: true,
            sectionCompHealth: true,
            sectionConfig: true
        };
        const merged = Object.assign({}, defaults, states);
        for (const [id, collapsed] of Object.entries(merged)) {
            const el = document.getElementById(id);
            if (!el) continue;
            if (collapsed) {
                el.classList.add('collapsed');
            } else {
                el.classList.remove('collapsed');
            }
        }
    } catch(e) {}
}
`;

step('Step 9: Toggle JS',
    '</script>',
    toggleJS + '\n</script>'
);

// ============================================================
// STEP 10: Call restoreSidebarStates() in DOMContentLoaded
// ============================================================
// Find the DOMContentLoaded listener and add call
if (h.includes("document.addEventListener('DOMContentLoaded'")) {
    // Add restoreSidebarStates() call after initDashboard
    if (h.includes('initDashboard();')) {
        // Find the one inside DOMContentLoaded (last occurrence)
        const domContentIdx = h.lastIndexOf("document.addEventListener('DOMContentLoaded'");
        const initDashIdx = h.indexOf('initDashboard();', domContentIdx);
        if (initDashIdx > 0) {
            const insertAt = initDashIdx + 'initDashboard();'.length;
            h = h.substring(0, insertAt) + '\n    restoreSidebarStates();' + h.substring(insertAt);
            ok++;
            console.log('[OK] Step 10: restoreSidebarStates() call added');
        } else {
            fail++;
            console.log('[FAIL] Step 10: initDashboard not found after DOMContentLoaded');
        }
    } else {
        fail++;
        console.log('[FAIL] Step 10: initDashboard() not found');
    }
} else {
    fail++;
    console.log('[FAIL] Step 10: DOMContentLoaded not found');
}

// ============================================================
// FINAL: Write and report
// ============================================================
fs.writeFileSync(FILE, h);
const newLines = h.split('\n').length;
console.log('');
console.log('='.repeat(60));
console.log(` RESULT: ${origLines} -> ${newLines} lines`);
console.log(` STEPS:  ${ok} OK, ${fail} FAIL`);
console.log(' Collapsible: Bot Status, Risk, Components, Config');
console.log(' Default: All 4 collapsed (more space for AI Chat)');
console.log(' Chat: 240px, Activity: 160px');
console.log(' Sidebar: scrollable');
console.log('='.repeat(60));
