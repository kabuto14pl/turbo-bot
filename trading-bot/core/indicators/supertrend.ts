export interface SuperTrendOutput {
    value: number;
    direction: 'buy' | 'sell';
}

export function calculateSuperTrend(
    highs: number[], 
    lows: number[], 
    closes: number[], 
    period = 10, 
    multiplier = 3
): SuperTrendOutput[] {
    const atr: number[] = [];
    const supertrendResult: SuperTrendOutput[] = [];
    
    // Calculate ATR
    let trs: number[] = [];
    for (let i = 1; i < closes.length; i++) {
        trs.push(Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        ));
    }
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += trs[i];
    }
    atr[period] = sum / period;
    for (let i = period + 1; i < trs.length; i++) {
        atr[i] = (atr[i - 1] * (period - 1) + trs[i]) / period;
    }

    // Calculate SuperTrend
    let upperBand: number[] = [];
    let lowerBand: number[] = [];
    for (let i = 0; i < closes.length; i++) {
        upperBand[i] = ((highs[i] + lows[i]) / 2) + multiplier * (atr[i] || 0);
        lowerBand[i] = ((highs[i] + lows[i]) / 2) - multiplier * (atr[i] || 0);
    }

    let inUptrend = true;
    for (let i = 0; i < closes.length; i++) {
        if (i === 0) {
            supertrendResult[i] = { value: 0, direction: 'buy' };
            continue;
        }

        const prevUpperBand = upperBand[i - 1];
        const prevLowerBand = lowerBand[i - 1];
        
        if (closes[i] > prevUpperBand) {
            inUptrend = true;
        } else if (closes[i] < prevLowerBand) {
            inUptrend = false;
        }
        
        // Update bands to prevent them from decreasing in uptrend and increasing in downtrend
        if (inUptrend) {
            lowerBand[i] = Math.max(lowerBand[i], prevLowerBand || -Infinity);
        } else {
            upperBand[i] = Math.min(upperBand[i], prevUpperBand || Infinity);
        }

        supertrendResult[i] = {
            value: inUptrend ? lowerBand[i] : upperBand[i],
            direction: inUptrend ? 'buy' : 'sell'
        };
    }
    
    return supertrendResult;
}
