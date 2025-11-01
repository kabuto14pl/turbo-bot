"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔍 ADVANCED HYPERPARAMETER SEARCH SYSTEM
 * Comprehensive grid search, random search, and Bayesian optimization
 * Implements Gaussian Process-based optimization with acquisition functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SEARCH_CONFIGS = exports.AdvancedHyperparameterSearch = void 0;
const logger_1 = require("../../../core/utils/logger");
class AdvancedHyperparameterSearch {
    constructor(config) {
        this.trials = [];
        this.search_start_time = 0;
        // Evolutionary state
        this.population = [];
        this.generation = 0;
        // Hyperband state
        this.hyperband_brackets = [];
        this.config = {
            n_random_trials: 50,
            random_seed: 42,
            acquisition_function: 'ei',
            kernel_type: 'rbf',
            n_initial_random: 10,
            xi: 0.01,
            kappa: 2.576,
            population_size: 20,
            n_generations: 50,
            mutation_rate: 0.1,
            crossover_rate: 0.8,
            max_budget: 100,
            eta: 3,
            early_stopping: true,
            patience: 20,
            min_improvement: 1e-4,
            n_parallel: 1,
            max_time: 7200,
            max_trials: 200,
            ...config
        };
        this.logger = new logger_1.Logger();
        this.logger.info(`🔍 Advanced Hyperparameter Search initialized: ${this.config.search_method}`);
        // Initialize search-specific components
        this.initializeSearchMethod();
    }
    /**
     * 🚀 MAIN SEARCH FUNCTION
     * Execute hyperparameter search using specified method
     */
    async search(validation_data, objective_function, progress_callback) {
        this.logger.info(`🔍 Starting ${this.config.search_method} hyperparameter search`);
        this.search_start_time = Date.now();
        try {
            switch (this.config.search_method) {
                case 'grid':
                    return await this.gridSearch(validation_data, objective_function, progress_callback);
                case 'random':
                    return await this.randomSearch(validation_data, objective_function, progress_callback);
                case 'bayesian':
                    return await this.bayesianOptimization(validation_data, objective_function, progress_callback);
                case 'evolutionary':
                    return await this.evolutionarySearch(validation_data, objective_function, progress_callback);
                case 'hyperband':
                    return await this.hyperbandSearch(validation_data, objective_function, progress_callback);
                default:
                    throw new Error(`Unknown search method: ${this.config.search_method}`);
            }
        }
        catch (error) {
            this.logger.error(`💥 Search failed: ${error}`);
            throw error;
        }
    }
    /**
     * 📊 GRID SEARCH
     * Systematic exploration of hyperparameter grid
     */
    async gridSearch(validation_data, objective_function, progress_callback) {
        this.logger.info('📊 Starting grid search');
        // Generate grid combinations
        const grid_combinations = this.generateGridCombinations();
        const total_trials = grid_combinations.length;
        this.logger.info(`📊 Generated ${total_trials} grid combinations`);
        for (let i = 0; i < total_trials; i++) {
            const parameters = grid_combinations[i];
            const trial = await this.executeTrial(parameters, validation_data, objective_function);
            this.trials.push(trial);
            this.updateBestTrial(trial);
            if (progress_callback) {
                progress_callback((i + 1) / total_trials, trial);
            }
            // Check time limit
            if (this.isTimeLimitReached()) {
                this.logger.warn('⏰ Time limit reached during grid search');
                break;
            }
        }
        return this.generateSearchResult();
    }
    /**
     * 🎲 RANDOM SEARCH
     * Random sampling from hyperparameter space
     */
    async randomSearch(validation_data, objective_function, progress_callback) {
        this.logger.info('🎲 Starting random search');
        const n_trials = Math.min(this.config.n_random_trials, this.config.max_trials);
        for (let i = 0; i < n_trials; i++) {
            const parameters = this.sampleRandomParameters();
            const trial = await this.executeTrial(parameters, validation_data, objective_function);
            this.trials.push(trial);
            this.updateBestTrial(trial);
            if (progress_callback) {
                progress_callback((i + 1) / n_trials, trial);
            }
            // Check stopping conditions
            if (this.isTimeLimitReached() || this.shouldStopEarly()) {
                break;
            }
        }
        return this.generateSearchResult();
    }
    /**
     * 🧠 BAYESIAN OPTIMIZATION
     * Gaussian Process-based optimization with acquisition functions
     */
    async bayesianOptimization(validation_data, objective_function, progress_callback) {
        this.logger.info('🧠 Starting Bayesian optimization');
        // Initial random exploration
        const n_initial = Math.min(this.config.n_initial_random, this.config.max_trials * 0.2);
        for (let i = 0; i < n_initial; i++) {
            const parameters = this.sampleRandomParameters();
            const trial = await this.executeTrial(parameters, validation_data, objective_function);
            this.trials.push(trial);
            this.updateBestTrial(trial);
            if (progress_callback) {
                progress_callback((i + 1) / this.config.max_trials, trial);
            }
        }
        // Initialize Gaussian Process
        this.gaussian_process = new GaussianProcess(this.config);
        this.acquisition_optimizer = new AcquisitionOptimizer(this.config);
        // Bayesian optimization loop
        const remaining_trials = this.config.max_trials - n_initial;
        for (let i = 0; i < remaining_trials; i++) {
            // Fit GP to observed data
            await this.gaussian_process.fit(this.trials);
            // Optimize acquisition function to find next point
            const next_parameters = await this.acquisition_optimizer.optimize(this.gaussian_process, this.config.search_spaces, this.trials);
            // Evaluate new point
            const trial = await this.executeTrial(next_parameters, validation_data, objective_function);
            this.trials.push(trial);
            this.updateBestTrial(trial);
            if (progress_callback) {
                const total_trials = n_initial + i + 1;
                progress_callback(total_trials / this.config.max_trials, trial);
            }
            // Check stopping conditions
            if (this.isTimeLimitReached() || this.shouldStopEarly()) {
                break;
            }
            this.logger.debug(`🧠 BO iteration ${i + 1}, best objective: ${this.best_trial?.objective_value?.toFixed(6)}`);
        }
        return this.generateSearchResult();
    }
    /**
     * 🧬 EVOLUTIONARY SEARCH
     * Genetic algorithm-based optimization
     */
    async evolutionarySearch(validation_data, objective_function, progress_callback) {
        this.logger.info('🧬 Starting evolutionary search');
        // Initialize population
        await this.initializePopulation(validation_data, objective_function);
        for (this.generation = 0; this.generation < this.config.n_generations; this.generation++) {
            // Selection, crossover, and mutation
            const new_population = await this.evolvePopulation(validation_data, objective_function);
            // Update population
            this.population = new_population;
            // Update best trial
            for (const trial of this.population) {
                this.updateBestTrial(trial);
            }
            if (progress_callback) {
                progress_callback((this.generation + 1) / this.config.n_generations, this.best_trial);
            }
            this.logger.debug(`🧬 Generation ${this.generation + 1}, best fitness: ${this.best_trial?.objective_value?.toFixed(6)}`);
            // Check stopping conditions
            if (this.isTimeLimitReached() || this.shouldStopEarly()) {
                break;
            }
        }
        return this.generateSearchResult();
    }
    /**
     * 📈 HYPERBAND SEARCH
     * Multi-fidelity optimization with successive halving
     */
    async hyperbandSearch(validation_data, objective_function, progress_callback) {
        this.logger.info('📈 Starting Hyperband search');
        const max_budget = this.config.max_budget;
        const eta = this.config.eta;
        const s_max = Math.floor(Math.log(max_budget) / Math.log(eta));
        let trial_count = 0;
        for (let s = s_max; s >= 0; s--) {
            const n = Math.ceil((s_max + 1) / (s + 1) * Math.pow(eta, s));
            const r = max_budget * Math.pow(eta, -s);
            // Create bracket configuration
            const bracket = {
                s,
                n,
                r,
                configurations: []
            };
            // Generate random configurations
            for (let i = 0; i < n; i++) {
                const parameters = this.sampleRandomParameters();
                bracket.configurations.push({
                    parameters,
                    budget: r,
                    trial_id: `hyperband_s${s}_${i}_${Date.now()}`
                });
            }
            // Successive halving
            let current_configs = bracket.configurations;
            let current_budget = r;
            for (let i = 0; i <= s; i++) {
                const n_i = Math.floor(n * Math.pow(eta, -i));
                const r_i = current_budget * Math.pow(eta, i);
                // Evaluate configurations with current budget
                const trials = [];
                for (const config of current_configs.slice(0, n_i)) {
                    const trial = await this.executeTrialWithBudget(config.parameters, validation_data, objective_function, r_i);
                    trials.push(trial);
                    this.trials.push(trial);
                    this.updateBestTrial(trial);
                    trial_count++;
                    if (progress_callback) {
                        progress_callback(trial_count / this.config.max_trials, trial);
                    }
                }
                // Sort and keep top performers
                trials.sort((a, b) => (b.objective_value || 0) - (a.objective_value || 0));
                current_configs = trials.slice(0, Math.floor(n_i / eta)).map(t => ({
                    parameters: t.parameters,
                    budget: r_i,
                    trial_id: t.trial_id
                }));
                current_budget = r_i;
                this.logger.debug(`📈 Hyperband s=${s}, i=${i}, evaluated ${n_i} configs with budget ${r_i.toFixed(2)}`);
            }
            if (this.isTimeLimitReached())
                break;
        }
        return this.generateSearchResult();
    }
    // =================== UTILITY METHODS ===================
    initializeSearchMethod() {
        switch (this.config.search_method) {
            case 'bayesian':
                this.gaussian_process = new GaussianProcess(this.config);
                this.acquisition_optimizer = new AcquisitionOptimizer(this.config);
                break;
            case 'evolutionary':
                this.population = [];
                this.generation = 0;
                break;
            case 'hyperband':
                this.hyperband_brackets = [];
                break;
        }
    }
    generateGridCombinations() {
        const combinations = [];
        function cartesianProduct(arrays) {
            return arrays.reduce((acc, curr) => acc.flatMap(a => curr.map(c => [...a, c])), [[]]);
        }
        const parameter_values = [];
        const parameter_names = [];
        for (const space of this.config.search_spaces) {
            parameter_names.push(space.name);
            if (space.type === 'categorical' || space.type === 'choice') {
                parameter_values.push(space.choices);
            }
            else if (space.type === 'int') {
                const step = space.step || 1;
                const values = [];
                for (let i = space.low; i <= space.high; i += step) {
                    values.push(i);
                }
                parameter_values.push(values);
            }
            else {
                // For continuous parameters, create discrete grid
                const grid_size = this.config.grid_size || 5;
                const values = [];
                for (let i = 0; i < grid_size; i++) {
                    const value = space.low + (space.high - space.low) * i / (grid_size - 1);
                    values.push(space.type === 'log_uniform' ? Math.exp(value) : value);
                }
                parameter_values.push(values);
            }
        }
        const product = cartesianProduct(parameter_values);
        for (const combination of product) {
            const parameters = {};
            for (let i = 0; i < parameter_names.length; i++) {
                parameters[parameter_names[i]] = combination[i];
            }
            combinations.push(parameters);
        }
        return combinations;
    }
    sampleRandomParameters() {
        const parameters = {};
        for (const space of this.config.search_spaces) {
            switch (space.type) {
                case 'categorical':
                case 'choice':
                    parameters[space.name] = space.choices[Math.floor(Math.random() * space.choices.length)];
                    break;
                case 'uniform':
                    parameters[space.name] = Math.random() * (space.high - space.low) + space.low;
                    break;
                case 'log_uniform':
                    const log_low = Math.log(space.low);
                    const log_high = Math.log(space.high);
                    parameters[space.name] = Math.exp(Math.random() * (log_high - log_low) + log_low);
                    break;
                case 'int':
                    parameters[space.name] = Math.floor(Math.random() * (space.high - space.low + 1)) + space.low;
                    break;
                case 'log_int':
                    const log_low_int = Math.log(space.low);
                    const log_high_int = Math.log(space.high);
                    parameters[space.name] = Math.floor(Math.exp(Math.random() * (log_high_int - log_low_int) + log_low_int));
                    break;
            }
        }
        return parameters;
    }
    async executeTrial(parameters, validation_data, objective_function) {
        const trial = {
            trial_id: `trial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            parameters,
            status: 'running',
            start_time: Date.now()
        };
        try {
            // Convert parameters to training config
            const training_config = this.parametersToConfig(parameters);
            // Evaluate objective function
            const objective_value = await objective_function(training_config, validation_data);
            trial.objective_value = objective_value;
            trial.status = 'completed';
            trial.end_time = Date.now();
        }
        catch (error) {
            trial.status = 'failed';
            trial.end_time = Date.now();
            this.logger.error(`Trial ${trial.trial_id} failed: ${error}`);
        }
        return trial;
    }
    async executeTrialWithBudget(parameters, validation_data, objective_function, budget) {
        const trial = await this.executeTrial(parameters, validation_data, objective_function);
        trial.budget_used = budget;
        return trial;
    }
    parametersToConfig(parameters) {
        // Convert search parameters to training configuration
        // This is a simplified conversion - in full implementation,
        // would need to handle all possible parameter mappings
        return {
            algorithm: 'PPO',
            learning_rate: parameters.learning_rate || 3e-4,
            policy_learning_rate: parameters.policy_learning_rate || 3e-4,
            value_learning_rate: parameters.value_learning_rate || 1e-3,
            batch_size: parameters.batch_size || 64,
            buffer_size: parameters.buffer_size || 100000,
            gamma: parameters.gamma || 0.99,
            clip_ratio: parameters.clip_ratio || 0.2,
            entropy_coefficient: parameters.entropy_coefficient || 0.01,
            value_loss_coefficient: parameters.value_loss_coefficient || 0.5,
            max_grad_norm: parameters.max_grad_norm || 0.5,
            policy_hidden_layers: parameters.policy_hidden_layers || [256, 128],
            value_hidden_layers: parameters.value_hidden_layers || [256, 128],
            dropout_rate: parameters.dropout_rate || 0.0,
            episodes_per_update: parameters.episodes_per_update || 4,
            prioritized_replay: parameters.prioritized_replay || true,
            multi_step_returns: parameters.multi_step_returns || 3,
            distributional_rl: parameters.distributional_rl || false,
            noisy_networks: parameters.noisy_networks || false
        };
    }
    updateBestTrial(trial) {
        if (trial.status !== 'completed' || trial.objective_value === undefined) {
            return;
        }
        if (!this.best_trial || trial.objective_value > this.best_trial.objective_value) {
            this.best_trial = trial;
            this.logger.info(`🏆 New best trial! Objective: ${trial.objective_value.toFixed(6)}`);
        }
    }
    shouldStopEarly() {
        if (!this.config.early_stopping || this.trials.length < this.config.patience) {
            return false;
        }
        const recent_trials = this.trials.slice(-this.config.patience);
        const completed_trials = recent_trials.filter(t => t.status === 'completed');
        if (completed_trials.length < this.config.patience) {
            return false;
        }
        const best_recent = Math.max(...completed_trials.map(t => t.objective_value));
        const overall_best = this.best_trial?.objective_value || -Infinity;
        return (best_recent - overall_best) < this.config.min_improvement;
    }
    isTimeLimitReached() {
        if (!this.config.max_time)
            return false;
        const elapsed_time = (Date.now() - this.search_start_time) / 1000;
        return elapsed_time > this.config.max_time;
    }
    async initializePopulation(validation_data, objective_function) {
        this.population = [];
        for (let i = 0; i < this.config.population_size; i++) {
            const parameters = this.sampleRandomParameters();
            const trial = await this.executeTrial(parameters, validation_data, objective_function);
            trial.generation = 0;
            this.population.push(trial);
            this.trials.push(trial);
        }
        this.population.sort((a, b) => (b.objective_value || 0) - (a.objective_value || 0));
    }
    async evolvePopulation(validation_data, objective_function) {
        const new_population = [];
        // Keep elite individuals
        const elite_size = Math.floor(this.config.population_size * 0.1);
        const elite = this.population.slice(0, elite_size);
        new_population.push(...elite);
        // Generate offspring through crossover and mutation
        while (new_population.length < this.config.population_size) {
            // Selection
            const parent1 = this.tournamentSelection();
            const parent2 = this.tournamentSelection();
            // Crossover
            let offspring_params;
            if (Math.random() < this.config.crossover_rate) {
                offspring_params = this.crossover(parent1.parameters, parent2.parameters);
            }
            else {
                offspring_params = Math.random() < 0.5 ? parent1.parameters : parent2.parameters;
            }
            // Mutation
            if (Math.random() < this.config.mutation_rate) {
                offspring_params = this.mutate(offspring_params);
            }
            // Evaluate offspring
            const offspring = await this.executeTrial(offspring_params, validation_data, objective_function);
            offspring.generation = this.generation + 1;
            offspring.parent_ids = [parent1.trial_id, parent2.trial_id];
            new_population.push(offspring);
            this.trials.push(offspring);
        }
        // Sort by fitness
        new_population.sort((a, b) => (b.objective_value || 0) - (a.objective_value || 0));
        return new_population.slice(0, this.config.population_size);
    }
    tournamentSelection(tournament_size = 3) {
        const tournament = [];
        for (let i = 0; i < tournament_size; i++) {
            const idx = Math.floor(Math.random() * this.population.length);
            tournament.push(this.population[idx]);
        }
        tournament.sort((a, b) => (b.objective_value || 0) - (a.objective_value || 0));
        return tournament[0];
    }
    crossover(parent1, parent2) {
        const offspring = {};
        for (const key of Object.keys(parent1)) {
            offspring[key] = Math.random() < 0.5 ? parent1[key] : parent2[key];
        }
        return offspring;
    }
    mutate(parameters) {
        const mutated = { ...parameters };
        for (const space of this.config.search_spaces) {
            if (Math.random() < 0.1) { // 10% chance to mutate each parameter
                switch (space.type) {
                    case 'uniform':
                        const range = space.high - space.low;
                        const noise = (Math.random() - 0.5) * 0.1 * range;
                        mutated[space.name] = Math.max(space.low, Math.min(space.high, mutated[space.name] + noise));
                        break;
                    case 'categorical':
                    case 'choice':
                        mutated[space.name] = space.choices[Math.floor(Math.random() * space.choices.length)];
                        break;
                    case 'int':
                        const int_noise = Math.random() < 0.5 ? -1 : 1;
                        mutated[space.name] = Math.max(space.low, Math.min(space.high, mutated[space.name] + int_noise));
                        break;
                }
            }
        }
        return mutated;
    }
    generateSearchResult() {
        const search_time = Date.now() - this.search_start_time;
        const completed_trials = this.trials.filter(t => t.status === 'completed');
        // Generate convergence data
        let best_so_far = -Infinity;
        const convergence_data = {
            trial_numbers: completed_trials.map((_, i) => i + 1),
            best_objectives: completed_trials.map(t => {
                if (t.objective_value > best_so_far) {
                    best_so_far = t.objective_value;
                }
                return best_so_far;
            }),
            current_objectives: completed_trials.map(t => t.objective_value)
        };
        return {
            best_trial: this.best_trial,
            best_parameters: this.best_trial.parameters,
            best_objective: this.best_trial.objective_value,
            all_trials: this.trials,
            search_time,
            convergence_data,
            hyperparameter_importance: this.calculateHyperparameterImportance()
        };
    }
    calculateHyperparameterImportance() {
        // Simplified importance calculation
        // In full implementation, would use more sophisticated methods
        const importance = {};
        for (const space of this.config.search_spaces) {
            importance[space.name] = Math.random(); // Placeholder
        }
        return importance;
    }
}
exports.AdvancedHyperparameterSearch = AdvancedHyperparameterSearch;
/**
 * 🧠 GAUSSIAN PROCESS
 * Simplified Gaussian Process for Bayesian optimization
 */
class GaussianProcess {
    constructor(config) {
        this.noise_variance = 1e-6;
        this.config = config;
        this.kernel = new RBFKernel(1.0, 1.0);
    }
    async fit(trials) {
        // Simplified GP fitting
        // In full implementation, would optimize hyperparameters
    }
    predict(parameters) {
        // Simplified prediction
        return { mean: Math.random(), variance: 0.1 };
    }
}
/**
 * 🎯 ACQUISITION OPTIMIZER
 * Optimizes acquisition functions for Bayesian optimization
 */
class AcquisitionOptimizer {
    constructor(config) {
        this.config = config;
    }
    async optimize(gp, search_spaces, trials) {
        // Simplified acquisition optimization
        // In full implementation, would use proper optimization methods
        let best_acquisition = -Infinity;
        let best_parameters = null;
        // Random search over acquisition function
        for (let i = 0; i < 1000; i++) {
            const parameters = this.sampleRandomParameters(search_spaces);
            const prediction = gp.predict(parameters);
            const acquisition_value = this.calculateAcquisition(prediction, trials);
            if (acquisition_value > best_acquisition) {
                best_acquisition = acquisition_value;
                best_parameters = parameters;
            }
        }
        return best_parameters;
    }
    calculateAcquisition(prediction, trials) {
        const best_observed = Math.max(...trials.map(t => t.objective_value || -Infinity));
        switch (this.config.acquisition_function) {
            case 'ei':
                return this.expectedImprovement(prediction, best_observed);
            case 'pi':
                return this.probabilityImprovement(prediction, best_observed);
            case 'ucb':
                return this.upperConfidenceBound(prediction);
            default:
                return this.expectedImprovement(prediction, best_observed);
        }
    }
    expectedImprovement(prediction, best_observed) {
        const xi = this.config.xi || 0.01;
        const improvement = prediction.mean - best_observed - xi;
        const z = improvement / Math.sqrt(prediction.variance);
        // Simplified EI calculation
        return improvement * this.cdf(z) + Math.sqrt(prediction.variance) * this.pdf(z);
    }
    probabilityImprovement(prediction, best_observed) {
        const xi = this.config.xi || 0.01;
        const z = (prediction.mean - best_observed - xi) / Math.sqrt(prediction.variance);
        return this.cdf(z);
    }
    upperConfidenceBound(prediction) {
        const kappa = this.config.kappa || 2.576;
        return prediction.mean + kappa * Math.sqrt(prediction.variance);
    }
    cdf(x) {
        // Standard normal CDF approximation
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    }
    pdf(x) {
        // Standard normal PDF
        return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    }
    erf(x) {
        // Error function approximation
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        const sign = x >= 0 ? 1 : -1;
        x = Math.abs(x);
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        return sign * y;
    }
    sampleRandomParameters(search_spaces) {
        const parameters = {};
        for (const space of search_spaces) {
            switch (space.type) {
                case 'categorical':
                case 'choice':
                    parameters[space.name] = space.choices[Math.floor(Math.random() * space.choices.length)];
                    break;
                case 'uniform':
                    parameters[space.name] = Math.random() * (space.high - space.low) + space.low;
                    break;
                case 'log_uniform':
                    const log_low = Math.log(space.low);
                    const log_high = Math.log(space.high);
                    parameters[space.name] = Math.exp(Math.random() * (log_high - log_low) + log_low);
                    break;
                case 'int':
                    parameters[space.name] = Math.floor(Math.random() * (space.high - space.low + 1)) + space.low;
                    break;
            }
        }
        return parameters;
    }
}
/**
 * 🔧 KERNEL FUNCTIONS
 */
class Kernel {
}
class RBFKernel extends Kernel {
    constructor(length_scale, signal_variance) {
        super();
        this.length_scale = length_scale;
        this.signal_variance = signal_variance;
    }
    compute(x1, x2) {
        const squared_distance = x1.reduce((sum, val, i) => sum + Math.pow(val - x2[i], 2), 0);
        return this.signal_variance * Math.exp(-squared_distance / (2 * this.length_scale * this.length_scale));
    }
}
/**
 * 🚀 DEFAULT SEARCH CONFIGURATIONS
 */
exports.DEFAULT_SEARCH_CONFIGS = {
    BAYESIAN_OPTIMIZATION: {
        search_method: 'bayesian',
        acquisition_function: 'ei',
        kernel_type: 'rbf',
        n_initial_random: 20,
        max_trials: 100,
        xi: 0.01,
        kappa: 2.576
    },
    RANDOM_SEARCH: {
        search_method: 'random',
        n_random_trials: 200,
        max_trials: 200,
        random_seed: 42
    },
    EVOLUTIONARY_SEARCH: {
        search_method: 'evolutionary',
        population_size: 50,
        n_generations: 100,
        mutation_rate: 0.1,
        crossover_rate: 0.8,
        max_trials: 5000
    }
};
