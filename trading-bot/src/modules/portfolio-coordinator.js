'use strict';

const fs = require('fs');
const path = require('path');

class SharedPortfolioCoordinator {
    constructor(config = {}) {
        this.config = config;
        this.enabled = config.portfolioOptimizationEnabled !== false
            && process.env.PORTFOLIO_COORDINATION_ENABLED !== 'false';
        this.instanceId = config.instanceId || process.env.INSTANCE_ID || 'primary';
        this.symbol = config.symbol || process.env.TRADING_SYMBOL || 'BTCUSDT';
        this.portfolioCapital = Math.max(
            1,
            Number(config.portfolioCapital || process.env.PORTFOLIO_CAPITAL || config.initialCapital || 0),
        );
        this.pairCapitalPct = Math.max(
            0,
            Math.min(1, Number(config.pairCapitalPct || process.env.PAIR_CAPITAL_PCT || 1)),
        );
        this.maxGrossExposurePct = Math.max(
            0.05,
            Math.min(1, Number(config.maxGrossExposurePct || process.env.MAX_GROSS_EXPOSURE_PCT || 0.80)),
        );
        this.maxNetExposurePct = Math.max(
            0.05,
            Math.min(1, Number(config.maxNetExposurePct || process.env.MAX_NET_EXPOSURE_PCT || 0.55)),
        );
        this.maxClusterExposurePct = Math.max(
            0.05,
            Math.min(1, Number(config.maxClusterExposurePct || process.env.MAX_CLUSTER_EXPOSURE_PCT || 0.45)),
        );
        this.sharedRiskBudgetPct = Math.max(
            0.01,
            Math.min(1, Number(config.sharedRiskBudgetPct || process.env.SHARED_RISK_BUDGET_PCT || 0.18)),
        );
        this.sleeveCapMultiplier = Math.max(
            1,
            Number(config.sleeveCapMultiplier || process.env.SLEEVE_CAP_MULTIPLIER || 1.25),
        );
        this.sleeveBufferPct = Math.max(
            0.01,
            Number(config.sleeveBufferPct || process.env.SLEEVE_BUFFER_PCT || 0.05),
        );
        this.correlationThreshold = Math.max(
            0,
            Math.min(1, Number(config.correlationThreshold || process.env.CORRELATION_THRESHOLD || 0.5)),
        );
        this.snapshotTtlMs = Math.max(
            30000,
            Number(config.portfolioSnapshotTtlMs || process.env.PORTFOLIO_SNAPSHOT_TTL_MS || 180000),
        );
        this.filePath = config.portfolioCoordinatorFile
            || process.env.PORTFOLIO_COORDINATOR_FILE
            || path.resolve(process.cwd(), 'data/portfolio_coordinator.json');
        this.lastPublishedSnapshot = null;

        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    _baseState() {
        return { updatedAt: 0, instances: {} };
    }

    _readState() {
        try {
            if (!fs.existsSync(this.filePath)) return this._baseState();
            const raw = fs.readFileSync(this.filePath, 'utf8');
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : this._baseState();
        } catch (_) {
            return this._baseState();
        }
    }

    _writeState(state) {
        const tempPath = this.filePath + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(state, null, 2));
        fs.renameSync(tempPath, this.filePath);
    }

    _pruneState(state) {
        const now = Date.now();
        const next = state && typeof state === 'object' ? state : this._baseState();
        next.instances = next.instances || {};
        for (const [instanceId, snapshot] of Object.entries(next.instances)) {
            if (!snapshot || (now - (snapshot.timestamp || 0)) > this.snapshotTtlMs) {
                delete next.instances[instanceId];
            }
        }
        next.updatedAt = now;
        return next;
    }

    _pairCorrelation(left, right) {
        if (!left || !right) return 0;
        if (left === right) return 1;

        const pair = [left, right].sort().join(':');
        const known = {
            'BNBUSDT:BTCUSDT': 0.68,
            'BNBUSDT:ETHUSDT': 0.74,
            'BNBUSDT:SOLUSDT': 0.76,
            'BNBUSDT:XRPUSDT': 0.40,
            'BTCUSDT:ETHUSDT': 0.82,
            'BTCUSDT:SOLUSDT': 0.72,
            'BTCUSDT:XRPUSDT': 0.45,
            'ETHUSDT:SOLUSDT': 0.78,
            'ETHUSDT:XRPUSDT': 0.48,
            'SOLUSDT:XRPUSDT': 0.42,
        };
        if (known[pair] !== undefined) return known[pair];
        if (left === 'XRPUSDT' || right === 'XRPUSDT') return 0.40;
        return 0.55;
    }

