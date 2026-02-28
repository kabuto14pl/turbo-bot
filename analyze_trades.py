import sys, json

data = json.load(sys.stdin)
trades = data if isinstance(data, list) else data.get("trades", data.get("data", []))
print(f"Total trades: {len(trades)}")

wins = 0
losses = 0
total_pnl = 0
pnls = []
hold_times = []
sides = {"BUY": 0, "SELL": 0, "LONG": 0, "SHORT": 0}
reasons = {}
confidences = []
sizes = []
fee_kills = 0  # trades where |pnl| < $3 (fee range)

for t in trades:
    side = t.get("side", t.get("action", "?"))
    pnl = float(t.get("pnl", t.get("realizedPnl", t.get("profit", 0))) or 0)
    price = float(t.get("price", t.get("entryPrice", 0)) or 0)
    qty = float(t.get("quantity", t.get("size", t.get("amount", 0))) or 0)
    conf = float(t.get("confidence", 0) or 0)
    reason = t.get("reason", t.get("closeReason", t.get("strategy", "")))
    hold = t.get("holdTime", t.get("duration", 0))
    
    total_pnl += pnl
    pnls.append(pnl)
    if pnl > 0: wins += 1
    elif pnl < 0: losses += 1
    if abs(pnl) < 3 and abs(pnl) > 0: fee_kills += 1
    if side in sides: sides[side] += 1
    if reason:
        reasons[str(reason)] = reasons.get(str(reason), 0) + 1
    if conf > 0: confidences.append(conf)
    if qty > 0: sizes.append(qty * price if price > 0 else qty)
    if hold: hold_times.append(float(hold) if isinstance(hold, (int, float)) else 0)

print(f"\n=== SUMMARY ===")
print(f"Wins: {wins} | Losses: {losses} | Neutral: {len(trades)-wins-losses}")
print(f"Win Rate: {wins/max(1,wins+losses)*100:.1f}%")
print(f"Total PnL: ${total_pnl:.2f}")
print(f"Avg PnL/trade: ${total_pnl/max(1,len(trades)):.2f}")
print(f"Fee-killed trades (|pnl|<$3): {fee_kills} ({fee_kills/max(1,len(trades))*100:.1f}%)")

if pnls:
    pos_pnls = [p for p in pnls if p > 0]
    neg_pnls = [p for p in pnls if p < 0]
    if pos_pnls: print(f"Avg Win: ${sum(pos_pnls)/len(pos_pnls):.2f} | Max Win: ${max(pos_pnls):.2f}")
    if neg_pnls: print(f"Avg Loss: ${sum(neg_pnls)/len(neg_pnls):.2f} | Max Loss: ${min(neg_pnls):.2f}")
    if pos_pnls and neg_pnls:
        rr = abs(sum(pos_pnls)/len(pos_pnls)) / abs(sum(neg_pnls)/len(neg_pnls))
        print(f"Reward/Risk Ratio: {rr:.2f}")
        expectancy = (wins/max(1,wins+losses))*(sum(pos_pnls)/len(pos_pnls)) + (losses/max(1,wins+losses))*(sum(neg_pnls)/len(neg_pnls))
        print(f"Expectancy per trade: ${expectancy:.2f}")

print(f"\nSides: {sides}")
print(f"\n=== CLOSE REASONS ===")
for r, c in sorted(reasons.items(), key=lambda x: -x[1])[:15]:
    print(f"  {r}: {c}")

if confidences:
    print(f"\n=== CONFIDENCE ===")
    print(f"Avg: {sum(confidences)/len(confidences):.3f} | Min: {min(confidences):.3f} | Max: {max(confidences):.3f}")
    low_conf = [c for c in confidences if c < 0.5]
    print(f"Low confidence (<0.50): {len(low_conf)} ({len(low_conf)/len(confidences)*100:.1f}%)")

if sizes:
    print(f"\n=== POSITION SIZES ===")
    print(f"Avg: ${sum(sizes)/len(sizes):.2f} | Min: ${min(sizes):.2f} | Max: ${max(sizes):.2f}")

# Last 30 trades detail
print(f"\n=== LAST 30 TRADES ===")
for t in trades[-30:]:
    side = t.get("side", t.get("action", "?"))
    pnl = float(t.get("pnl", t.get("realizedPnl", t.get("profit", 0))) or 0)
    price = t.get("price", t.get("entryPrice", 0))
    qty = t.get("quantity", t.get("size", t.get("amount", 0)))
    conf = t.get("confidence", 0)
    reason = t.get("reason", t.get("closeReason", t.get("strategy", "")))
    hold = t.get("holdTime", t.get("duration", ""))
    ts = str(t.get("timestamp", t.get("time", "")))[-19:]
    marker = "W" if pnl > 0 else ("L" if pnl < 0 else "-")
    print(f"[{marker}] {ts} {side:5s} pnl=${pnl:+8.2f} conf={conf} qty={qty} hold={hold} | {reason}")

# Streak analysis
print(f"\n=== STREAK ANALYSIS ===")
max_win_streak = 0
max_loss_streak = 0
curr_streak = 0
streak_type = None
for p in pnls:
    if p > 0:
        if streak_type == "W": curr_streak += 1
        else: curr_streak = 1; streak_type = "W"
        max_win_streak = max(max_win_streak, curr_streak)
    elif p < 0:
        if streak_type == "L": curr_streak += 1
        else: curr_streak = 1; streak_type = "L"
        max_loss_streak = max(max_loss_streak, curr_streak)
print(f"Max Win Streak: {max_win_streak} | Max Loss Streak: {max_loss_streak}")

# PnL by 50-trade buckets
print(f"\n=== PNL BY 50-TRADE BUCKETS ===")
for i in range(0, len(pnls), 50):
    bucket = pnls[i:i+50]
    bw = sum(1 for p in bucket if p > 0)
    bl = sum(1 for p in bucket if p < 0)
    bp = sum(bucket)
    print(f"Trades {i+1}-{i+len(bucket)}: PnL=${bp:+.2f} W={bw} L={bl} WR={bw/max(1,bw+bl)*100:.0f}%")
