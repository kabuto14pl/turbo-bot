/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * Oblicza wskaźnik Rate of Change (ROC).
 * @param closes - Tablica cen zamknięcia.
 * @param period - Okres, dla którego obliczany jest ROC.
 * @returns Tablica wartości ROC lub null, jeśli danych jest za mało.
 */
export function calculateROC(closes: number[], period: number): (number | null)[] {
    if (closes.length < period) {
        return new Array(closes.length).fill(null);
    }

    const rocValues: (number | null)[] = new Array(period - 1).fill(null);

    for (let i = period; i < closes.length; i++) {
        const priorClose = closes[i - period];
        if (priorClose === 0) {
            rocValues.push(null); // Unikaj dzielenia przez zero
        } else {
            const roc = ((closes[i] - priorClose) / priorClose) * 100;
            rocValues.push(roc);
        }
    }

    return rocValues;
}
