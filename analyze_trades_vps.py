import json, sys

with open("/tmp/trades.json") as f:
    data = json.load(f)

trades = data if isinstance(data, list) else data.get("trades", data.get("data", []))
print(f"Total trades: {len(trades)}")

if not trades:
    print("NO TRADES FOUND")
    sys.exit(0)

print(f"Keys: {list(trades[0].keys())}")
print("\n--- LAST 3 SAMPLE TRADES ---")
for t in trades[-3:]:
    print(json.dumps(t, indent=2))

# === FULL ANALYSIS ===
wins = 0
losses = 0
neutral = 0
total_pnl = 0
pnls = []
fee_kills = 0
sides = {}
reasons = {}
confidences = []
sizes = []
hold_times = []
strategies_pnl = {}

for t in trades:
    side = t.get("side", t.get("action", t.get("type", "?")))
    pnl = float(t.get("pnl", t.get("realizedPnl", t.get("profit", 0))) or 0)
    price = float(t.get("price", t.get("entryPrice", 0)) or 0)
    qty = float(t.get("quantity", t.get("size", t.get("amount", 0))) or 0)
    conf = float(t.get("confidence", 0) or 0)
    reason = str(t.get("reason", t.get("closeReason", t.get("strategy", ""))))
    hold = t.get("holdTime", t.get("duration", 0))
    strat = str(t.get("strategy", t.get("source", "")))
    
    total_pnl += pnl
    pnls.append(pnl)
    if pnl > 0: wins += 1
    elif pnl < 0: losses += 1
    else: neutral += 1
    if 0 < abs(pnl) < 3: fee_kills += 1
    
    sides[str(side)] = sides.get(str(side), 0) + 1
    if reason: reasons[reason] = reasons.get(reason, 0) + 1
    if conf > 0: confidences.append(conf)
    if qty > 0: sizes.append(qty * price if price > 0 else qty)
    if hold and isinstance(hold, (int, float)) and hold > 0:
        hold_times.append(float(hold))
    
    if strat:
        if strat not in strategies_pnl:
            strategies_pnl[strat] = {"pnl": 0, "count": 0, "wins": 0, "losses": 0}
        strategies_pnl[strat]["pnl"] += pnl
        strategies_pnl[strat]["count"] += 1
        if pnl > 0: strategies_pnl[strat]["wins"] += 1
        elif pnl < 0: strategies_pnl[strat]["losses"] += 1

print(f"\n{'='*60}")
print(f"COMPREHENSIVE TRADE ANALYSIS")
print(f"{'='*60}")
print(f"Wins: {wins} | Losses: {losses} | Neutral: {neutral}")
print(f"Win Rate: {wins/max(1,wins+losses)*100:.1f}%")
print(f"Total PnL: ${total_pnl:.2f}")
print(f"Avg PnL/trade: ${total_pnl/max(1,len(trades)):.4f}")
print(f"Fee-killed trades (|pnl|<$3): {fee_kills} ({fee_kills/max(1,len(trades))*100:.1f}%)")

pos_pnls = [p for p in pnls if p > 0]
neg_pnls = [p for p in pnls if p < 0]
if pos_pnls:
    print(f"\nAvg Win: ${sum(pos_pnls)/len(pos_pnls):.4f} | Max Win: ${max(pos_pnls):.4f} | Median Win: ${sorted(pos_pnls)[len(pos_pnls)//2]:.4f}")
if neg_pnls:
    print(f"Avg Loss: ${sum(neg_pnls)/len(neg_pnls):.4f} | Max Loss: ${min(neg_pnls):.4f} | Median Loss: ${sorted(neg_pnls)[len(neg_pnls)//2]:.4f}")
if pos_pnls and neg_pnls:
    avg_win = sum(pos_pnls)/len(pos_pnls)
    avg_loss = abs(sum(neg_pnls)/len(neg_pnls))
    rr = avg_win / avg_loss if avg_loss > 0 else 999
    wr = wins/max(1,wins+losses)
    expectancy = wr * avg_win - (1-wr) * avg_loss
    print(f"Reward/Risk Ratio: {rr:.3f}")
    print(f"Expectancy per trade: ${expectancy:.4f}")
    print(f"Edge (expectancy/avg_loss): {expectancy/avg_loss*100:.2f}%")

print(f"\nSides: {sides}")

print(f"\n--- CLOSE REASONS ---")
for r, c in sorted(reasons.items(), key=lambda x: -x[1])[:20]:
    print(f"  {r}: {c}")

if confidences:
    print(f"\n--- CONFIDENCE DISTRIBUTION ---")
    print(f"Avg: {sum(confidences)/len(confidences):.4f} | Min: {min(confidences):.4f} | Max: {max(confidences):.4f}")
    buckets = [(0,0.3),(0.3,0.5),(0.5,0.6),(0.6,0.7),(0.7,0.8),(0.8,1.01)]
    for lo, hi in buckets:
        cnt = sum(1 for c in confidences if lo <= c < hi)
        print(f"  [{lo:.1f}-{hi:.1f}): {cnt} ({cnt/len(confidences)*100:.1f}%)")

