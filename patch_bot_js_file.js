#!/usr/bin/env node
/**
 * 🛡️ PATCH: autonomous_trading_bot_final.js (compiled JavaScript)
 * 
 * Applies the same 6 circuit breaker fixes that were applied to the .ts file.
 * PM2 runs the .js file directly, so patches must be in both files.
 * 
 * FIXES:
 * 1. maxConsecutiveLosses: 3 → 5
 * 2. recordTradeResult only called for SELL trades (not BUY entries)
 * 3. failedTrades counter only increments for SELL trades
 * 4. Auto-reset circuit breaker after 30-minute cooldown
 * 5. All hardcoded >= 3 consecutive loss checks → >= 5
 * 6. Soft pause threshold 2 → 3
 */

const fs = require('fs');
const path = require('path');

const BOT_FILE = path.join(__dirname, 'trading-bot', 'autonomous_trading_bot_final.js');

console.log('🛡️ === PATCHING autonomous_trading_bot_final.js (COMPILED JS) ===');
console.log(`📁 File: ${BOT_FILE}`);

// Create backup
const backupFile = BOT_FILE + '.pre-js-fix';
fs.copyFileSync(BOT_FILE, backupFile);
console.log(`💾 Backup created: ${backupFile}`);

let content = fs.readFileSync(BOT_FILE, 'utf-8');
const originalLength = content.length;
let fixCount = 0;

// ============================================================================
// FIX 1: maxConsecutiveLosses: 3 → 5 in initialization
// ============================================================================
const fix1_old = 'maxConsecutiveLosses: 3, // 🛡️ KROK 4: Reduced from 5 to 3 (faster protection)';
const fix1_new = 'maxConsecutiveLosses: 5, // 🛡️ FIX: Increased back to 5 (3 was too aggressive during WARMUP)';

if (content.includes(fix1_old)) {
    content = content.replace(fix1_old, fix1_new);
    fixCount++;
    console.log('✅ FIX 1: maxConsecutiveLosses: 3 → 5 in initialization');
} else if (content.includes('maxConsecutiveLosses: 5')) {
    console.log('⚠️  FIX 1: Already patched (maxConsecutiveLosses: 5)');
} else {
    // Fallback: replace any maxConsecutiveLosses: 3 in circuit breaker init
    const fix1_fallback = /maxConsecutiveLosses:\s*3/;
    if (fix1_fallback.test(content)) {
        content = content.replace(fix1_fallback, 'maxConsecutiveLosses: 5');
        fixCount++;
        console.log('✅ FIX 1 (fallback): maxConsecutiveLosses: 3 → 5');
    } else {
        console.log('❌ FIX 1: Pattern not found!');
    }
}

// ============================================================================
// FIX 2: recordTradeResult only for SELL trades (not BUY entries)
// ============================================================================
const fix2_old = `            // 🛡️ RECORD TRADE RESULT FOR CIRCUIT BREAKER
            this.recordTradeResult(trade.pnl);`;

const fix2_new = `            // 🛡️ RECORD TRADE RESULT FOR CIRCUIT BREAKER - Only count SELL trades (closed positions)
            if (signal.action === 'SELL') {
                this.recordTradeResult(trade.pnl);
            } else {
                console.log(\`📊 [CIRCUIT BREAKER] Skipping BUY entry trade for circuit breaker (pnl: \$\${trade.pnl.toFixed(2)} is just fees, not a real loss)\`);
            }`;

if (content.includes(fix2_old)) {
    content = content.replace(fix2_old, fix2_new);
    fixCount++;
    console.log('✅ FIX 2: recordTradeResult gated to SELL trades only');
} else {
    console.log('⚠️  FIX 2: Pattern not found (may already be patched)');
}

// ============================================================================
// FIX 3: failedTrades counter only for SELL trades
// ============================================================================
const fix3_old = `            else if (trade.pnl < 0) {
                this.portfolio.failedTrades++;
            }
            this.portfolio.winRate = (this.portfolio.successfulTrades / this.portfolio.totalTrades) * 100;`;

const fix3_new = `            else if (trade.pnl < 0 && signal.action === 'SELL') {
                this.portfolio.failedTrades++; // Only count SELL losses as failed trades
            }
            // Win rate based on completed round-trips only (exclude BUY entries)
            const completedTrades = this.portfolio.successfulTrades + this.portfolio.failedTrades;
            this.portfolio.winRate = completedTrades > 0 ? (this.portfolio.successfulTrades / completedTrades) * 100 : 0;`;

