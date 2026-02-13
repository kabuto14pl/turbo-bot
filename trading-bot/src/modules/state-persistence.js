'use strict';
/**
 * @module StatePersistence
 * @description Save/load bot state to JSON for crash recovery.
 */
const fs = require('fs');
const path = require('path');

class StatePersistence {
    constructor(filePath, maxAgeMinutes) {
        this.filePath = filePath || '/root/turbo-bot/data/bot_state.json';
        this.maxAge = (maxAgeMinutes || 60) * 60000;
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    save(pm, rm, ml) {
        try {
            const state = { timestamp: Date.now(), ...pm.exportState(), ...rm.exportState(), ...(ml ? ml.exportState() : {}) };
            fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2));
        } catch (e) { console.warn('[STATE SAVE] Error:', e.message); }
    }

    load(pm, rm, ml) {
        try {
            if (!fs.existsSync(this.filePath)) { console.log('[STATE] No saved state'); return false; }
            const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
            const age = Date.now() - data.timestamp;
            if (age > this.maxAge) { console.log('[STATE] Too old (' + (age/60000).toFixed(0) + 'min)'); return false; }
            pm.restoreState(data);
            rm.restoreState(data);
            if (ml) ml.restoreState(data);
            console.log('[STATE] ??? Restored (age: ' + (age/60000).toFixed(1) + 'min)');
            return true;
        } catch (e) { console.warn('[STATE LOAD] Error:', e.message); return false; }
    }
}

module.exports = { StatePersistence };
