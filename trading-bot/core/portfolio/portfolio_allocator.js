"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortfolioAllocator = void 0;
class PortfolioAllocator {
    static allocate(input, mode = 'minimum_variance') {
        const { returns, volatility, correlations, window, timestamps } = input;
        const strategies = Object.keys(returns);
        const allocations = [];
        for (const ts of timestamps) {
            // Zbierz rolling metryki dla tego timestampu
            const vols = strategies.map(s => PortfolioAllocator._getMetricAt(volatility[s], ts) || 0.0001);
            // Rolling macierz korelacji
            const corrMatrix = strategies.map(a => strategies.map(b => a === b ? 1 : PortfolioAllocator._getMetricAt(correlations[a]?.[b] || [], ts) ?? 0));
            // Rolling macierz kowariancji
            const covMatrix = corrMatrix.map((row, i) => row.map((corr, j) => corr * vols[i] * vols[j]));
            let weights = [];
            if (mode === 'minimum_variance') {
                weights = PortfolioAllocator._minimumVarianceWeights(covMatrix);
            }
            else if (mode === 'risk_parity') {
                weights = PortfolioAllocator._riskParityWeights(covMatrix);
            }
            // Normalizacja i sanity check
            const sum = weights.reduce((a, b) => a + b, 0) || 1;
            const normWeights = weights.map(w => Math.max(0, w / sum));
            const wObj = {};
            strategies.forEach((s, i) => (wObj[s] = normWeights[i]));
            allocations.push({ timestamp: ts, weights: wObj });
        }
        return allocations;
    }
    // --- Minimum Variance Portfolio ---
    static _minimumVarianceWeights(cov) {
        // Rozwiązanie: w = inv(C) * 1 / (1' * inv(C) * 1)
        const n = cov.length;
        if (n === 0)
            return [];
        const ones = Array(n).fill(1);
        const invCov = PortfolioAllocator._invertMatrix(cov);
        const numer = PortfolioAllocator._matVecMul(invCov, ones);
        const denom = PortfolioAllocator._dot(ones, numer);
        return numer.map(x => x / denom);
    }
    // --- Risk Parity Portfolio ---
    static _riskParityWeights(cov, tol = 1e-6, maxIter = 100) {
        // Algorytm iteracyjny (najprostszy):
        const n = cov.length;
        if (n === 0)
            return [];
        let w = Array(n).fill(1 / n);
        for (let iter = 0; iter < maxIter; iter++) {
            const portVar = PortfolioAllocator._quadForm(w, cov);
            const mrc = PortfolioAllocator._marginalRiskContributions(w, cov);
            const rc = w.map((wi, i) => wi * mrc[i]);
            const avgRC = rc.reduce((a, b) => a + b, 0) / n;
            const diff = rc.map(rci => rci - avgRC);
            if (diff.every(d => Math.abs(d) < tol))
                break;
            // Prosty update: w_i = w_i * avgRC / rc_i
            w = w.map((wi, i) => wi * (avgRC / (rc[i] || 1e-8)));
            // Renormalizacja
            const sum = w.reduce((a, b) => a + b, 0) || 1;
            w = w.map(wi => Math.max(0, wi / sum));
        }
        return w;
    }
    // --- Narzędzia matematyczne ---
    static _invertMatrix(mat) {
        // Prosta inwersja macierzy (tylko dla małych macierzy, n < 10)
        const n = mat.length;
        const I = Array(n)
            .fill(0)
            .map((_, i) => Array(n).fill(0).map((_, j) => (i === j ? 1 : 0)));
        // Gauss-Jordan
        const M = mat.map(row => [...row]);
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++)
                if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i]))
                    maxRow = k;
            [M[i], M[maxRow]] = [M[maxRow], M[i]];
            [I[i], I[maxRow]] = [I[maxRow], I[i]];
            const diag = M[i][i] || 1e-8;
            for (let j = 0; j < n; j++) {
                M[i][j] /= diag;
                I[i][j] /= diag;
            }
            for (let k = 0; k < n; k++) {
                if (k === i)
                    continue;
                const factor = M[k][i];
                for (let j = 0; j < n; j++) {
                    M[k][j] -= factor * M[i][j];
                    I[k][j] -= factor * I[i][j];
                }
            }
        }
        return I;
    }
    static _matVecMul(mat, vec) {
        return mat.map(row => row.reduce((sum, v, i) => sum + v * vec[i], 0));
    }
    static _dot(a, b) {
        return a.reduce((sum, v, i) => sum + v * b[i], 0);
    }
    static _quadForm(w, cov) {
        // w' * C * w
        return w.reduce((sum, wi, i) => sum + wi * cov[i].reduce((s, cij, j) => s + cij * w[j], 0), 0);
    }
    static _marginalRiskContributions(w, cov) {
        // C * w
        return cov.map(row => PortfolioAllocator._dot(row, w));
    }
    static _getMetricAt(arr, ts) {
        // Znajdź metrykę o danym timestampie
        return arr.find(x => x.timestamp === ts)?.value;
    }
}
exports.PortfolioAllocator = PortfolioAllocator;
