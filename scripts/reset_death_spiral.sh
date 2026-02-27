#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# PATCH #39F: Reset Death Spiral State
# Resets the poisoned meta_state.json that locks bot in permanent HOLD
# Run on VPS: bash /root/turbo-bot/scripts/reset_death_spiral.sh
# ═══════════════════════════════════════════════════════════════════

META_STATE="/root/turbo-bot/data/ai_models/meta_state.json"

echo "═══════════════════════════════════════════════════════"
echo " PATCH #39F: Reset Death Spiral State"
echo "═══════════════════════════════════════════════════════"

if [ ! -f "$META_STATE" ]; then
    echo "[WARN] meta_state.json not found at $META_STATE"
    echo "[INFO] Bot will start with fresh state"
    exit 0
fi

# Backup current state
BACKUP="${META_STATE}.bak-$(date +%Y%m%d_%H%M%S)"
cp "$META_STATE" "$BACKUP"
echo "[OK] Backup: $BACKUP"

# Show current poisoned state
echo ""
echo "[CURRENT STATE]"
python3 -c "
import json
with open('$META_STATE') as f:
    state = json.load(f)
print(f'  defenseMode:       {state.get(\"defenseMode\", \"N/A\")}')
print(f'  consecutiveLosses: {state.get(\"consecutiveLosses\", \"N/A\")}')
print(f'  consecutiveWins:   {state.get(\"consecutiveWins\", \"N/A\")}')
ec = state.get('evolvedConfig', {})
print(f'  confidenceThres:   {ec.get(\"confidenceThreshold\", \"N/A\")}')
print(f'  aggressionLevel:   {ec.get(\"aggressionLevel\", \"N/A\")}')
print(f'  riskPerTrade:      {ec.get(\"riskPerTrade\", \"N/A\")}')
print(f'  maxDrawdownTol:    {ec.get(\"maxDrawdownTolerance\", \"N/A\")}')
" 2>/dev/null || echo "  (python3 not available, skipping state display)"

# Reset poisoned fields
echo ""
echo "[RESETTING]"
python3 -c "
import json
with open('$META_STATE') as f:
    state = json.load(f)

# Reset defense mode and loss counters
state['defenseMode'] = False
state['consecutiveLosses'] = 0
state['consecutiveWins'] = 0

# Reset evolved config to healthy defaults
if 'evolvedConfig' in state:
    state['evolvedConfig']['confidenceThreshold'] = 0.35
    state['evolvedConfig']['aggressionLevel'] = 1.0
    state['evolvedConfig']['riskPerTrade'] = 0.015
    state['evolvedConfig']['maxDrawdownTolerance'] = 0.12
    state['evolvedConfig']['reversalEnabled'] = True

with open('$META_STATE', 'w') as f:
    json.dump(state, f, indent=2)

print('  defenseMode       → False')
print('  consecutiveLosses → 0')
print('  consecutiveWins   → 0')
print('  confidenceThres   → 0.35')
print('  aggressionLevel   → 1.0')
print('  riskPerTrade      → 0.015')
print('  maxDrawdownTol    → 0.12')
" 2>/dev/null

if [ $? -eq 0 ]; then
    echo ""
    echo "[OK] State reset complete!"
    echo ""
    echo "NEXT STEPS:"
    echo "  1. Deploy updated code: cd /root/turbo-bot && git pull"
    echo "  2. Restart bot: pm2 restart all"
    echo "  3. Monitor logs: pm2 logs turbo-bot --lines 30"
    echo ""
    echo "Look for these log lines confirming patches work:"
    echo '  [SKYNET] State restored: defense=false, aggression=1.00'
    echo '  [SKYNET STARVATION] DEFENSE DEADLOCK BREAK'
    echo '  [SKYNET DEFENSE] BUY ALLOWED despite defense mode'
else
    echo "[ERROR] Reset failed — manually edit $META_STATE"
fi