    _buildAggregate(state) {
        const activeInstances = Object.values((state && state.instances) || {});
        const positions = activeInstances.flatMap((instance) => Array.isArray(instance.positions) ? instance.positions : []);
        const grossExposurePct = positions.reduce((sum, pos) => sum + Math.abs(pos.exposurePct || 0), 0);
        const netExposurePct = positions.reduce((sum, pos) => sum + (pos.signedExposurePct || 0), 0);
        const riskUsagePct = positions.reduce((sum, pos) => sum + Math.abs(pos.riskPct || 0), 0);
        const realizedPnL = activeInstances.reduce((sum, item) => sum + (item.realizedPnL || 0), 0);
        const unrealizedPnL = activeInstances.reduce((sum, item) => sum + (item.unrealizedPnL || 0), 0);

        // P#154: Portfolio-level drawdown calculation
        const totalPortfolioValue = activeInstances.reduce((sum, item) => sum + (item.portfolioValue || 0), 0);
        const portfolioDrawdownPct = this.portfolioCapital > 0
            ? Math.max(0, (this.portfolioCapital - totalPortfolioValue - unrealizedPnL) / this.portfolioCapital)
            : 0;

        return {
            activeInstances,
            positions,
            grossExposurePct,
            netExposurePct,
            riskUsagePct,
            realizedPnL,
            unrealizedPnL,
            portfolioDrawdownPct,
        };
    }

    publishSnapshot(pm, marketPrice, extras = {}) {
        if (!this.enabled || !pm) return null;

        const portfolio = pm.getPortfolio();
        const positions = Array.from(pm.getPositions().values()).map((pos) => {
            const markPrice = pos.symbol === this.symbol && marketPrice > 0 ? marketPrice : pos.entryPrice;
            const notional = Math.abs((markPrice || pos.entryPrice || 0) * (pos.quantity || 0));
            const exposurePct = this.portfolioCapital > 0 ? notional / this.portfolioCapital : 0;
            const stopDistancePct = pos.entryPrice > 0 && pos.stopLoss > 0
                ? Math.abs(pos.entryPrice - pos.stopLoss) / pos.entryPrice
                : 0.03;
            const signedExposurePct = pos.side === 'SHORT' ? -exposurePct : exposurePct;

            return {
                symbol: pos.symbol,
                side: pos.side,
                quantity: pos.quantity,
                entryPrice: pos.entryPrice,
                markPrice,
                notional,
                exposurePct,
                signedExposurePct,
                stopDistancePct,
                riskPct: exposurePct * stopDistancePct,
            };
        });

        const state = this._pruneState(this._readState());
        const snapshot = {
            instanceId: this.instanceId,
            symbol: this.symbol,
            pairCapitalPct: this.pairCapitalPct,
            portfolioCapital: this.portfolioCapital,
            portfolioValue: portfolio.totalValue || this.config.initialCapital || 0,
            realizedPnL: portfolio.realizedPnL || 0,
            unrealizedPnL: portfolio.unrealizedPnL || 0,
            timestamp: Date.now(),
            marketPrice: marketPrice || 0,
            positions,
            extras,
        };

        state.instances[this.instanceId] = snapshot;
        this._writeState(state);
        this.lastPublishedSnapshot = snapshot;
        return snapshot;
    }

    clearSnapshot() {
        const state = this._pruneState(this._readState());
        if (state.instances[this.instanceId]) {
            delete state.instances[this.instanceId];
            this._writeState(state);
        }
    }

