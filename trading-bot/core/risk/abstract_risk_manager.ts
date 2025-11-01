/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
export abstract class AbstractRiskManager {
    abstract checkRisk(signal: any): boolean;
    setRollingVaR?(rollingVaR: number): void;
}
