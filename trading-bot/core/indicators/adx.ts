/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
export function calculateADX(highs: number[], lows: number[], closes: number[], period = 14): (number | null)[] {
    if (highs.length < period * 2) {
        return new Array(highs.length).fill(null);
    }

    const plusDM: number[] = [];
    const minusDM: number[] = [];
    const tr: number[] = [];

    for (let i = 1; i < highs.length; i++) {
        const upMove = highs[i] - highs[i - 1];
        const downMove = lows[i - 1] - lows[i];

        plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
        minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

        const tr1 = highs[i] - lows[i];
        const tr2 = Math.abs(highs[i] - closes[i - 1]);
        const tr3 = Math.abs(lows[i] - closes[i - 1]);
        tr.push(Math.max(tr1, tr2, tr3));
    }

    const smooth = (data: number[], p: number): number[] => {
        const smoothed = new Array(data.length).fill(0);
        let sum = 0;
        for (let i = 0; i < p; i++) {
            sum += data[i];
        }
        smoothed[p - 1] = sum;

        for (let i = p; i < data.length; i++) {
            smoothed[i] = smoothed[i - 1] - (smoothed[i - 1] / p) + data[i];
        }
        return smoothed;
    };

    const smoothedTR = smooth(tr, period);
    const smoothedPlusDM = smooth(plusDM, period);
    const smoothedMinusDM = smooth(minusDM, period);

    const plusDI: (number | null)[] = [];
    const minusDI: (number | null)[] = [];

    for (let i = 0; i < highs.length; i++) {
        if (i < period) {
            plusDI.push(null);
            minusDI.push(null);
            continue;
        }
        const sTR = smoothedTR[i - 1];
        const sPlusDM = smoothedPlusDM[i - 1];
        const sMinusDM = smoothedMinusDM[i - 1];

        plusDI.push(sTR > 0 ? (100 * sPlusDM / sTR) : 0);
        minusDI.push(sTR > 0 ? (100 * sMinusDM / sTR) : 0);
    }

    const dx: (number | null)[] = [];
    for (let i = 0; i < highs.length; i++) {
        if (i < period) {
            dx.push(null);
            continue;
        }
        const pDI = plusDI[i];
        const mDI = minusDI[i];
        if (pDI === null || mDI === null) {
            dx.push(null);
            continue;
        }
        const sumDI = pDI + mDI;
        dx.push(sumDI > 0 ? 100 * Math.abs(pDI - mDI) / sumDI : 0);
    }

    const adx: (number | null)[] = new Array(highs.length).fill(null);
    let adxSum = 0;
    let dxCount = 0;

    for (let i = period; i < period * 2 -1; i++) {
        if (dx[i] !== null) {
            adxSum += dx[i]!;
            dxCount++;
        }
    }

    if (dxCount > 0) {
        adx[period * 2 - 2] = adxSum / dxCount;
    }

    for (let i = period * 2 - 1; i < highs.length; i++) {
        const prevAdx = adx[i - 1];
        const currentDx = dx[i];
        if (prevAdx !== null && currentDx !== null) {
            adx[i] = (prevAdx * (period - 1) + currentDx) / period;
        } else {
            adx[i] = null;
        }
    }

    return adx;
}
