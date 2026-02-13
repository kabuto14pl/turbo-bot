const fs = require('fs');
const FILE = '/root/turbo-bot/enterprise-dashboard.html';
let h = fs.readFileSync(FILE, 'utf8');
const old = "document.addEventListener('DOMContentLoaded', initDashboard);";
const nw = "document.addEventListener('DOMContentLoaded', function(){ initDashboard(); restoreSidebarStates(); });";
if (h.includes(old)) {
    h = h.replace(old, nw);
    fs.writeFileSync(FILE, h);
    console.log('OK: restoreSidebarStates added');
} else {
    console.log('NOT FOUND: already patched or different string');
}
