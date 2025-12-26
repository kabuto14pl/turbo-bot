// ⚡ QUICK TEST - Użyj Code Runner (Ctrl+Alt+N)
// Kliknij prawym na plik → Run Code LUB naciśnij Ctrl+Alt+N

// Test 1: Sprawdź kalkulację Kelly Criterion
function kellyRatio(winRate: number, winLoss: number): number {
    return winRate - ((1 - winRate) / winLoss);
}

const kelly = kellyRatio(0.6, 1.5);
console.log('Kelly Criterion:', kelly); // Powinno pokazać ~0.27

// Test 2: Sprawdź obliczanie Sharpe Ratio
function sharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const std = Math.sqrt(
        returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    return (avgReturn - riskFreeRate) / std;
}

const testReturns = [0.05, 0.03, -0.02, 0.04, 0.06];
const sharpe = sharpeRatio(testReturns);
console.log('Sharpe Ratio:', sharpe);

// Test 3: Sprawdź position sizing
function calculatePositionSize(capital: number, riskPercent: number, stopLoss: number): number {
    const riskAmount = capital * (riskPercent / 100);
    return riskAmount / stopLoss;
}

const posSize = calculatePositionSize(10000, 2, 100);
console.log('Position Size:', posSize, 'units');

// 🎯 UŻYCIE:
// 1. Otwórz ten plik
// 2. Naciśnij Ctrl+Alt+N
// 3. Zobacz output w terminalu (OUTPUT tab)
// 4. Modyfikuj wartości i test ponownie!
