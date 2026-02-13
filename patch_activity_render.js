const fs = require('fs');
const FILE = '/root/turbo-bot/enterprise-dashboard.html';
let h = fs.readFileSync(FILE, 'utf8');

// Replace renderAIActivityEntry to use type badges and cleaner formatting
const oldRender = `function renderAIActivityEntry(entry) {
    var feed = $('aiActivityFeed');
    if (!feed) return;

    // Remove empty message if present
    var empty = feed.querySelector('.ai-activity-empty');
    if (empty) empty.remove();

    var div = document.createElement('div');
    div.className = 'ai-activity-entry';
    if (entry.importance === 'high') div.classList.add('importance-high');
    if (entry.importance === 'critical') div.classList.add('importance-critical');
    div.setAttribute('data-type', entry.type || '');

    var time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('pl-PL') : '--';
    div.innerHTML =
        '<div class="ai-ae-time">' + time + '</div>' +
        '<div><span>' + (entry.icon || '📌') + '</span> <span class="ai-ae-title">' + escAI(entry.title || '') + '</span></div>' +
        (entry.description ? '<div class="ai-ae-desc">' + escAI(entry.description) + '</div>' : '');`;

const newRender = `function renderAIActivityEntry(entry) {
    var feed = $('aiActivityFeed');
    if (!feed) return;

    // Remove empty message if present
    var empty = feed.querySelector('.ai-activity-empty');
    if (empty) empty.remove();

    var div = document.createElement('div');
    div.className = 'ai-activity-entry';
    if (entry.importance === 'high') div.classList.add('importance-high');
    if (entry.importance === 'critical') div.classList.add('importance-critical');
    div.setAttribute('data-type', entry.type || '');

    var time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('pl-PL', {hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '--';
    var typeLower = (entry.type || 'system').toLowerCase();
    var typeBadge = '<span class="ai-activity-type-badge type-' + typeLower + '">' + escAI(entry.type || 'SYS') + '</span>';
    div.innerHTML =
        '<div style="display:flex;align-items:center;gap:4px;">' +
            typeBadge +
            '<span class="ai-activity-title">' + escAI(entry.title || '') + '</span>' +
            '<span class="ai-activity-time">' + time + '</span>' +
        '</div>' +
        (entry.description ? '<div class="ai-activity-desc">' + escAI(entry.description).substring(0,80) + '</div>' : '');`;

if (h.includes(oldRender)) {
    h = h.replace(oldRender, newRender);
    fs.writeFileSync(FILE, h);
    console.log('OK: renderAIActivityEntry upgraded with type badges');
} else {
    console.log('FAIL: renderAIActivityEntry not found — trying partial match');
    // Try a simpler match
    const partOld = "var time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('pl-PL') : '--';";
    const partNew = "var time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('pl-PL', {hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '--';";
    
    if (h.includes(partOld)) {
        h = h.replace(partOld, partNew);
        
        // Now replace the innerHTML part
        const oldInner = `div.innerHTML =
        '<div class="ai-ae-time">' + time + '</div>' +
        '<div><span>' + (entry.icon || '📌') + '</span> <span class="ai-ae-title">' + escAI(entry.title || '') + '</span></div>' +
        (entry.description ? '<div class="ai-ae-desc">' + escAI(entry.description) + '</div>' : '');`;
        
        const newInner = `var typeLower = (entry.type || 'system').toLowerCase();
    var typeBadge = '<span class="ai-activity-type-badge type-' + typeLower + '">' + escAI(entry.type || 'SYS') + '</span>';
    div.innerHTML =
        '<div style="display:flex;align-items:center;gap:4px;">' +
            typeBadge +
            '<span class="ai-activity-title">' + escAI(entry.title || '') + '</span>' +
            '<span class="ai-activity-time">' + time + '</span>' +
        '</div>' +
        (entry.description ? '<div class="ai-activity-desc">' + escAI(entry.description).substring(0,80) + '</div>' : '');`;
        
        if (h.includes(oldInner)) {
            h = h.replace(oldInner, newInner);
            fs.writeFileSync(FILE, h);
            console.log('OK: Partial match — both time + innerHTML replaced');
        } else {
            console.log('FAIL: innerHTML pattern not found either');
            // Just save the time fix
            fs.writeFileSync(FILE, h);
            console.log('PARTIAL: Only time format was fixed');
        }
    } else {
        console.log('FAIL: Neither full nor partial match found');
    }
}
