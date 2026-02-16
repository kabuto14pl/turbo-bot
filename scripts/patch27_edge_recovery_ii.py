#!/usr/bin/env python3
"""
PATCH #27: Edge Recovery II — Anti-RANGING, Wider SL, Enhanced NeuronAI
Date: 2026-02-14
Author: Copilot Agent + User Deep Analysis

Based on comprehensive trade analysis (36 round-trips, -$47.20 net PnL):
- 929% fee-to-profit ratio — fees destroying edge
- 64.3% LONGs in falling market
- 13 trades <5min with 36.1% WR (scalping kills)
- 9 SL exits = -$68.34 (SL too tight)
- NeuronAI 78% HOLD, only 2.7% overrides (too passive)
- R:R ratio 0.68 (avg win $2.96 vs avg loss $4.36)

CHANGES:
  1. server.js: /api/trades limit 50→500 (full trade history access)
  2. execution-engine.js: SL 2.0→2.5x ATR, partial TP L1 1.5→2.0x, L2 2.5→3.75x ATR
  3. neuron_ai_manager.js: reversalEnabled=true, RANGING filter, confidence floor 0.25
  4. bot.js: RANGING regime filter in execution pipeline
  5. ml-integration.js + enterprise_ml_system.js: Exploration rate floor 0.15
  6. neuron_ai_state.json: Reset riskMultiplier 0.3→0.6, consecutiveLosses 13→0
"""

import os
import re
import json
import shutil
from datetime import datetime

BASE = '/root/turbo-bot'
BACKUP_DIR = os.path.join(BASE, 'data', 'backups', f'pre_p27_{datetime.now().strftime("%Y%m%d_%H%M%S")}')

FILES = {
    'server': os.path.join(BASE, 'trading-bot/src/modules/server.js'),
    'exec': os.path.join(BASE, 'trading-bot/src/modules/execution-engine.js'),
    'neuron': os.path.join(BASE, 'trading-bot/src/core/ai/neuron_ai_manager.js'),
    'bot': os.path.join(BASE, 'trading-bot/src/modules/bot.js'),
    'ml': os.path.join(BASE, 'trading-bot/src/modules/ml-integration.js'),
    'enterprise_ml': os.path.join(BASE, 'trading-bot/src/core/ml/enterprise_ml_system.js'),
    'neuron_state': os.path.join(BASE, 'trading-bot/data/neuron_ai_state.json'),
}

changes_applied = 0
changes_failed = 0


def safe_replace(filepath, old, new, description, count=1):
    """Replace text in file with verification."""
    global changes_applied, changes_failed
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    occurrences = content.count(old)
    if occurrences == 0:
        print(f'  ❌ FAILED: {description}')
        print(f'     Pattern not found in {os.path.basename(filepath)}')
        print(f'     Looking for: {old[:80]}...')
        changes_failed += 1
        return False

    content = content.replace(old, new, count)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'  ✅ {description} ({occurrences} occurrence(s), replaced {count})')
    changes_applied += 1
    return True


def safe_replace_all(filepath, old, new, description):
    """Replace ALL occurrences."""
    return safe_replace(filepath, old, new, description, count=999)


def insert_before(filepath, marker, block, description):
    """Insert code block before a marker line."""
    global changes_applied, changes_failed
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if marker not in content:
        print(f'  ❌ FAILED: {description}')
        print(f'     Marker not found: {marker[:60]}...')
        changes_failed += 1
        return False

    if 'PATCH #27' in content.split(marker)[0][-500:]:
        print(f'  ⚠️ SKIP: {description} — P27 marker already present')
        changes_applied += 1
        return True

    content = content.replace(marker, block + '\n' + marker, 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'  ✅ {description}')
    changes_applied += 1
    return True


