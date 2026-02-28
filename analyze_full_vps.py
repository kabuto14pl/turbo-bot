import json, sys
from datetime import datetime

with open('/tmp/trades.json') as f:
    data = json.load(f)

trades = data if isinstance(data, list) else data.get('trades', data.get('data', []))
print('Total trades:', len(trades))

if not trades:
    print('NO TRADES FOUND')
    sys.exit(0)

wins = 0; losses = 0; neutral = 0; total_pnl = 0; total_fees = 0
pnls = []; fee_kills = 0; sides = {}; strategies_pnl = {}
sizes_usd = []; fee_list = []; gross_pnls = []; price_moves = []

for t in trades:
    side = t.get('action', '?')
    pnl = float(t.get('pnl', 0) or 0)
    price = float(t.get('price', 0) or 0)
    entry = float(t.get('entryPrice', 0) or 0)
    qty = float(t.get('quantity', 0) or 0)
    fees = float(t.get('fees', 0) or 0)
    strat = t.get('strategy', '')

    total_pnl += pnl
    total_fees += fees
    pnls.append(pnl)
    fee_list.append(fees)
    gross = pnl + fees
    gross_pnls.append(gross)

    if pnl > 0: wins += 1
    elif pnl < 0: losses += 1
    else: neutral += 1

    if 0 < abs(pnl) < 3: fee_kills += 1
    sides[side] = sides.get(side, 0) + 1

    if strat:
        if strat not in strategies_pnl:
            strategies_pnl[strat] = {'pnl': 0, 'gross': 0, 'fees': 0, 'count': 0, 'wins': 0, 'losses': 0}
        strategies_pnl[strat]['pnl'] += pnl
        strategies_pnl[strat]['gross'] += gross
        strategies_pnl[strat]['fees'] += fees
        strategies_pnl[strat]['count'] += 1
        if pnl > 0: strategies_pnl[strat]['wins'] += 1
        elif pnl < 0: strategies_pnl[strat]['losses'] += 1

    size_usd = qty * price if price > 0 else 0
    if size_usd > 0: sizes_usd.append(size_usd)

    if entry > 0 and price > 0 and side in ('SELL','BUY'):
        move_pct = abs(price - entry) / entry * 100
        price_moves.append(move_pct)

SEP = '=' * 70
print()
print(SEP)
print('COMPREHENSIVE TRADE ANALYSIS - TURBO-BOT')
print(SEP)

print('\n--- CORE METRICS ---')
print('Total Trades:', len(trades))
print('Wins:', wins, '| Losses:', losses, '| Neutral:', neutral)
wr = wins/max(1,wins+losses)*100
print('Win Rate: %.1f%%' % wr)
print('Total Net PnL: $%.2f' % total_pnl)
print('Total Fees Paid: $%.2f' % total_fees)
print('Total Gross PnL (before fees): $%.2f' % sum(gross_pnls))
print('Avg Net PnL/trade: $%.4f' % (total_pnl/max(1,len(trades))))
print('Avg Fee/trade: $%.4f' % (total_fees/max(1,len(trades))))
print('Fee-killed trades (|net pnl|<$3): %d (%.1f%%)' % (fee_kills, fee_kills/max(1,len(trades))*100))

gross_wins = sum(1 for g in gross_pnls if g > 0)
print('\nGross Win Rate (before fees): %.1f%%' % (gross_wins/max(1,len(trades))*100))
print('Fee Impact: %d trades turned from profit to loss by fees' % (gross_wins - wins))

