'use strict';

const path = require('path');
const { NeuronAIManager } = require(path.join(__dirname, '../../trading-bot/src/core/ai/neuron_ai_manager'));

module.exports = class NeuronDecisionProvider {
    constructor(options = {}) {
        this.providerId = options.id || 'neuron-decision-provider';
    }

    id() {
        return this.providerId;
    }

    async callApi(prompt) {
        const manager = new NeuronAIManager();
        manager.totalDecisions = 0;
        manager.overrideCount = 0;
        manager.evolutionCount = 0;
        manager.totalPnL = 0;
        manager.winCount = 0;
        manager.lossCount = 0;
        manager.consecutiveLosses = 0;
        manager.consecutiveWins = 0;
        manager.lastDecision = null;
        manager.lastDecisionTime = 0;
        manager.decisionCooldownMs = 0;
        manager.recentTrades = [];

        const state = JSON.parse(prompt);
        const result = await manager.makeDecision(state);

        return {
            output: JSON.stringify(result),
            metadata: {
                action: result.action,
                source: result.source,
            },
        };
    }
};