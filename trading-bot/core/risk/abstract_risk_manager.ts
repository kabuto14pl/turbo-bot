export abstract class AbstractRiskManager {
    abstract checkRisk(signal: any): boolean;
    setRollingVaR?(rollingVaR: number): void;
}