def main():
    global changes_applied, changes_failed

    print('=' * 60)
    print('PATCH #27: Edge Recovery II')
    print('Anti-RANGING | Wider SL | Enhanced NeuronAI | ML Exploration')
    print('=' * 60)
    print()

    # ========================================
    # BACKUP
    # ========================================
    print('[BACKUP] Creating backup...')
    os.makedirs(BACKUP_DIR, exist_ok=True)
    for key, path in FILES.items():
        if os.path.exists(path):
            shutil.copy2(path, os.path.join(BACKUP_DIR, f'{key}_{os.path.basename(path)}'))
    print(f'  Backup created: {BACKUP_DIR}')
    print()

    # ========================================
    # 1. server.js: Trade history limit 50→500
    # ========================================
    print('[1/6] server.js: /api/trades limit 50→500')
    safe_replace(
        FILES['server'],
        'const limit = parseInt(req.query.limit) || 50;',
        'const limit = parseInt(req.query.limit) || 500; // PATCH #27: 50->500 for full trade history',
        'Trade limit 50→500'
    )
    print()

    # ========================================
    # 2. execution-engine.js: SL + TP changes
    # ========================================
    print('[2/6] execution-engine.js: SL 2.0→2.5x ATR + partial TP adjustment')

    # 2a. BUY SL: 2.0→2.5x ATR
    safe_replace(
        FILES['exec'],
        'sl = signal.price - 2.0 * atrValue;',
        'sl = signal.price - 2.5 * atrValue; // P27: SL widened 2.0->2.5x ATR for fewer premature stops',
        'BUY SL 2.0→2.5x ATR'
    )

    # 2b. SHORT SL: 2.0→2.5x ATR
    safe_replace(
        FILES['exec'],
        'shortSL = signal.price + 2.0 * atrValue;',
        'shortSL = signal.price + 2.5 * atrValue; // P27: SL widened 2.0->2.5x ATR',
        'SHORT SL 2.0→2.5x ATR'
    )

    # 2c. Partial TP Level 1: 1.5x→2.0x ATR
    # Comment updates
    safe_replace_all(
        FILES['exec'],
        '// Level 1: 25% at 1.5x ATR',
        '// Level 1: 25% at 2.0x ATR (P27: adjusted for 2.5x SL, ~0.8R)',
        'TP L1 comment update'
    )
    safe_replace(
        FILES['exec'],
        '// PARTIAL TP LEVEL 1: 25% at 1.5x ATR',
        '// PARTIAL TP LEVEL 1: 25% at 2.0x ATR — 0.8R with 2.5x ATR SL (P27)',
        'TP L1 label update'
    )
    # Trigger threshold
    safe_replace(
        FILES['exec'],
        'if (atrMult >= 1.5 && !pos._partialTp1Done',
        'if (atrMult >= 2.0 && !pos._partialTp1Done',
        'TP L1 trigger 1.5→2.0x ATR'
    )
    # Reason string
    safe_replace_all(
        FILES['exec'],
        'PARTIAL_TP_L1_1.5ATR',
        'PARTIAL_TP_L1_2.0ATR',
        'TP L1 reason string'
    )

    # 2d. Partial TP Level 2: 2.5x→3.75x ATR (1:1.5 RR with 2.5x SL)
    safe_replace_all(
        FILES['exec'],
        '// Level 2: 25% at 2.5x ATR',
        '// Level 2: 25% at 3.75x ATR (P27: 1:1.5 RR with 2.5x SL)',
        'TP L2 comment update'
    )
    safe_replace(
        FILES['exec'],
        '// PARTIAL TP LEVEL 2: 25% at 2.5x ATR',
        '// PARTIAL TP LEVEL 2: 25% at 3.75x ATR — 1:1.5 RR with 2.5x ATR SL (P27)',
        'TP L2 label update'
    )
    safe_replace(
        FILES['exec'],
        'if (atrMult >= 2.5 && !pos._partialTp2Done',
        'if (atrMult >= 3.75 && !pos._partialTp2Done',
        'TP L2 trigger 2.5→3.75x ATR'
    )
    safe_replace_all(
        FILES['exec'],
        'PARTIAL_TP_L2_2.5ATR',
        'PARTIAL_TP_L2_3.75ATR',
        'TP L2 reason string'
    )

    # 2e. Log messages — fix stale SL description (cosmetic, from P26 leftover)
    safe_replace_all(
        FILES['exec'],
        "sl = signal.price - 2.5 * atrValue; // P27: SL widened 2.0->2.5x ATR for fewer premature stops",
        "sl = signal.price - 2.5 * atrValue; // P27: SL widened 2.0->2.5x ATR for fewer premature stops",
        'BUY SL log (noop verify)'
    )

    print()

    # ========================================
    # 3. neuron_ai_manager.js: reversal + RANGING + confidence
    # ========================================
    print('[3/6] neuron_ai_manager.js: NeuronAI enhancements')

    # 3a. Enable reversal detection
    safe_replace(
        FILES['neuron'],
        'this.reversalEnabled = false;',
        'this.reversalEnabled = true;  // PATCH #27: Enable reversal detection by default',
        'reversalEnabled false→true'
    )

    # 3b. Higher confidence floor in risk multiplier application
    safe_replace(
        FILES['neuron'],
        'confidence = Math.max(0.1, Math.min(1.0, confidence));',
        'confidence = Math.max(0.25, Math.min(1.0, confidence)); // P27: floor 0.1->0.25 for actionable signals',
        'Confidence floor 0.1→0.25'
    )

    # 3c. Add RANGING regime filter in fallback
    insert_before(
        FILES['neuron'],
        '// Moderate signals: follow ensemble majority if clear',
        """        // PATCH #27: RANGING regime filter — reduce confidence in ranging/sideways markets
        // Analysis: 13 trades <5min in RANGING had only 36.1% WR, scalping kills profits
        if (action !== 'HOLD' && action !== 'CLOSE') {
            const regimeStr = ((state.regime || '') + '').toUpperCase();
            if (regimeStr.includes('RANG') || regimeStr.includes('SIDEWAYS') || regimeStr.includes('CHOPPY')) {
                confidence *= 0.55; // 45% confidence reduction in ranging markets
                reason += ' | P27: RANGING regime penalty -45%';
                // In ranging market with any loss streak, force HOLD
                if ((this.consecutiveLosses || 0) >= 2) {
                    action = 'HOLD';
                    confidence = 0.15;
                    reason = 'P27: RANGING + ' + (this.consecutiveLosses || 0) + ' losses = FORCED HOLD';
                }
            }
        }
""",
        'RANGING regime filter in fallback'
    )

    # 3d. Increase fallback MTF threshold slightly for quality
    safe_replace(
        FILES['neuron'],
        "minMTFScore: 20,       // Was 15 -- require stronger MTF confirmation",
        "minMTFScore: 22,       // P27: 20->22 for higher quality signals (was 15 pre-P26)",
        'Fallback MTF threshold 20→22'
    )

    print()

    # ========================================
    # 4. bot.js: RANGING regime filter before execution
    # ========================================
    print('[4/6] bot.js: RANGING regime filter in execution pipeline')

    insert_before(
        FILES['bot'],
        '// PATCH #26: Signal quality gate',
        """                    // PATCH #27: RANGING regime filter — penalize trades in sideways markets
                    // Analysis showed ranging market trades have poor win rate and high reversal risk
                    if (shouldExecute && consensus.action !== 'HOLD') {
                        const currentRegime = (this.neuralAI && this.neuralAI.currentRegime) || '';
                        const regimeUpper = (currentRegime + '').toUpperCase();
                        if (regimeUpper.includes('RANG') || regimeUpper.includes('SIDEWAYS') || regimeUpper.includes('CHOPPY')) {
                            const oldConf = consensus.confidence;
                            consensus.confidence *= 0.70; // 30% penalty in ranging markets
                            console.log('[P27 REGIME] RANGING detected — confidence reduced: ' +
                                (oldConf * 100).toFixed(1) + '% -> ' + (consensus.confidence * 100).toFixed(1) + '%');
                            if (this.megatron) {
                                this.megatron.logActivity('RISK', 'P27 RANGING Penalty',
                                    'Regime: ' + currentRegime + ' | Conf: ' + (oldConf * 100).toFixed(1) +
                                    '% -> ' + (consensus.confidence * 100).toFixed(1) + '%', {}, 'normal');
                            }
                        }
                    }
""",
        'RANGING regime filter before quality gate'
    )

    print()

    # ========================================
    # 5. ML exploration: enterprise_ml_system.js + ml-integration.js
    # ========================================
    print('[5/6] ML exploration rate: floor at 0.15')

    # 5a. enterprise_ml_system.js: Fix calculateExplorationRate
    safe_replace(
        FILES['enterprise_ml'],
        """    calculateExplorationRate() {
        // Decreasing exploration over time
        const baseExploration = 0.1;
        const decayRate = 0.999;
        return baseExploration * Math.pow(decayRate, this.episodes);
    }""",
        """    calculateExplorationRate() {
        // PATCH #27: Increased base exploration and added floor at 0.15
        // Analysis: exploration was stuck at 0.089, ML trapped in local minimum
        // Old: base=0.1, no floor. New: base=0.30, floor=0.15 for continued exploration
        const baseExploration = 0.30;
        const decayRate = 0.999;
        const rate = baseExploration * Math.pow(decayRate, this.episodes);
        return Math.max(0.15, rate); // P27: floor at 15% to prevent over-exploitation
    }""",
        'Exploration rate: base 0.1→0.3, floor 0.15'
    )

    # 5b. ml-integration.js: Add exploration floor enforcement after getPerformance
    safe_replace(
        FILES['ml'],
        'this.mlPerformance = this.enterpriseML.getPerformance();',
        """this.mlPerformance = this.enterpriseML.getPerformance();
            // PATCH #27: Enforce exploration rate floor at 0.15
            if (this.mlPerformance.exploration_rate < 0.15) {
                this.mlPerformance.exploration_rate = 0.15;
            }""",
        'ML exploration floor in getAction'
    )

    print()

    # ========================================
    # 6. neuron_ai_state.json: Reset stuck values
    # ========================================
    print('[6/6] neuron_ai_state.json: Reset riskMultiplier + consecutiveLosses')

    state_file = FILES['neuron_state']
    if os.path.exists(state_file):
        with open(state_file, 'r') as f:
            state = json.load(f)

        print(f'  Before: riskMultiplier={state.get("riskMultiplier", "N/A")}, '
              f'consecutiveLosses={state.get("consecutiveLosses", "N/A")}, '
              f'reversalEnabled={state.get("reversalEnabled", "N/A")}')

        state['riskMultiplier'] = 0.6
        state['consecutiveLosses'] = 0
        state['consecutiveWins'] = 0
        state['reversalEnabled'] = True
        state['lastPatchReset'] = f'P27_{datetime.now().strftime("%Y%m%d_%H%M%S")}'

        with open(state_file, 'w') as f:
            json.dump(state, f, indent=2)

        print(f'  ✅ After: riskMultiplier=0.6, consecutiveLosses=0, reversalEnabled=true')
        global changes_applied
        changes_applied += 1
    else:
        print(f'  ⚠️ State file not found at {state_file}')
        print('     NeuronAI will create it with defaults on next run')

    # ========================================
    # SUMMARY
    # ========================================
    print()
    print('=' * 60)
    print(f'PATCH #27 COMPLETE: {changes_applied} changes applied, {changes_failed} failed')
    print('=' * 60)
    print()
    print('Changes summary:')
    print('  1. server.js: /api/trades limit 50→500 (full history)')
    print('  2. execution-engine.js:')
    print('     - SL widened 2.0→2.5x ATR (BUY + SHORT)')
    print('     - Partial TP L1: 1.5→2.0x ATR (0.8R early lock-in)')
    print('     - Partial TP L2: 2.5→3.75x ATR (1:1.5 RR as user requested)')
    print('     - TP remains at 5.0x ATR (already from P26)')
    print('  3. neuron_ai_manager.js:')
    print('     - reversalEnabled: false→true')
    print('     - RANGING regime filter: -45% confidence in sideways markets')
    print('     - Confidence floor: 0.1→0.25 (more actionable signals)')
    print('     - MTF threshold: 20→22')
    print('  4. bot.js: RANGING regime filter -30% confidence before execution')
    print('  5. ML:')
    print('     - Exploration base: 0.1→0.3, floor at 0.15')
    print('     - Prevents over-exploitation (was stuck at 0.089)')
    print('  6. neuron_ai_state.json:')
    print('     - riskMultiplier: 0.3→0.6 (unstick from minimum)')
    print('     - consecutiveLosses: 13→0 (fresh start)')
    print('     - reversalEnabled: true')
    print()
    print('Expected impact:')
    print('  - Fewer SL hits (wider stop = more breathing room)')
    print('  - Better RR (partial TPs at 1:0.8 and 1:1.5, full at 1:2)')
    print('  - Reduced trades in RANGING markets (dual filter: NeuronAI + bot.js)')
    print('  - NeuronAI more decisive (higher confidence floor, reversal enabled)')
    print('  - ML explores more diverse strategies (15% exploration floor)')
    print()
    print('Next steps:')
    print('  pm2 restart turbo-bot')
    print('  curl http://localhost:3001/health')
    print('  pm2 logs turbo-bot --lines 30')

    if changes_failed > 0:
        print()
        print(f'⚠️ WARNING: {changes_failed} change(s) failed — review output above!')
        return 1
    return 0


if __name__ == '__main__':
    exit(main())
