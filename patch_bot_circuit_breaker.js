// patch_bot_circuit_breaker.js
// Fixes critical bug: BUY trades (pnl = -fees) counted as losses trigger circuit breaker
// Also increases maxConsecutiveLosses from 3 to 5 for WARMUP phase
// And adds auto-reset with cooldown

const fs = require('fs');
const path = require('path');

const botFile = path.join(__dirname, 'trading-bot', 'autonomous_trading_bot_final.ts');
const backup = botFile + '.pre-cb-fix';

let code = fs.readFileSync(botFile, 'utf8');

// Backup
fs.writeFileSync(backup, code);
console.log('Backup created:', backup);

let changeCount = 0;

// ============================================================
// FIX 1: maxConsecutiveLosses 3 → 5
// ============================================================
const fix1Old = "maxConsecutiveLosses: 3,  // 🛡️ KROK 4: Reduced from 5 to 3 (faster protection)";
const fix1New = "maxConsecutiveLosses: 5,  // 🛡️ FIX: Increased back to 5 (3 was too aggressive during WARMUP)";

if (code.includes(fix1Old)) {
    code = code.replace(fix1Old, fix1New);
    changeCount++;
    console.log('FIX 1: maxConsecutiveLosses 3 → 5');
} else {
    console.log('FIX 1: Pattern not found, trying alternative...');
    code = code.replace(/maxConsecutiveLosses:\s*3,/g, function(match) {
        changeCount++;
        return 'maxConsecutiveLosses: 5,';
    });
}

// ============================================================
// FIX 2: recordTradeResult should ONLY count SELL (closed position) trades
// BUY trades have pnl = -fees which is always negative → false "loss"
// ============================================================
const fix2Search = 'this.recordTradeResult(trade.pnl);';
const fix2Replace = `// 🛡️ FIX: Only count completed round-trip trades for circuit breaker
            // BUY entries have pnl = -fees (always negative), not a real loss
            if (signal.action === 'SELL') {
                this.recordTradeResult(trade.pnl);
            } else {
                console.log(\`📊 [CIRCUIT BREAKER] Skipping BUY entry (pnl=\${trade.pnl.toFixed(4)} is fees, not a loss)\`);
            }`;

if (code.includes(fix2Search)) {
    code = code.replace(fix2Search, fix2Replace);
    changeCount++;
    console.log('FIX 2: recordTradeResult only for SELL trades');
} else {
    console.log('FIX 2: Pattern not found!');
}

// ============================================================
// FIX 3: Also fix win/loss counting - BUY with pnl < 0 shouldn't be failedTrade
// Find the section that increments failedTrades based on trade.pnl
// ============================================================
const fix3Search = `} else if (trade.pnl < 0) {
                this.portfolio.failedTrades++;
            }
            this.portfolio.winRate = (this.portfolio.successfulTrades / this.portfolio.totalTrades) * 100;`;

const fix3Replace = `} else if (trade.pnl < 0 && signal.action === 'SELL') {
                // Only count SELL trades as failures (BUY pnl=-fees is not a real loss)
                this.portfolio.failedTrades++;
            }
            // Win rate only counts completed round-trips
            var completedTrades = this.portfolio.successfulTrades + this.portfolio.failedTrades;
            this.portfolio.winRate = completedTrades > 0 
                ? (this.portfolio.successfulTrades / completedTrades) * 100 
                : 0;`;

if (code.includes(fix3Search)) {
    code = code.replace(fix3Search, fix3Replace);
    changeCount++;
    console.log('FIX 3: Win/loss counting only for SELL trades');
} else {
    console.log('FIX 3: Exact pattern not found, trying flexible match...');
    // Try more flexible approach
    const altSearch = /\} else if \(trade\.pnl < 0\) \{\s*\n\s*this\.portfolio\.failedTrades\+\+;\s*\n\s*\}/;
    if (altSearch.test(code)) {
        code = code.replace(altSearch, `} else if (trade.pnl < 0 && signal.action === 'SELL') {
                // Only count SELL trades as failures
                this.portfolio.failedTrades++;
            }`);
        changeCount++;
        console.log('FIX 3 (alt): failedTrades only for SELL');
    }
}

// ============================================================
// FIX 4: Add auto-reset cooldown to circuit breaker
// After checkCircuitBreaker returns true, add a cooldown timer
// ============================================================
const fix4Search = `if (this.circuitBreaker.isTripped) {
            return true;
        }`;

const fix4Replace = `if (this.circuitBreaker.isTripped) {
            // 🛡️ FIX: Auto-reset after 30 minutes cooldown
            var timeSinceTrip = Date.now() - (this.circuitBreaker.lastResetTime || 0);
            var cooldownMs = 30 * 60 * 1000; // 30 minutes
            if (timeSinceTrip > cooldownMs) {
                console.log('🔄 [CIRCUIT BREAKER] Auto-reset after 30min cooldown');
                this.resetCircuitBreaker();
                return false; // Allow trading to resume
            }
            return true;
        }`;

if (code.includes(fix4Search)) {
    code = code.replace(fix4Search, fix4Replace);
    changeCount++;
    console.log('FIX 4: Auto-reset after 30min cooldown');
} else {
    console.log('FIX 4: Pattern not found');
}

// ============================================================
// FIX 5: Fix the consecutive losses check (3 → 5)
// ============================================================
const fix5Search = 'if (this.circuitBreaker.consecutiveLosses >= 3) {';
const fix5Replace = 'if (this.circuitBreaker.consecutiveLosses >= 5) {';

var fix5Count = 0;
while (code.includes(fix5Search)) {
    code = code.replace(fix5Search, fix5Replace);
    fix5Count++;
}
if (fix5Count > 0) {
    changeCount += fix5Count;
    console.log('FIX 5: Updated ' + fix5Count + ' consecutive losses checks (3 → 5)');
}

// Write fixed file
fs.writeFileSync(botFile, code, 'utf8');

console.log('\n=== PATCH COMPLETE ===');
console.log('Total changes:', changeCount);
console.log('File:', botFile);
console.log('Backup:', backup);
console.log('\nRestart bot with: pm2 restart turbo-bot');