if sizes:
    print(f"\n--- POSITION SIZES (USD) ---")
    print(f"Avg: ${sum(sizes)/len(sizes):.2f} | Min: ${min(sizes):.2f} | Max: ${max(sizes):.2f}")
    small = sum(1 for s in sizes if s < 50)
    print(f"Micro positions (<$50): {small} ({small/len(sizes)*100:.1f}%)")

if hold_times:
    avg_h = sum(hold_times)/len(hold_times)
    print(f"\n--- HOLD TIMES ---")
    print(f"Avg: {avg_h:.0f}ms ({avg_h/60000:.1f}min) | Min: {min(hold_times):.0f}ms | Max: {max(hold_times):.0f}ms ({max(hold_times)/3600000:.1f}h)")
    short = sum(1 for h in hold_times if h < 120000)
    print(f"Ultra-short (<2min): {short} ({short/len(hold_times)*100:.1f}%)")

if strategies_pnl:
    print(f"\n--- PNL BY STRATEGY ---")
    for s, d in sorted(strategies_pnl.items(), key=lambda x: -x[1]["pnl"]):
        wr = d["wins"]/max(1,d["wins"]+d["losses"])*100
        print(f"  {s}: PnL=${d['pnl']:+.2f} | Trades={d['count']} | WR={wr:.0f}%")

print(f"\n--- LAST 40 TRADES ---")
for t in trades[-40:]:
    side = t.get("side", t.get("action", "?"))
    pnl = float(t.get("pnl", t.get("realizedPnl", t.get("profit", 0))) or 0)
    price = t.get("price", t.get("entryPrice", 0))
    qty = t.get("quantity", t.get("size", t.get("amount", 0)))
    conf = t.get("confidence", 0)
    reason = t.get("reason", t.get("closeReason", t.get("strategy", "")))
    hold = t.get("holdTime", t.get("duration", ""))
    sl = t.get("sl", t.get("stopLoss", ""))
    tp = t.get("tp", t.get("takeProfit", ""))
    ts = str(t.get("timestamp", t.get("time", "")))
    marker = "W" if pnl > 0 else ("L" if pnl < 0 else "-")
    print(f"[{marker}] {ts[-19:]} {str(side):5s} pnl=${pnl:+10.4f} conf={conf} qty={qty} SL={sl} TP={tp} hold={hold} | {reason}")

# Streak analysis
print(f"\n--- STREAK ANALYSIS ---")
max_ws = 0; max_ls = 0; cs = 0; ct = None
for p in pnls:
    if p > 0:
        if ct == "W": cs += 1
        else: cs = 1; ct = "W"
        max_ws = max(max_ws, cs)
    elif p < 0:
        if ct == "L": cs += 1
        else: cs = 1; ct = "L"
        max_ls = max(max_ls, cs)
print(f"Max Win Streak: {max_ws} | Max Loss Streak: {max_ls}")

# PnL by 50-trade buckets
print(f"\n--- PNL BY 50-TRADE BUCKETS ---")
for i in range(0, len(pnls), 50):
    bucket = pnls[i:i+50]
    bw = sum(1 for p in bucket if p > 0)
    bl = sum(1 for p in bucket if p < 0)
    bp = sum(bucket)
    fk = sum(1 for p in bucket if 0 < abs(p) < 3)
    print(f"Trades {i+1:>4}-{i+len(bucket):>4}: PnL=${bp:+10.2f} W={bw:>2} L={bl:>2} WR={bw/max(1,bw+bl)*100:>4.0f}% FeeKill={fk}")

# Time-based analysis
print(f"\n--- TIME ANALYSIS ---")
hours = {}
for t in trades:
    ts = str(t.get("timestamp", t.get("time", "")))
    pnl = float(t.get("pnl", t.get("realizedPnl", t.get("profit", 0))) or 0)
    try:
        if "T" in ts:
            h = int(ts.split("T")[1][:2])
        elif len(ts) > 10:
            h = int(ts[11:13])
        else:
            continue
        if h not in hours: hours[h] = {"pnl": 0, "count": 0, "wins": 0}
        hours[h]["pnl"] += pnl
        hours[h]["count"] += 1
        if pnl > 0: hours[h]["wins"] += 1
    except: pass

if hours:
    for h in sorted(hours.keys()):
        d = hours[h]
        wr = d["wins"]/max(1,d["count"])*100
        print(f"  Hour {h:02d}: PnL=${d['pnl']:+8.2f} | Trades={d['count']:>3} | WR={wr:.0f}%")