if (content.includes(fix3_old)) {
    content = content.replace(fix3_old, fix3_new);
    fixCount++;
    console.log('✅ FIX 3: failedTrades counter gated to SELL trades + winRate from round-trips');
} else {
    console.log('⚠️  FIX 3: Pattern not found (may already be patched)');
}

// ============================================================================
// FIX 4: Auto-reset circuit breaker after 30-minute cooldown
// ============================================================================
const fix4_old = `    checkCircuitBreaker() {
        // Check if already tripped
        if (this.circuitBreaker.isTripped) {
            return true;
        }`;

const fix4_new = `    checkCircuitBreaker() {
        // 🛡️ FIX: Auto-reset circuit breaker after 30-minute cooldown
        if (this.circuitBreaker.isTripped) {
            const cooldownMs = 30 * 60 * 1000; // 30 minutes
            const elapsed = Date.now() - this.circuitBreaker.lastResetTime;
            if (elapsed >= cooldownMs) {
                console.log(\`🔄 [CIRCUIT BREAKER] Auto-reset after 30-minute cooldown (elapsed: \${(elapsed / 60000).toFixed(1)} min)\`);
                this.circuitBreaker.isTripped = false;
                this.circuitBreaker.consecutiveLosses = 0;
                this.circuitBreaker.emergencyStopTriggered = false;
                this.circuitBreaker.lastResetTime = Date.now();
                return false; // Allow trading to resume
            }
            return true;
        }`;

if (content.includes(fix4_old)) {
    content = content.replace(fix4_old, fix4_new);
    fixCount++;
    console.log('✅ FIX 4: Auto-reset circuit breaker after 30-minute cooldown');
} else {
    console.log('⚠️  FIX 4: Pattern not found (may already be patched)');
}

// ============================================================================
// FIX 5: Update hardcoded >= 3 check in recordTradeResult
// ============================================================================
const fix5_old = `            if (this.circuitBreaker.consecutiveLosses >= 3) {
                console.log(\`🛑 [CIRCUIT BREAKER] Triggering after 3 consecutive losses (reduced from 5)\`);`;

const fix5_new = `            if (this.circuitBreaker.consecutiveLosses >= 5) {
                console.log(\`🛑 [CIRCUIT BREAKER] Triggering after 5 consecutive losses\`);`;

if (content.includes(fix5_old)) {
    content = content.replace(fix5_old, fix5_new);
    fixCount++;
    console.log('✅ FIX 5: Hardcoded >= 3 → >= 5 in recordTradeResult');
} else {
    console.log('⚠️  FIX 5: Pattern not found (may already be patched)');
}

// ============================================================================
// FIX 6: Soft pause threshold 2 → 3
// ============================================================================
const fix6_old = `            if (this.consecutiveLossesForSoftPause >= 2 && !this.softPauseActive) {
                this.softPauseActive = true;
                console.log(\`⏸️ [SOFT PAUSE] ACTIVATED after 2 losses - position sizes reduced 50%\`);`;

const fix6_new = `            if (this.consecutiveLossesForSoftPause >= 3 && !this.softPauseActive) {
                this.softPauseActive = true;
                console.log(\`⏸️ [SOFT PAUSE] ACTIVATED after 3 losses - position sizes reduced 50%\`);`;

if (content.includes(fix6_old)) {
    content = content.replace(fix6_old, fix6_new);
    fixCount++;
    console.log('✅ FIX 6: Soft pause threshold 2 → 3');
} else {
    console.log('⚠️  FIX 6: Pattern not found (may already be patched)');
}

// ============================================================================
// WRITE PATCHED FILE
// ============================================================================
fs.writeFileSync(BOT_FILE, content, 'utf-8');

console.log('');
console.log(`📊 === PATCH SUMMARY ===`);
console.log(`   Fixes applied: ${fixCount}/6`);
console.log(`   File size: ${originalLength} → ${content.length} bytes`);
console.log(`   Backup: ${backupFile}`);
console.log('');

if (fixCount >= 4) {
    console.log('✅ PATCH SUCCESSFUL - Restart bot with: pm2 restart turbo-bot');
} else if (fixCount > 0) {
    console.log('⚠️  PARTIAL PATCH - Some fixes applied. Check output above.');
} else {
    console.log('❌ NO FIXES APPLIED - Check if file was already patched.');
}
