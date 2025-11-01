/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { Logger } from '../../infrastructure/logging/logger';
import { Position } from '../types/position';

export class Portfolio {
    private readonly logger: Logger;
    private positions: Position[] = [];
    private balances: Map<string, number> = new Map();

    constructor(logger: Logger, initialCash: number = 10000) {
        this.logger = logger;
        this.balances.set('USDT', initialCash);
    }

    addPosition(position: Position): void {
        this.positions.push(position);
        this.balances.set(position.symbol.replace('USDT', ''), (this.balances.get(position.symbol.replace('USDT', '')) || 0) + position.size);
        this.logger.info(`Added position: ${position.direction} ${position.size} ${position.symbol} @ ${position.entryPrice}`);
    }

    removePosition(symbol: string): void {
        const position = this.getPosition(symbol);
        if (position) {
            this.positions = this.positions.filter(p => p.symbol !== symbol);
            this.balances.set(position.symbol.replace('USDT', ''), (this.balances.get(position.symbol.replace('USDT', '')) || 0) - position.size);
            this.logger.info(`Removed position: ${position.direction} ${position.size} ${position.symbol}`);
        }
    }

    getPosition(symbol: string): Position | undefined {
        return this.positions.find(p => p.symbol === symbol);
    }

    getPositions(): Position[] {
        return [...this.positions];
    }

    getCash(): number {
        return this.balances.get('USDT') || 0;
    }

    getEquity(): number {
        const positionsValue = this.positions.reduce((sum, pos) => sum + pos.margin, 0);
        return this.getCash() + positionsValue;
    }

    async getBalance(asset: string): Promise<number> {
        return this.balances.get(asset) || 0;
    }

    async updateBalance(asset: string, newBalance: number): Promise<void> {
        this.balances.set(asset, newBalance);
        this.logger.info(`Updated ${asset} balance to ${newBalance}`);
    }

    updatePosition(symbol: string, price: number): void {
        const position = this.getPosition(symbol);
        if (position) {
            const pnl = position.direction === 'long' ?
                (price - position.entryPrice) * position.size :
                (position.entryPrice - price) * position.size;
            this.logger.info(`Updated position ${symbol}: PnL = ${pnl}`);
        }
    }

    getNetAssetValue(prices: Record<string, number>): number {
        let nav = this.balances.get('USDT') || 0;
        
        for (const position of this.positions) {
            const price = prices[position.symbol] || 0;
            const positionValue = position.size * price;
            nav += positionValue;
        }
        
        return nav;
    }
} 