    evaluateEntry({ action, price, quantity, stopDistancePct }) {
        if (!this.enabled) {
            return { approved: true, sizeMultiplier: 1, recommendedQuantity: quantity, reason: 'Portfolio coordinator disabled' };
        }

        const normalizedQty = Number(quantity || 0);
        const normalizedPrice = Number(price || 0);
        if ((action !== 'BUY' && action !== 'SELL') || normalizedQty <= 0 || normalizedPrice <= 0) {
            return { approved: false, sizeMultiplier: 0, recommendedQuantity: 0, reason: 'Invalid portfolio coordination input' };
        }

        const state = this._pruneState(this._readState());
        const aggregate = this._buildAggregate(state);
        const proposedExposurePct = (normalizedQty * normalizedPrice) / this.portfolioCapital;
        const proposedRiskPct = proposedExposurePct * Math.max(0.005, stopDistancePct || 0.03);
        const sign = action === 'SELL' ? -1 : 1;

        // ═══════════════════════════════════════════════════════════════
        // P#154: PORTFOLIO-LEVEL CIRCUIT BREAKER
        // Aggregate drawdown across ALL bot instances.
        // 12% DD → scale sizing to 40%. 15% DD → HALT ALL trading.
        // ═══════════════════════════════════════════════════════════════
        const portfolioDD = aggregate.portfolioDrawdownPct || 0;
        if (portfolioDD >= 0.15) {
            return {
                approved: false,
                sizeMultiplier: 0,
                recommendedQuantity: 0,
                reason: 'PORTFOLIO HALT: aggregate drawdown ' + (portfolioDD * 100).toFixed(1) + '% >= 15%',
                aggregate,
            };
        }
        let ddSizeMultiplier = 1;
        if (portfolioDD >= 0.12) {
            ddSizeMultiplier = 0.40;
            console.log('[PORTFOLIO CB] Sizing reduced to 40% — aggregate DD ' + (portfolioDD * 100).toFixed(1) + '%');
        }

        const sameSymbolExposurePct = aggregate.positions
            .filter((pos) => pos.symbol === this.symbol)
            .reduce((sum, pos) => sum + Math.abs(pos.exposurePct || 0), 0);
        const maxSleeveExposurePct = Math.min(
            0.60,
            Math.max(this.pairCapitalPct * this.sleeveCapMultiplier, this.pairCapitalPct + this.sleeveBufferPct),
        );

        let sizeMultiplier = 1;
        const blockers = [];
        const scalers = [];

        const grossRemainingPct = this.maxGrossExposurePct - aggregate.grossExposurePct;
        if (grossRemainingPct <= 0) blockers.push('Shared gross exposure budget exhausted');
        else scalers.push(grossRemainingPct / proposedExposurePct);

        const currentDirectionalNetPct = sign > 0
            ? Math.max(0, aggregate.netExposurePct)
            : Math.max(0, -aggregate.netExposurePct);
        const netRemainingPct = this.maxNetExposurePct - currentDirectionalNetPct;
        if (netRemainingPct <= 0) blockers.push('Directional net exposure cap reached');
        else scalers.push(netRemainingPct / proposedExposurePct);

        const sleeveRemainingPct = maxSleeveExposurePct - sameSymbolExposurePct;
        if (sleeveRemainingPct <= 0) blockers.push('Pair sleeve fully allocated');
        else scalers.push(sleeveRemainingPct / proposedExposurePct);

        const clusterExposurePct = aggregate.positions.reduce((sum, pos) => {
            if ((pos.signedExposurePct || 0) * sign <= 0) return sum;
            const corr = this._pairCorrelation(this.symbol, pos.symbol);
            if (corr < this.correlationThreshold) return sum;
            return sum + Math.abs(pos.exposurePct || 0) * corr;
        }, 0);
        const clusterRemainingPct = this.maxClusterExposurePct - clusterExposurePct;
        if (clusterRemainingPct <= 0) blockers.push('Correlated cluster cap reached');
        else scalers.push(clusterRemainingPct / proposedExposurePct);

        const riskRemainingPct = this.sharedRiskBudgetPct - aggregate.riskUsagePct;
        if (riskRemainingPct <= 0) blockers.push('Shared risk budget exhausted');
        else scalers.push(riskRemainingPct / Math.max(proposedRiskPct, 1e-9));

        if (blockers.length > 0) {
            return {
                approved: false,
                sizeMultiplier: 0,
                recommendedQuantity: 0,
                reason: blockers.join(' | '),
                aggregate,
                checks: { sameSymbolExposurePct, clusterExposurePct, maxSleeveExposurePct },
            };
        }

        for (const candidate of scalers) {
            if (Number.isFinite(candidate)) sizeMultiplier = Math.min(sizeMultiplier, candidate);
        }
        sizeMultiplier = Math.max(0, Math.min(1, sizeMultiplier));

        // P#154: Apply portfolio-level DD sizing reduction
        sizeMultiplier *= ddSizeMultiplier;

        const recommendedQuantity = normalizedQty * sizeMultiplier;
        const approved = recommendedQuantity > 0.000001;
        const reason = sizeMultiplier < 0.999
            ? 'Entry scaled by shared portfolio allocator'
            : 'Shared portfolio allocator approved';

        return {
            approved,
            sizeMultiplier,
            recommendedQuantity,
            reason,
            aggregate,
            checks: {
                sameSymbolExposurePct,
                clusterExposurePct,
                maxSleeveExposurePct,
                proposedExposurePct,
                proposedRiskPct,
            },
        };
    }

    getStatus() {
        const state = this._pruneState(this._readState());
        const aggregate = this._buildAggregate(state);
        return {
            enabled: this.enabled,
            instanceId: this.instanceId,
            symbol: this.symbol,
            filePath: this.filePath,
            portfolioCapital: this.portfolioCapital,
            pairCapitalPct: this.pairCapitalPct,
            maxGrossExposurePct: this.maxGrossExposurePct,
            maxNetExposurePct: this.maxNetExposurePct,
            maxClusterExposurePct: this.maxClusterExposurePct,
            sharedRiskBudgetPct: this.sharedRiskBudgetPct,
            correlationThreshold: this.correlationThreshold,
            activeInstanceCount: aggregate.activeInstances.length,
            grossExposurePct: Number(aggregate.grossExposurePct.toFixed(4)),
            netExposurePct: Number(aggregate.netExposurePct.toFixed(4)),
            riskUsagePct: Number(aggregate.riskUsagePct.toFixed(4)),
            realizedPnL: Number(aggregate.realizedPnL.toFixed(2)),
            unrealizedPnL: Number(aggregate.unrealizedPnL.toFixed(2)),
            lastPublishedSnapshot: this.lastPublishedSnapshot,
        };
    }
}

module.exports = { SharedPortfolioCoordinator };