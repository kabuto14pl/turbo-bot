export class PerformanceTracker {
  constructor(initialCapital: number) {}
  
  recordTrade(...args: any[]): void {
    // Placeholder implementation
  }
  
  getCurrentPerformance(): any {
    return {
      totalTrades: 0,
      winRate: 0,
      totalPnL: 0,
      drawdown: 0
    };
  }
}
