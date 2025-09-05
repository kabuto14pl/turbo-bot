export class RetryCooldown {
  private lastFailedAttempt = -Infinity;
  constructor(private cooldownBars: number) {}
  canRetry(currentBar: number): boolean {
    return currentBar - this.lastFailedAttempt > this.cooldownBars;
  }
  recordFailure(currentBar: number): void {
    this.lastFailedAttempt = currentBar;
  }
}
