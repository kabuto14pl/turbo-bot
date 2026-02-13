const fs = require('fs');
const FILE = '/root/turbo-bot/enterprise-dashboard.html';
let h = fs.readFileSync(FILE, 'utf8');

// The JS functions were accidentally placed inside the CDN script tag
// They need to be extracted and moved to before the final </script>

const jsBlock = `
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

// Step 1: Remove the JS block from the wrong location (inside CDN script tag)
// The CDN tag should be: <script src="...lightweight-charts..."></script>
// But it currently has JS injected inside it
const cdnTagStart = '<script src="https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js">';
const firstCloseScript = '</script>';

// Find the first </script> after the CDN tag
const cdnIdx = h.indexOf(cdnTagStart);
if (cdnIdx < 0) {
    console.log('ERROR: CDN script tag not found');
    process.exit(1);
}

// Get content between cdnTag open and first </script>
const afterCdn = h.substring(cdnIdx + cdnTagStart.length);
const firstCloseIdx = afterCdn.indexOf(firstCloseScript);
const injectedContent = afterCdn.substring(0, firstCloseIdx);

if (injectedContent.includes('toggleSection')) {
    // Remove the injected JS from CDN tag — restore it to self-closing
    h = h.substring(0, cdnIdx) + cdnTagStart + firstCloseScript + afterCdn.substring(firstCloseIdx + firstCloseScript.length);
    console.log('[OK] Step 1: Removed JS from CDN script tag');
} else {
    console.log('[SKIP] Step 1: No JS in CDN tag');
}

// Step 2: Insert the JS block before the final </script>
// Find the LAST </script> in the file
const lastScriptIdx = h.lastIndexOf('</script>');
if (lastScriptIdx > 0) {
    h = h.substring(0, lastScriptIdx) + jsBlock + '\n' + h.substring(lastScriptIdx);
    console.log('[OK] Step 2: JS functions inserted before final </script>');
} else {
    console.log('[FAIL] Step 2: No </script> found');
}

fs.writeFileSync(FILE, h);
console.log('[DONE] File saved, ' + h.split('\n').length + ' lines');
