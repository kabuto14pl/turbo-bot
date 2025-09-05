export class CooldownManager {
    private cooldownDict: Record<string, number> = {};
    private cooldownBars: number;
    private lastExecutionTime: number = 0;

    constructor(cooldownBars: number = 2) { // OBNIŻONY cooldown do 2 barów
        this.cooldownBars = cooldownBars;
    }

    set(strategyName: string, bar: number): void {
        this.cooldownDict[strategyName] = bar;
    }

    isCooldown(strategyName: string, currentBar: number): boolean {
        return strategyName in this.cooldownDict && (currentBar - this.cooldownDict[strategyName]) < this.cooldownBars;
    }

    canExecute(): boolean {
        const now = Date.now();
        return (now - this.lastExecutionTime) >= (this.cooldownBars * 60000); // 2 minutes per bar
    }

    updateLastExecution(): void {
        this.lastExecutionTime = Date.now();
    }
}