pos_pnls = [p for p in pnls if p > 0]
neg_pnls = [p for p in pnls if p < 0]
if pos_pnls:
    print('\nAvg Win: $%.4f | Max Win: $%.4f | Median: $%.4f' % (sum(pos_pnls)/len(pos_pnls), max(pos_pnls), sorted(pos_pnls)[len(pos_pnls)//2]))
if neg_pnls:
    print('Avg Loss: $%.4f | Max Loss: $%.4f | Median: $%.4f' % (sum(neg_pnls)/len(neg_pnls), min(neg_pnls), sorted(neg_pnls)[len(neg_pnls)//2]))
if pos_pnls and neg_pnls:
    avg_win = sum(pos_pnls)/len(pos_pnls)
    avg_loss_val = abs(sum(neg_pnls)/len(neg_pnls))
    rr = avg_win / avg_loss_val if avg_loss_val > 0 else 999
    wr_dec = wins/max(1,wins+losses)
    expectancy = wr_dec * avg_win - (1-wr_dec) * avg_loss_val
    pf = sum(pos_pnls) / abs(sum(neg_pnls))
    print('Reward/Risk Ratio: %.3f' % rr)
    print('Expectancy per trade: $%.4f' % expectancy)
    print('Profit Factor: %.3f' % pf)

print('\nSides breakdown:', sides)

if price_moves:
    print('\n--- PRICE MOVE ANALYSIS ---')
    avg_mv = sum(price_moves)/len(price_moves)
    print('Avg move at close: %.4f%%' % avg_mv)
    print('Median move: %.4f%%' % sorted(price_moves)[len(price_moves)//2])
    tiny = sum(1 for m in price_moves if m < 0.1)
    small = sum(1 for m in price_moves if m < 0.2)
    medium = sum(1 for m in price_moves if m < 0.5)
    print('Tiny moves (<0.1%%): %d (%.1f%%)' % (tiny, tiny/len(price_moves)*100))
    print('Small moves (<0.2%%): %d (%.1f%%)' % (small, small/len(price_moves)*100))
    print('Sub-fee moves (<0.5%%): %d (%.1f%%)' % (medium, medium/len(price_moves)*100))

if sizes_usd:
    print('\n--- POSITION SIZES (USD) ---')
    print('Avg: $%.2f | Min: $%.2f | Max: $%.2f' % (sum(sizes_usd)/len(sizes_usd), min(sizes_usd), max(sizes_usd)))
    micro = sum(1 for s in sizes_usd if s < 100)
    small_s = sum(1 for s in sizes_usd if s < 500)
    print('Micro (<$100): %d (%.1f%%)' % (micro, micro/len(sizes_usd)*100))
    print('Small (<$500): %d (%.1f%%)' % (small_s, small_s/len(sizes_usd)*100))

print('\n--- PNL BY STRATEGY ---')
for s, d in sorted(strategies_pnl.items(), key=lambda x: -x[1]['count']):
    wr_s = d['wins']/max(1,d['wins']+d['losses'])*100
    avg_s = d['pnl']/max(1,d['count'])
    print('  %-25s: Net=$%+10.2f Gross=$%+10.2f Fees=$%8.2f N=%4d WR=%5.1f%% Avg=$%+.4f' % (s, d['pnl'], d['gross'], d['fees'], d['count'], wr_s, avg_s))

# Consecutive analysis
print('\n--- TRADE FLOW ---')
opens = [t for t in trades if t.get('action') in ('BUY', 'LONG', 'SHORT')]
closes = [t for t in trades if t.get('action') in ('SELL',)]
print('Opens (BUY/LONG/SHORT):', len(opens), '| Closes (SELL):', len(closes))

# Check for scalping
if len(trades) >= 2:
    time_gaps = []
    for i in range(1, len(trades)):
        t1 = trades[i-1].get('timestamp', 0)
        t2 = trades[i].get('timestamp', 0)
        if t1 and t2:
            gap = abs(t2 - t1)
            time_gaps.append(gap)
    if time_gaps:
        avg_gap = sum(time_gaps)/len(time_gaps)
        print('Avg time between trades: %.1f min' % (avg_gap/60000))
        rapid = sum(1 for g in time_gaps if g < 60000)
        print('Rapid trades (<1min apart): %d (%.1f%%)' % (rapid, rapid/len(time_gaps)*100))
        very_rapid = sum(1 for g in time_gaps if g < 30000)
        print('Ultra-rapid (<30s apart): %d (%.1f%%)' % (very_rapid, very_rapid/len(time_gaps)*100))

# Trade pairs (open-close with hold time)
print('\n--- HOLD TIME ANALYSIS ---')
pairs = []
open_trades = {}
for t in trades:
    action = t.get('action', '')
    ts = t.get('timestamp', 0)
    pnl = float(t.get('pnl', 0) or 0)
    if action in ('BUY', 'LONG', 'SHORT'):
        open_trades[t.get('symbol', 'BTC')] = ts
    elif action == 'SELL' and t.get('symbol', 'BTC') in open_trades:
        open_ts = open_trades.pop(t.get('symbol', 'BTC'))
        if open_ts and ts:
            hold_ms = ts - open_ts
            if hold_ms > 0:
                pairs.append((hold_ms, pnl))

if pairs:
    holds = [p[0] for p in pairs]
    avg_hold = sum(holds)/len(holds)
    print('Avg hold time: %.1f min (%.1f hours)' % (avg_hold/60000, avg_hold/3600000))
    print('Min hold: %.1f min | Max hold: %.1f hours' % (min(holds)/60000, max(holds)/3600000))
    ultra_short = sum(1 for h in holds if h < 120000)
    short_h = sum(1 for h in holds if h < 600000)
    print('Ultra-short (<2min): %d (%.1f%%)' % (ultra_short, ultra_short/len(holds)*100))
    print('Short (<10min): %d (%.1f%%)' % (short_h, short_h/len(holds)*100))

    # PnL by hold time bucket
    print('\nPnL by hold duration:')
    buckets = [(0, 120000, '<2min'), (120000, 600000, '2-10min'), (600000, 1800000, '10-30min'), (1800000, 3600000, '30m-1h'), (3600000, 86400000, '1h-24h'), (86400000, 999999999999, '>24h')]
    for lo, hi, label in buckets:
        bp = [(h, p) for h, p in pairs if lo <= h < hi]
        if bp:
            bpnl = sum(p for _, p in bp)
            bw = sum(1 for _, p in bp if p > 0)
            print('  %8s: N=%3d Net=$%+8.2f WR=%.0f%%' % (label, len(bp), bpnl, bw/len(bp)*100))

# Streak
print('\n--- STREAK ANALYSIS ---')
max_ws = 0; max_ls = 0; cs = 0; ct = None
for p in pnls:
    if p > 0:
        if ct == 'W': cs += 1
        else: cs = 1; ct = 'W'
        max_ws = max(max_ws, cs)
    elif p < 0:
        if ct == 'L': cs += 1
        else: cs = 1; ct = 'L'
        max_ls = max(max_ls, cs)
print('Max Win Streak:', max_ws, '| Max Loss Streak:', max_ls)

# PnL buckets
print('\n--- PNL BY 50-TRADE BUCKETS ---')
for i in range(0, len(pnls), 50):
    bucket = pnls[i:i+50]
    bfees = fee_list[i:i+50]
    bw = sum(1 for p in bucket if p > 0)
    bl = sum(1 for p in bucket if p < 0)
    bp = sum(bucket)
    bf = sum(bfees)
    fk = sum(1 for p in bucket if 0 < abs(p) < 3)
    print('Trades %4d-%4d: Net=$%+10.2f Fees=$%8.2f W=%2d L=%2d WR=%4.0f%% FeeKill=%d' % (i+1, i+len(bucket), bp, bf, bw, bl, bw/max(1,bw+bl)*100, fk))

# Hourly
print('\n--- HOURLY ANALYSIS (UTC) ---')
hours = {}
for t in trades:
    ts = t.get('timestamp', 0)
    pnl = float(t.get('pnl', 0) or 0)
    if ts:
        try:
            dt = datetime.utcfromtimestamp(ts/1000)
            h = dt.hour
            if h not in hours: hours[h] = {'pnl': 0, 'count': 0, 'wins': 0, 'fees': 0}
            hours[h]['pnl'] += pnl
            hours[h]['count'] += 1
            hours[h]['fees'] += float(t.get('fees', 0) or 0)
            if pnl > 0: hours[h]['wins'] += 1
        except: pass
    pass

for h in sorted(hours.keys()):
    d = hours[h]
    hwr = d['wins']/max(1,d['count'])*100
    print('  %02d:00 UTC: Net=$%+8.2f Fees=$%6.2f N=%3d WR=%.0f%%' % (h, d['pnl'], d['fees'], d['count'], hwr))

# LAST 30 TRADES
print('\n--- LAST 30 TRADES ---')
for t in trades[-30:]:
    action = t.get('action', '?')
    pnl = float(t.get('pnl', 0) or 0)
    price = float(t.get('price', 0) or 0)
    entry = float(t.get('entryPrice', 0) or 0)
    qty = float(t.get('quantity', 0) or 0)
    fees = float(t.get('fees', 0) or 0)
    strat = t.get('strategy', '')
    ts = t.get('timestamp', 0)
    dt_str = datetime.utcfromtimestamp(ts/1000).strftime('%m-%d %H:%M') if ts else '?'
    move = abs(price-entry)/entry*100 if entry > 0 and price > 0 else 0
    marker = 'W' if pnl > 0 else ('L' if pnl < 0 else '-')
    size_usd = qty*price if qty>0 and price>0 else 0
    print('[%s] %s %5s $%+8.2f fee=$%.2f sz=$%.0f move=%.3f%% | %s' % (marker, dt_str, action, pnl, fees, size_usd, move, strat))

# CRITICAL DIAGNOSIS
print()
print(SEP)
print('CRITICAL DIAGNOSIS')
print(SEP)

issues = []
if fee_kills/max(1,len(trades)) > 0.3:
    issues.append('CRITICAL: %.0f%% trades fee-killed (profit < fees)' % (fee_kills/len(trades)*100))
if total_fees > abs(total_pnl) * 0.5:
    issues.append('CRITICAL: Fees ($%.2f) consume massive portion of activity' % total_fees)
if price_moves and sum(price_moves)/len(price_moves) < 0.3:
    issues.append('CRITICAL: Avg price move %.3f%% is below fee threshold' % (sum(price_moves)/len(price_moves)))
if sizes_usd and sum(sizes_usd)/len(sizes_usd) < 500:
    issues.append('WARNING: Avg position $%.0f might be too small' % (sum(sizes_usd)/len(sizes_usd)))
if wr < 40:
    issues.append('WARNING: Win rate %.1f%% is below breakeven for most RR ratios' % wr)
if pos_pnls and neg_pnls:
    if sum(pos_pnls)/len(pos_pnls) < abs(sum(neg_pnls)/len(neg_pnls)):
        issues.append('CRITICAL: Avg win ($%.2f) < Avg loss ($%.2f) - negative edge' % (sum(pos_pnls)/len(pos_pnls), abs(sum(neg_pnls)/len(neg_pnls))))
    rr_val = (sum(pos_pnls)/len(pos_pnls)) / abs(sum(neg_pnls)/len(neg_pnls))
    if rr_val < 1.5:
        issues.append('WARNING: R:R ratio %.2f is too low for %.0f%% win rate' % (rr_val, wr))

# Fee vs PnL check
if total_fees > 0 and total_pnl < 0:
    gross_total = sum(gross_pnls)
    if gross_total > 0:
        issues.append('CRITICAL: System is GROSS PROFITABLE ($%.2f) but FEES ($%.2f) erase all profits!' % (gross_total, total_fees))

for issue in issues:
    print('  >> ' + issue)

if not issues:
    print('  No critical issues detected')
