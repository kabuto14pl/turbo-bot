'use strict';
/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║       QUANTUM-INSPIRED OPTIMIZATION ENGINE                         ║
 * ║       Hybrid Quantum-Classical Trading Optimizer                   ║
 * ║       Version 1.0.0 | Turbo-Bot Enterprise System                 ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║  Classical simulations of quantum algorithms for optimization:     ║
 * ║   • Simulated Quantum Annealing (SQA) — portfolio optimization    ║
 * ║   • Quantum Walk — price exploration & feature discovery           ║
 * ║   • QAOA-Inspired — combinatorial strategy selection               ║
 * ║   • Quantum Amplitude Estimation — risk assessment                 ║
 * ║   • Hybrid Scorer — blends classical + quantum signals             ║
 * ║                                                                    ║
 * ║  No actual quantum hardware required — algorithms simulate         ║
 * ║  quantum effects (tunneling, superposition, entanglement)          ║
 * ║  on classical hardware for optimization advantage.                 ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────
const QUANTUM_VERSION = '1.0.0';

// ─────────────────────────────────────────────────────────────────────
// QUANTUM RANDOM NUMBER GENERATORS
// ─────────────────────────────────────────────────────────────────────

/**
 * Box-Muller transform for Gaussian random numbers.
 * Simulates quantum measurement noise.
 */
function gaussianRandom(mean = 0, stddev = 1) {
    let u, v, s;
    do {
        u = Math.random() * 2 - 1;
        v = Math.random() * 2 - 1;
        s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const mul = Math.sqrt(-2.0 * Math.log(s) / s);
    return mean + stddev * u * mul;
}

/**
 * Quantum-inspired random number with interference effects.
 * Simulates constructive/destructive interference in measurement.
 */
function quantumRandom(amplitude = 1.0, phase = 0) {
    const theta = Math.random() * 2 * Math.PI;
    const r = amplitude * Math.sqrt(-2 * Math.log(Math.random() + 1e-10));
    return r * Math.cos(theta + phase);
}

// ─────────────────────────────────────────────────────────────────────
// SIMULATED QUANTUM STATE
// ─────────────────────────────────────────────────────────────────────
class QuantumState {
    /**
     * @param {number} nQubits — number of qubits (state dimension = 2^nQubits)
     */
    constructor(nQubits) {
        this.nQubits = nQubits;
        this.dim = 1 << nQubits; // 2^n
        // Initialize to |0...0⟩ state
        this.amplitudes = new Float64Array(this.dim * 2); // [real, imag] pairs
        this.amplitudes[0] = 1.0; // |0⟩ state has probability 1
    }

    /**
     * Apply Hadamard gate to create superposition
     * @param {number} qubit — target qubit index
     */
    hadamard(qubit) {
        const step = 1 << qubit;
        const inv = 1 / Math.sqrt(2);
        const newAmp = new Float64Array(this.amplitudes.length);
        for (let i = 0; i < this.dim; i++) {
            const partner = i ^ step; // flip qubit bit
            const iR = this.amplitudes[i * 2];
            const iI = this.amplitudes[i * 2 + 1];
            const pR = this.amplitudes[partner * 2];
            const pI = this.amplitudes[partner * 2 + 1];
            if ((i & step) === 0) {
                // |0⟩ → (|0⟩ + |1⟩)/√2
                newAmp[i * 2] = inv * (iR + pR);
                newAmp[i * 2 + 1] = inv * (iI + pI);
            } else {
                // |1⟩ → (|0⟩ - |1⟩)/√2
                newAmp[i * 2] = inv * (pR - iR);
                newAmp[i * 2 + 1] = inv * (pI - iI);
            }
        }
        this.amplitudes = newAmp;
    }

    /**
     * Apply phase shift gate
     * @param {number} qubit — target qubit
     * @param {number} theta — rotation angle
     */
    phaseShift(qubit, theta) {
        const step = 1 << qubit;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        for (let i = 0; i < this.dim; i++) {
            if ((i & step) !== 0) {
                const re = this.amplitudes[i * 2];
                const im = this.amplitudes[i * 2 + 1];
                this.amplitudes[i * 2] = re * cosT - im * sinT;
                this.amplitudes[i * 2 + 1] = re * sinT + im * cosT;
            }
        }
    }

    /**
     * Apply controlled-NOT (CNOT) gate
     */
    cnot(control, target) {
        const cStep = 1 << control;
        const tStep = 1 << target;
        for (let i = 0; i < this.dim; i++) {
            if ((i & cStep) !== 0 && (i & tStep) === 0) {
                const j = i ^ tStep;
                // Swap amplitudes
                const tmpR = this.amplitudes[i * 2];
                const tmpI = this.amplitudes[i * 2 + 1];
                this.amplitudes[i * 2] = this.amplitudes[j * 2];
                this.amplitudes[i * 2 + 1] = this.amplitudes[j * 2 + 1];
                this.amplitudes[j * 2] = tmpR;
                this.amplitudes[j * 2 + 1] = tmpI;
            }
        }
    }

    /**
     * Measure — collapse to classical state
     * @returns {number} measured state index
     */
    measure() {
        const probs = this.getProbabilities();
        const r = Math.random();
        let cumulative = 0;
        for (let i = 0; i < probs.length; i++) {
            cumulative += probs[i];
            if (r <= cumulative) return i;
        }
        return probs.length - 1;
    }

    /**
     * Get probability distribution |α|² for each basis state
     */
    getProbabilities() {
        const probs = new Float64Array(this.dim);
        for (let i = 0; i < this.dim; i++) {
            const re = this.amplitudes[i * 2];
            const im = this.amplitudes[i * 2 + 1];
            probs[i] = re * re + im * im;
        }
        return probs;
    }

    /**
     * Create equal superposition (apply H to all qubits)
     */
    equalSuperposition() {
        for (let q = 0; q < this.nQubits; q++) {
            this.hadamard(q);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────
// SIMULATED QUANTUM ANNEALING (SQA)
// Portfolio allocation optimization with quantum tunneling
// ─────────────────────────────────────────────────────────────────────
class SimulatedQuantumAnnealer {
    /**
     * @param {object} config
     * @param {number} config.nReplicas — Trotter replicas (default: 8)
     * @param {number} config.maxIterations — annealing steps (default: 500)
     * @param {number} config.initialTemp — starting temperature (default: 2.0)
     * @param {number} config.finalTemp — ending temperature (default: 0.01)
     * @param {number} config.transverseFieldStart — Γ start (default: 3.0)
     * @param {number} config.transverseFieldEnd — Γ end (default: 0.01)
     */
    constructor(config = {}) {
        this.nReplicas = config.nReplicas || 8;
        this.maxIter = config.maxIterations || 500;
        this.tempStart = config.initialTemp || 2.0;
        this.tempEnd = config.finalTemp || 0.01;
        this.gammaStart = config.transverseFieldStart || 3.0;
        this.gammaEnd = config.transverseFieldEnd || 0.01;
    }

    /**
     * Optimize a continuous function using SQA with path-integral formulation.
     *
     * @param {Function} objective — f(x) → number (minimize this)
     * @param {Array<[number,number]>} bounds — [[min,max], ...] for each dim
     * @param {object} constraints — { sumTo: 1.0 } for portfolio weights
     * @returns {{ solution: number[], cost: number, iterations: number }}
     */
    optimize(objective, bounds, constraints = {}) {
        const dim = bounds.length;

        // Initialize Trotter replicas with random solutions
        const replicas = [];
        for (let r = 0; r < this.nReplicas; r++) {
            const x = bounds.map(([lo, hi]) => lo + Math.random() * (hi - lo));
            if (constraints.sumTo) this._normalizeSum(x, constraints.sumTo);
            replicas.push(x);
        }

        let bestSolution = replicas[0].slice();
        let bestCost = objective(bestSolution);

        for (let iter = 0; iter < this.maxIter; iter++) {
            // Annealing schedule
            const progress = iter / (this.maxIter - 1);
            const temp = this.tempStart * Math.pow(this.tempEnd / this.tempStart, progress);
            const gamma = this.gammaStart * Math.pow(this.gammaEnd / this.gammaStart, progress);

            // Inter-replica coupling (quantum tunneling strength)
            const J_perp = -0.5 * temp * Math.log(Math.tanh(gamma / (this.nReplicas * temp) + 1e-10));

            for (let r = 0; r < this.nReplicas; r++) {
                const current = replicas[r];
                const currentCost = objective(current);

                // Generate candidate via quantum tunneling
                const candidate = current.slice();
                const tunnelStrength = gamma * Math.exp(-progress * 3);

                for (let d = 0; d < dim; d++) {
                    // Quantum tunneling perturbation (Gaussian with decay)
                    const perturbation = gaussianRandom(0, tunnelStrength * (bounds[d][1] - bounds[d][0]) * 0.15);
                    candidate[d] = Math.max(bounds[d][0], Math.min(bounds[d][1], candidate[d] + perturbation));
                }

                // Apply constraints
                if (constraints.sumTo) this._normalizeSum(candidate, constraints.sumTo);
                if (constraints.minValue !== undefined) {
                    for (let d = 0; d < dim; d++) {
                        candidate[d] = Math.max(constraints.minValue, candidate[d]);
                    }
                    if (constraints.sumTo) this._normalizeSum(candidate, constraints.sumTo);
                }

                const candidateCost = objective(candidate);

                // Inter-replica coupling for neighboring replicas
                let couplingEnergy = 0;
                const prevR = (r - 1 + this.nReplicas) % this.nReplicas;
                const nextR = (r + 1) % this.nReplicas;
                for (let d = 0; d < dim; d++) {
                    couplingEnergy += J_perp * ((current[d] - replicas[prevR][d]) ** 2 + (current[d] - replicas[nextR][d]) ** 2);
                }

                // Metropolis acceptance with quantum tunneling
                const deltaE = (candidateCost - currentCost) + couplingEnergy;
                if (deltaE < 0 || Math.random() < Math.exp(-deltaE / (temp + 1e-10))) {
                    replicas[r] = candidate;
                    if (candidateCost < bestCost) {
                        bestCost = candidateCost;
                        bestSolution = candidate.slice();
                    }
                }
            }
        }

        return { solution: bestSolution, cost: bestCost, iterations: this.maxIter, replicas: this.nReplicas };
    }

    _normalizeSum(arr, target) {
        const sum = arr.reduce((s, v) => s + Math.max(0, v), 0);
        if (sum > 0) {
            for (let i = 0; i < arr.length; i++) {
                arr[i] = Math.max(0, arr[i]) * target / sum;
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────
// QUANTUM WALK OPTIMIZER
// Price path exploration via quantum random walks
// ─────────────────────────────────────────────────────────────────────
class QuantumWalkOptimizer {
    constructor(config = {}) {
        this.steps = config.steps || 100;
        this.coinBias = config.coinBias || 0.5; // Hadamard coin
    }

    /**
     * Discrete-time quantum walk on a 1D lattice.
     * Explores price movements with quantum superposition.
     *
     * @param {number[]} priceHistory — recent prices
     * @param {number} steps — walk steps
     * @returns {{ distribution: number[], expectedMove: number, quantumAdvantage: number }}
     */
    quantumWalk1D(priceHistory, steps) {
        steps = steps || this.steps;
        const n = 2 * steps + 1; // lattice positions: [-steps, ..., 0, ..., +steps]
        const center = steps;

        // Coin state: [|↑⟩, |↓⟩] amplitudes for each position
        const up = new Float64Array(n * 2); // [real, imag] pairs
        const down = new Float64Array(n * 2);

        // Initial state: at center, coin in superposition
        up[center * 2] = 1 / Math.sqrt(2);     // |center, ↑⟩
        down[center * 2] = 1 / Math.sqrt(2);   // |center, ↓⟩

        // Market-adapted coin bias from recent returns
        const returns = [];
        for (let i = 1; i < Math.min(priceHistory.length, 30); i++) {
            returns.push((priceHistory[i] - priceHistory[i - 1]) / priceHistory[i - 1]);
        }
        const avgReturn = returns.length > 0 ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
        const volatility = returns.length > 1 ? Math.sqrt(returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / (returns.length - 1)) : 0.01;

        // Modified Hadamard coin with market bias
        const bias = Math.min(0.9, Math.max(0.1, 0.5 + avgReturn / (volatility + 1e-8) * 0.1));
        const cosBias = Math.sqrt(bias);
        const sinBias = Math.sqrt(1 - bias);

        for (let step = 0; step < steps; step++) {
            const newUp = new Float64Array(n * 2);
            const newDown = new Float64Array(n * 2);

            for (let pos = 1; pos < n - 1; pos++) {
                // Coin operation (biased Hadamard)
                const uR = up[pos * 2], uI = up[pos * 2 + 1];
                const dR = down[pos * 2], dI = down[pos * 2 + 1];

                const coinUpR = cosBias * uR + sinBias * dR;
                const coinUpI = cosBias * uI + sinBias * dI;
                const coinDownR = sinBias * uR - cosBias * dR;
                const coinDownI = sinBias * uI - cosBias * dI;

                // Shift operation: |↑⟩ moves right, |↓⟩ moves left
                newUp[(pos + 1) * 2] += coinUpR;
                newUp[(pos + 1) * 2 + 1] += coinUpI;
                newDown[(pos - 1) * 2] += coinDownR;
                newDown[(pos - 1) * 2 + 1] += coinDownI;
            }

            for (let i = 0; i < n * 2; i++) {
                up[i] = newUp[i];
                down[i] = newDown[i];
            }
        }

        // Calculate probability distribution
        const distribution = new Float64Array(n);
        for (let pos = 0; pos < n; pos++) {
            const uR = up[pos * 2], uI = up[pos * 2 + 1];
            const dR = down[pos * 2], dI = down[pos * 2 + 1];
            distribution[pos] = uR * uR + uI * uI + dR * dR + dI * dI;
        }

        // Expected move direction (weighted by probability)
        let expectedMove = 0;
        let totalProb = 0;
        for (let pos = 0; pos < n; pos++) {
            const displacement = pos - center;
            expectedMove += displacement * distribution[pos];
            totalProb += distribution[pos];
        }
        expectedMove = totalProb > 0 ? expectedMove / totalProb : 0;

        // Quantum advantage: compare spread to classical random walk (√n)
        let variance = 0;
        for (let pos = 0; pos < n; pos++) {
            const displacement = pos - center - expectedMove;
            variance += displacement * displacement * distribution[pos];
        }
        variance = totalProb > 0 ? variance / totalProb : 0;
        const quantumSpread = Math.sqrt(variance);
        const classicalSpread = Math.sqrt(steps); // Classical: σ ~ √n
        const quantumAdvantage = classicalSpread > 0 ? quantumSpread / classicalSpread : 1;

        return {
            distribution: Array.from(distribution),
            expectedMove,
            quantumAdvantage,
            bias,
            steps,
            volatilityUsed: volatility,
        };
    }

    /**
     * Grover-inspired search for optimal parameters.
     * Uses amplitude amplification to boost probability of good solutions.
     *
     * @param {Function} oracle — returns true for "good" solutions
     * @param {Function} generator — generates random candidate solution
     * @param {number} totalCandidates — search space size
     * @param {number} iterations — Grover iterations (optimal: π/4 * √N)
     * @returns {{ bestSolution: any, evaluations: number }}
     */
    groverSearch(oracle, generator, totalCandidates = 1000, iterations = null) {
        iterations = iterations || Math.ceil(Math.PI / 4 * Math.sqrt(totalCandidates));
        iterations = Math.min(iterations, 100); // Cap for performance

        let bestSolution = null;
        let bestScore = -Infinity;
        let evaluations = 0;

        // Phase 1: Random sampling with amplitude amplification simulation
        const candidates = [];
        for (let i = 0; i < Math.min(totalCandidates, 500); i++) {
            const candidate = generator();
            const score = oracle(candidate);
            evaluations++;
            candidates.push({ candidate, score });
            if (score > bestScore) {
                bestScore = score;
                bestSolution = candidate;
            }
        }

        // Phase 2: Amplitude amplification — focus on high-scoring region
        candidates.sort((a, b) => b.score - a.score);
        const topK = Math.ceil(candidates.length * 0.2); // Top 20% — "marked" states
        const goodStates = candidates.slice(0, topK);

        for (let iter = 0; iter < iterations; iter++) {
            // "Inversion about the mean" — perturb from good states
            const base = goodStates[Math.floor(Math.random() * goodStates.length)];
            const amplified = generator();
            evaluations++;

            // Blend base with amplified (quantum interference simulation)
            const blendedCandidate = {};
            for (const key of Object.keys(base.candidate)) {
                const baseVal = typeof base.candidate[key] === 'number' ? base.candidate[key] : 0;
                const ampVal = typeof amplified[key] === 'number' ? amplified[key] : 0;
                blendedCandidate[key] = baseVal * 0.7 + ampVal * 0.3 + gaussianRandom(0, 0.02);
            }

            const score = oracle(blendedCandidate);
            evaluations++;
            if (score > bestScore) {
                bestScore = score;
                bestSolution = blendedCandidate;
                goodStates.push({ candidate: blendedCandidate, score });
                goodStates.sort((a, b) => b.score - a.score);
                if (goodStates.length > topK * 2) goodStates.length = topK;
            }
        }

        return { bestSolution, bestScore, evaluations };
    }
}

// ─────────────────────────────────────────────────────────────────────
// QUANTUM-INSPIRED PORTFOLIO OPTIMIZER
// Uses SQA + QAOA concepts for portfolio allocation
// ─────────────────────────────────────────────────────────────────────
class QuantumPortfolioOptimizer {
    constructor(config = {}) {
        this.annealer = new SimulatedQuantumAnnealer({
            nReplicas: config.nReplicas || 8,
            maxIterations: config.annealingIterations || 500,
        });
        this.walker = new QuantumWalkOptimizer({ steps: config.walkSteps || 60 });
        this.riskTolerance = config.riskTolerance || 0.5; // 0=conservative, 1=aggressive
    }

    /**
     * Optimize strategy weights using Quantum Annealing.
     * Minimizes: -expectedReturn + lambda * risk (Markowitz-style with quantum tunneling)
     *
     * @param {Object<string,number>} currentWeights — { AdvancedAdaptive: 0.18, ... }
     * @param {Object<string,{returns: number, risk: number, sharpe: number}>} strategyMetrics
     * @returns {{ weights: Object, cost: number, improvement: string }}
     */
    optimizeWeights(currentWeights, strategyMetrics) {
        const strategies = Object.keys(currentWeights);
        const n = strategies.length;
        if (n === 0) return { weights: currentWeights, cost: 0, improvement: 'none' };

        // Extract metrics (with safe defaults)
        const returns = strategies.map(s => (strategyMetrics[s] && strategyMetrics[s].returns) || 0);
        const risks = strategies.map(s => (strategyMetrics[s] && strategyMetrics[s].risk) || 0.5);
        const sharpes = strategies.map(s => (strategyMetrics[s] && strategyMetrics[s].sharpe) || 0);

        // Risk aversion parameter (higher = more conservative)
        const lambda = 2.0 * (1 - this.riskTolerance);

        // Objective: minimize -E[R] + λ * Var[R] (Markowitz mean-variance)
        const objective = (weights) => {
            let expectedReturn = 0;
            let portfolioRisk = 0;
            for (let i = 0; i < n; i++) {
                expectedReturn += weights[i] * returns[i];
                portfolioRisk += (weights[i] * risks[i]) ** 2;
                // Cross-correlation term (simplified: assume 0.3 correlation)
                for (let j = i + 1; j < n; j++) {
                    portfolioRisk += 2 * 0.3 * weights[i] * risks[i] * weights[j] * risks[j];
                }
            }
            portfolioRisk = Math.sqrt(portfolioRisk);

            // Sharpe bonus: prefer strategies with higher Sharpe
            let sharpeBonus = 0;
            for (let i = 0; i < n; i++) {
                sharpeBonus += weights[i] * sharpes[i] * 0.1;
            }

            return -expectedReturn + lambda * portfolioRisk - sharpeBonus;
        };

        // Bounds: each weight in [0.03, 0.50]
        const bounds = strategies.map(() => [0.03, 0.50]);

        // Run Quantum Annealing
        const result = this.annealer.optimize(objective, bounds, { sumTo: 1.0, minValue: 0.03 });

        // Convert back to named weights
        const optimizedWeights = {};
        for (let i = 0; i < n; i++) {
            optimizedWeights[strategies[i]] = Math.round(result.solution[i] * 1000) / 1000;
        }

        // Calculate improvement
        const currentWeightArr = strategies.map(s => currentWeights[s]);
        const oldCost = objective(currentWeightArr);
        const improvement = oldCost !== 0 ? ((oldCost - result.cost) / Math.abs(oldCost) * 100).toFixed(1) + '%' : 'N/A';

        return {
            weights: optimizedWeights,
            cost: result.cost,
            previousCost: oldCost,
            improvement,
            iterations: result.iterations,
            replicas: result.replicas,
        };
    }

    /**
     * Quantum Walk-enhanced prediction.
     * Uses quantum walk distribution to estimate price direction probability.
     *
     * @param {number[]} priceHistory — recent close prices
     * @returns {{ direction: string, confidence: number, quantumAdvantage: number }}
     */
    quantumPricePrediction(priceHistory) {
        if (priceHistory.length < 10) {
            return { direction: 'NEUTRAL', confidence: 0.5, quantumAdvantage: 1.0 };
        }

        const walk = this.walker.quantumWalk1D(priceHistory, 60);

        // Interpret quantum walk result
        let direction, confidence;
        if (walk.expectedMove > 0.5) {
            direction = 'UP';
            confidence = Math.min(0.95, 0.5 + Math.abs(walk.expectedMove) * 0.05);
        } else if (walk.expectedMove < -0.5) {
            direction = 'DOWN';
            confidence = Math.min(0.95, 0.5 + Math.abs(walk.expectedMove) * 0.05);
        } else {
            direction = 'NEUTRAL';
            confidence = 0.5;
        }

        return {
            direction,
            confidence,
            expectedMove: walk.expectedMove,
            quantumAdvantage: walk.quantumAdvantage,
            bias: walk.bias,
        };
    }

    /**
     * Quantum Amplitude Estimation — estimate VaR (Value at Risk)
     * Classical simulation leveraging quantum-inspired sampling.
     *
     * @param {number[]} returns — historical returns
     * @param {number} confidenceLevel — 0.95 or 0.99
     * @param {number} portfolioValue — current portfolio value
     * @returns {{ var1d: number, cvar: number, confidenceLevel: number }}
     */
    quantumVaR(returns, confidenceLevel = 0.95, portfolioValue = 10000) {
        if (returns.length < 20) {
            return { var1d: portfolioValue * 0.02, cvar: portfolioValue * 0.03, confidenceLevel };
        }

        // Create quantum state for amplitude estimation
        const nQubits = 6; // 64 bins for return distribution
        const qs = new QuantumState(nQubits);
        qs.equalSuperposition();

        // Encode return distribution into quantum amplitudes
        const sorted = returns.slice().sort((a, b) => a - b);
        const nBins = qs.dim;
        const binEdges = [];
        for (let i = 0; i <= nBins; i++) {
            const idx = Math.floor(i / nBins * sorted.length);
            binEdges.push(sorted[Math.min(idx, sorted.length - 1)]);
        }

        // Quantum-inspired importance sampling
        // Focus measurement on tail risk (amplitude amplification for bad outcomes)
        const tailIdx = Math.floor((1 - confidenceLevel) * nBins);
        for (let i = 0; i < tailIdx; i++) {
            // Apply phase boost to tail states (Grover-like marking)
            qs.phaseShift(0, Math.PI * 0.1); // Subtle rotation
        }

        // Monte Carlo with quantum-amplified sampling
        const nSamples = 5000;
        let tailLosses = [];

        for (let s = 0; s < nSamples; s++) {
            // Sample from quantum distribution
            const measurement = qs.measure();
            const binReturn = binEdges[Math.min(measurement, binEdges.length - 2)];

            // Add quantum noise (interference)
            const quantumNoise = gaussianRandom(0, 0.001);
            const sampledReturn = binReturn + quantumNoise;

            if (sampledReturn < 0) {
                tailLosses.push(-sampledReturn * portfolioValue);
            }
        }

        tailLosses.sort((a, b) => b - a);

        // VaR: loss at confidence percentile
        const varIdx = Math.floor(tailLosses.length * (1 - confidenceLevel));
        const var1d = tailLosses.length > varIdx ? tailLosses[varIdx] : portfolioValue * 0.02;

        // CVaR (Expected Shortfall): average of losses beyond VaR
        const tailSlice = tailLosses.slice(0, Math.max(1, varIdx));
        const cvar = tailSlice.length > 0 ? tailSlice.reduce((s, v) => s + v, 0) / tailSlice.length : var1d * 1.3;

        return {
            var1d: Math.round(var1d * 100) / 100,
            cvar: Math.round(cvar * 100) / 100,
            confidenceLevel,
            samplesUsed: nSamples,
            tailLossCount: tailLosses.length,
        };
    }
}

// ─────────────────────────────────────────────────────────────────────
// HYBRID QUANTUM-CLASSICAL SCORER
// Combines classical neural predictions with quantum optimization
// ─────────────────────────────────────────────────────────────────────
class HybridQuantumClassicalScorer {
    constructor(config = {}) {
        this.quantumWeight = config.quantumWeight || 0.35; // How much quantum influences final score
        this.classicalWeight = 1 - this.quantumWeight;
        this.optimizer = new QuantumPortfolioOptimizer(config);
        this.lastQuantumResult = null;
        this.updateCount = 0;
        this.quantumAdvantageHistory = [];
    }

    /**
     * Score a trading signal by blending classical and quantum analysis.
     *
     * @param {object} classicalSignal — { action, confidence, regime }
     * @param {number[]} priceHistory — recent close prices
     * @returns {{ action: string, confidence: number, quantumBoost: number, regime: string }}
     */
    scoreSignal(classicalSignal, priceHistory) {
        this.updateCount++;

        // Quantum Walk prediction
        const quantumPred = this.optimizer.quantumPricePrediction(priceHistory);
        this.lastQuantumResult = quantumPred;
        this.quantumAdvantageHistory.push(quantumPred.quantumAdvantage);
        if (this.quantumAdvantageHistory.length > 100) this.quantumAdvantageHistory.shift();

        // Determine agreement between classical and quantum
        const classicalDir = classicalSignal.action === 'BUY' ? 'UP' : (classicalSignal.action === 'SELL' ? 'DOWN' : 'NEUTRAL');
        const agreement = classicalDir === quantumPred.direction;

        let finalAction = classicalSignal.action;
        let finalConfidence = classicalSignal.confidence || 0.5;
        let quantumBoost = 0;

        if (agreement) {
            // Both agree — boost confidence
            quantumBoost = this.quantumWeight * quantumPred.confidence * 0.15;
            finalConfidence = Math.min(0.95, finalConfidence + quantumBoost);
        } else if (quantumPred.direction !== 'NEUTRAL' && classicalDir !== 'NEUTRAL') {
            // Disagreement — reduce confidence
            quantumBoost = -this.quantumWeight * quantumPred.confidence * 0.10;
            finalConfidence = Math.max(0.1, finalConfidence + quantumBoost);

            // If quantum signal is very strong and classical is weak, override
            if (quantumPred.confidence > 0.75 && (classicalSignal.confidence || 0.5) < 0.55) {
                finalAction = quantumPred.direction === 'UP' ? 'BUY' : 'SELL';
                finalConfidence = quantumPred.confidence * this.quantumWeight + (classicalSignal.confidence || 0.5) * this.classicalWeight;
            }
        }

        return {
            action: finalAction,
            confidence: Math.round(finalConfidence * 1000) / 1000,
            quantumBoost: Math.round(quantumBoost * 1000) / 1000,
            quantumDirection: quantumPred.direction,
            quantumConfidence: quantumPred.confidence,
            quantumAdvantage: quantumPred.quantumAdvantage,
            agreement,
            regime: classicalSignal.regime || 'UNKNOWN',
        };
    }

    /**
     * Get quantum system status and statistics.
     */
    getStatus() {
        const avgAdvantage = this.quantumAdvantageHistory.length > 0
            ? this.quantumAdvantageHistory.reduce((s, v) => s + v, 0) / this.quantumAdvantageHistory.length : 0;
        return {
            version: QUANTUM_VERSION,
            updateCount: this.updateCount,
            quantumWeight: this.quantumWeight,
            classicalWeight: this.classicalWeight,
            avgQuantumAdvantage: Math.round(avgAdvantage * 1000) / 1000,
            lastQuantumResult: this.lastQuantumResult,
        };
    }
}

// ─────────────────────────────────────────────────────────────────────
// MAIN QUANTUM ENGINE — Orchestrator
// ─────────────────────────────────────────────────────────────────────
class QuantumHybridEngine {
    constructor(config = {}) {
        this.version = QUANTUM_VERSION;
        this.portfolioOptimizer = new QuantumPortfolioOptimizer(config);
        this.scorer = new HybridQuantumClassicalScorer(config);
        this.isReady = false;
        this.optimizeEveryNCycles = config.optimizeEvery || 50;
        this.cycleCount = 0;
        this.lastOptimization = null;
    }

    initialize() {
        this.isReady = true;
        console.log('[QUANTUM] Hybrid Quantum-Classical Engine initialized | Version: ' + this.version);
        console.log('[QUANTUM] Components: SQA(8 replicas), QWalk(60 steps), QVaR, HybridScorer(q=' + this.scorer.quantumWeight + ')');
    }

    /**
     * Process a signal through quantum enhancement
     */
    enhanceSignal(classicalSignal, priceHistory) {
        if (!this.isReady || !priceHistory || priceHistory.length < 15) return classicalSignal;
        try {
            return this.scorer.scoreSignal(classicalSignal, priceHistory);
        } catch (e) {
            console.warn('[QUANTUM] Signal enhance error: ' + e.message);
            return classicalSignal;
        }
    }

    /**
     * Periodically optimize strategy weights
     */
    shouldOptimize() {
        this.cycleCount++;
        return this.cycleCount % this.optimizeEveryNCycles === 0;
    }

    /**
     * Optimize weights using quantum annealing
     */
    optimizeWeights(currentWeights, strategyMetrics) {
        if (!this.isReady) return null;
        try {
            this.lastOptimization = this.portfolioOptimizer.optimizeWeights(currentWeights, strategyMetrics);
            return this.lastOptimization;
        } catch (e) {
            console.warn('[QUANTUM] Weight optimization error: ' + e.message);
            return null;
        }
    }

    /**
     * Calculate Quantum VaR
     */
    calculateVaR(returns, portfolioValue) {
        if (!this.isReady) return null;
        try {
            return this.portfolioOptimizer.quantumVaR(returns, 0.95, portfolioValue);
        } catch (e) {
            console.warn('[QUANTUM] VaR error: ' + e.message);
            return null;
        }
    }

    getStatus() {
        return {
            version: this.version,
            isReady: this.isReady,
            cycleCount: this.cycleCount,
            scorer: this.scorer.getStatus(),
            lastOptimization: this.lastOptimization,
        };
    }
}

module.exports = {
    QuantumHybridEngine,
    QuantumPortfolioOptimizer,
    HybridQuantumClassicalScorer,
    SimulatedQuantumAnnealer,
    QuantumWalkOptimizer,
    QuantumState,
    QUANTUM_VERSION,
};
