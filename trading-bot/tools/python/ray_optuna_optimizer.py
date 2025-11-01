# 🔧 [DEVELOPMENT-TOOL]
# Python development tool for optimization and metrics
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Ray Tune + Optuna Integration for Trading Strategy Optimization

This script provides a distributed optimization framework for trading strategies
using Ray Tune for distributed execution and Optuna for efficient parameter search.
If Ray Tune is not available, falls back to Optuna-only implementation.
"""

import os
import sys
import json
import time
import random
from typing import Dict, List, Any, Optional, Union, Tuple

# Initialize flags for available libraries
RAY_AVAILABLE = False
TUNE_AVAILABLE = False

# Check if Ray and Optuna are installed
try:
    # Try to import Ray and Ray Tune
    import ray
    RAY_AVAILABLE = True
    
    try:
        from ray import tune
        from ray.tune.search.optuna import OptunaSearch
        TUNE_AVAILABLE = True
    except ImportError:
        print(json.dumps({
            "status": "warning",
            "message": "Ray Tune components not available. Using Optuna-only implementation."
        }))
except ImportError:
    # Ray not available, fallback to Optuna only
    print(json.dumps({
        "status": "warning",
        "message": "Ray not available. Using Optuna-only implementation."
    }))

# Import Optuna and other required packages
try:
    import optuna
    import pandas as pd
    import numpy as np
    import matplotlib.pyplot as plt
except ImportError as e:
    print(json.dumps({
        "status": "error",
        "message": f"Required package not installed: {str(e)}. Please run 'pip install optuna==3.5.0 pandas numpy matplotlib'"
    }))
    sys.exit(1)


class RayOptunaOptimizer:
    """
    Distributed optimizer using Ray Tune with Optuna search algorithm
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the optimizer with the given configuration
        
        Args:
            config: Configuration dictionary with the following keys:
                - strategy_name: Name of the strategy to optimize
                - search_space: Parameter search space definition
                - num_trials: Number of trials to run
                - metric: Metric to optimize
                - mode: 'max' or 'min'
                - num_workers: Number of parallel workers
                - output_dir: Directory to save results
        """
        self.config = config
        self.best_result = None
        self.all_results = []
        
        # Set default values if not provided
        self.config.setdefault('num_workers', 4)
        self.config.setdefault('mode', 'max')
        self.config.setdefault('output_dir', './results/optimization')
        
        # Ensure output directory exists
        os.makedirs(self.config['output_dir'], exist_ok=True)
        
    def objective_function(self, config: Dict[str, Any]) -> Dict[str, float]:
        """
        Objective function for Ray Tune to evaluate
        
        In a real implementation, this would call your trading strategy backtesting function.
        Here we simulate a result for demonstration purposes.
        
        Args:
            config: Parameter configuration to evaluate
            
        Returns:
            Dictionary of metric results
        """
        # Simulate a trading strategy backtest
        # In a real implementation, you would call your trading backtest function here
        time.sleep(0.5)  # Simulate computation time
        
        # Extract parameters (for demonstration)
        rsi_period = config.get('rsi_period', 14)
        overbought = config.get('overbought', 70)
        oversold = config.get('oversold', 30)
        
        # Simulate performance metrics
        # In a real implementation, these would be actual backtest results
        profit_factor = 1.0 + 0.1 * (abs(rsi_period - 15) / 10)
        profit_factor += 0.2 * (abs(overbought - 75) / 20)
        profit_factor += 0.2 * (abs(oversold - 25) / 15)
        
        # Add some noise
        profit_factor *= (0.9 + 0.2 * random.random())
        
        # Calculate other metrics based on profit_factor
        win_rate = 0.4 + (profit_factor - 1) * 0.1 + 0.1 * random.random()
        expectancy = (profit_factor - 1) * 0.5 + 0.2 * random.random()
        max_drawdown = 10 + (3 - min(3, profit_factor)) * 10 + 5 * random.random()
        sharpe_ratio = (profit_factor - 1) * 0.5 + 0.3 * random.random()
        
        return {
            "profit_factor": profit_factor,
            "win_rate": win_rate * 100,
            "expectancy": expectancy,
            "max_drawdown": max_drawdown,
            "sharpe_ratio": sharpe_ratio,
        }
    
    def run_optimization(self) -> Dict[str, Any]:
        """
        Run the distributed optimization
        
        Returns:
            Dictionary with optimization results
        """
        global TUNE_AVAILABLE
        
        start_time = time.time()
        
        # Send JSON progress updates
        print(json.dumps({
            "status": "progress",
            "message": f"Starting distributed optimization for {self.config['strategy_name']}"
        }))
        
        print(json.dumps({
            "status": "progress",
            "message": f"Number of trials: {self.config['num_trials']}"
        }))
        
        print(json.dumps({
            "status": "progress",
            "message": f"Optimizing for {self.config['metric']} ({self.config['mode']})"
        }))
        
        best_result = None
        all_results = []
        analysis = None
        results_file = None
        
        # Run optimization
        if TUNE_AVAILABLE:
            try:
                # Initialize Ray if it's not already initialized
                if not ray.is_initialized():
                    try:
                        ray.init(num_cpus=self.config['num_workers'], ignore_reinit_error=True)
                        print(json.dumps({
                            "status": "progress",
                            "message": f"Ray initialized with {self.config['num_workers']} CPUs"
                        }))
                    except Exception as e:
                        print(json.dumps({
                            "status": "warning",
                            "message": f"Failed to initialize Ray: {str(e)}. Using Optuna-only implementation."
                        }))
                        TUNE_AVAILABLE = False
                
                if TUNE_AVAILABLE:
                    search_space = {}
                    for param_name, param_config in self.config['search_space'].items():
                        if param_config['type'] == 'int':
                            search_space[param_name] = tune.randint(param_config['min'], param_config['max'])
                        elif param_config['type'] == 'float':
                            search_space[param_name] = tune.uniform(param_config['min'], param_config['max'])
                        elif param_config['type'] == 'categorical':
                            search_space[param_name] = tune.choice(param_config['values'])
                    
                    # Configure Optuna search algorithm
                    optuna_search = OptunaSearch(
                        metric=self.config['metric'],
                        mode=self.config['mode'],
                        # You can configure Optuna sampler here
                        sampler=optuna.samplers.TPESampler()
                    )
                    
                    # Run optimization
                    analysis = tune.run(
                        self.objective_function,
                        config=search_space,
                        num_samples=self.config['num_trials'],
                        search_alg=optuna_search,
                        resources_per_trial={"cpu": 1},
                        verbose=1,
                        local_dir=self.config['output_dir'],
                    )
                    
                    # Get best result
                    best_trial = analysis.best_trial
                    best_result = {
                        "parameters": best_trial.config,
                        "metrics": best_trial.last_result,
                        "trial_id": best_trial.trial_id,
                    }
                    
                    # Get all results
                    all_results = []
                    for trial in analysis.trials:
                        if trial.last_result:
                            all_results.append({
                                "parameters": trial.config,
                                "metrics": trial.last_result,
                                "trial_id": trial.trial_id,
                            })
            except Exception as e:
                print(json.dumps({
                    "status": "warning",
                    "message": f"Error using Ray Tune: {str(e)}. Falling back to Optuna-only implementation."
                }))
                TUNE_AVAILABLE = False
        
        # If Ray Tune is not available or failed, fall back to Optuna
        if not TUNE_AVAILABLE:
            print(json.dumps({
                "status": "progress",
                "message": "Using Optuna-only implementation"
            }))
            
            # Create Optuna study
            study = optuna.create_study(
                direction=optuna.study.StudyDirection.MAXIMIZE if self.config['mode'] == 'max' else optuna.study.StudyDirection.MINIMIZE,
                sampler=optuna.samplers.TPESampler()
            )
            
            # Define the objective function for Optuna
            def optuna_objective(trial):
                # Convert search space definition to Optuna trial parameters
                config = {}
                for param_name, param_config in self.config['search_space'].items():
                    if param_config['type'] == 'int':
                        config[param_name] = trial.suggest_int(param_name, param_config['min'], param_config['max'])
                    elif param_config['type'] == 'float':
                        config[param_name] = trial.suggest_float(param_name, param_config['min'], param_config['max'])
                    elif param_config['type'] == 'categorical':
                        config[param_name] = trial.suggest_categorical(param_name, param_config['values'])
                
                # Call the original objective function
                result = self.objective_function(config)
                
                # Add additional metrics as user attributes
                for key, value in result.items():
                    if key != self.config['metric']:
                        trial.set_user_attr(key, value)
                
                # Return the metric to optimize
                return result[self.config['metric']]
            
            # Run optimization
            study.optimize(optuna_objective, n_trials=self.config['num_trials'])
            
            # Get best result
            best_trial = study.best_trial
            best_result = {
                "parameters": best_trial.params,
                "metrics": {
                    self.config['metric']: best_trial.value
                }
            }
            
            # Add additional metrics from user attributes
            for key, value in best_trial.user_attrs.items():
                best_result["metrics"][key] = value
            
            # Get all results
            all_results = []
            for trial in study.trials:
                if trial.state == optuna.trial.TrialState.COMPLETE:
                    result = {
                        "parameters": trial.params,
                        "metrics": {
                            self.config['metric']: trial.value
                        },
                        "trial_id": trial.number
                    }
                    
                    # Add additional metrics from user attributes
                    for key, value in trial.user_attrs.items():
                        result["metrics"][key] = value
                        
                    all_results.append(result)
        
        # Calculate runtime
        runtime = time.time() - start_time
        
        # Prepare result summary
        result_summary = {
            "strategy_name": self.config['strategy_name'],
            "best_parameters": best_result["parameters"] if best_result else {},
            "best_metrics": best_result["metrics"] if best_result else {},
            "all_trials": all_results,
            "completed_trials": len(all_results),
            "runtime_seconds": runtime,
            "timestamp": time.time(),
        }
        
        # Save results to file
        results_file = os.path.join(
            self.config['output_dir'],
            f"{self.config['strategy_name']}_results_{int(time.time())}.json"
        )
        with open(results_file, 'w') as f:
            json.dump(result_summary, f, indent=2)
        
        # Generate visualization
        if TUNE_AVAILABLE and analysis:
            self._generate_ray_plots(analysis, results_file)
        else:
            self._generate_optuna_plots(study, results_file)
        
        # Send final JSON progress updates
        print(json.dumps({
            "status": "progress",
            "message": f"Optimization completed in {runtime:.2f} seconds"
        }))
        
        if best_result:
            print(json.dumps({
                "status": "progress",
                "message": f"Best {self.config['metric']}: {best_result['metrics'][self.config['metric']]:.4f}"
            }))
            
            print(json.dumps({
                "status": "progress",
                "message": f"Best parameters: {best_result['parameters']}"
            }))
        
        print(json.dumps({
            "status": "progress",
            "message": f"Results saved to {results_file}"
        }))
        
        return result_summary
    
    def _generate_ray_plots(self, analysis, base_filename: str) -> None:
        """
        Generate optimization visualization plots for Ray Tune
        
        Args:
            analysis: Ray Tune ExperimentAnalysis object
            base_filename: Base filename for saving plots
        """
        # Plot optimization history using matplotlib
        plt.figure(figsize=(10, 6))
        
        # Extract trial data
        trials_df = analysis.results_df
        
        if not trials_df.empty and self.config['metric'] in trials_df.columns:
            # Plot optimization progress
            plt.plot(range(len(trials_df)), trials_df[self.config['metric']])
            plt.xlabel('Trial')
            plt.ylabel(self.config['metric'])
            plt.title(f'Optimization Progress for {self.config["strategy_name"]}')
            plt.grid(True)
            plt.tight_layout()
            plt.savefig(f"{base_filename.replace('.json', '')}_history.png")
            
            # Plot parameter importance if we have scikit-learn
            try:
                from sklearn.ensemble import RandomForestRegressor
                from sklearn.inspection import permutation_importance
                
                # Prepare data for importance analysis
                X = trials_df.drop(columns=[self.config['metric']])
                y = trials_df[self.config['metric']]
                
                # Only include numerical features
                numerical_cols = X.select_dtypes(include=['number']).columns
                X = X[numerical_cols]
                
                if len(X) > 10 and not X.empty:  # Need enough samples for meaningful analysis
                    # Train a random forest to estimate feature importance
                    model = RandomForestRegressor(n_estimators=50, random_state=0)
                    model.fit(X, y)
                    
                    # Calculate permutation importance
                    result = permutation_importance(model, X, y, n_repeats=10, random_state=0)
                    
                    # Plot importance
                    plt.figure(figsize=(10, 6))
                    sorted_idx = result.importances_mean.argsort()
                    plt.barh(X.columns[sorted_idx], result.importances_mean[sorted_idx])
                    plt.xlabel('Permutation Importance')
                    plt.title('Parameter Importance')
                    plt.tight_layout()
                    plt.savefig(f"{base_filename.replace('.json', '')}_importance.png")
            except Exception as e:
                print(json.dumps({
                    "status": "warning",
                    "message": f"Could not generate parameter importance plot: {str(e)}"
                }))
        else:
            print(json.dumps({
                "status": "warning",
                "message": "Not enough data to generate plots"
            }))
    
    def _generate_optuna_plots(self, study, base_filename: str) -> None:
        """
        Generate optimization visualization plots for Optuna
        
        Args:
            study: Optuna study object
            base_filename: Base filename for saving plots
        """
        try:
            # Plot optimization history
            plt.figure(figsize=(10, 6))
            optuna.visualization.matplotlib.plot_optimization_history(study)
            plt.tight_layout()
            plt.savefig(f"{base_filename.replace('.json', '')}_history.png")
            
            # Plot parameter importances
            try:
                plt.figure(figsize=(10, 6))
                optuna.visualization.matplotlib.plot_param_importances(study)
                plt.tight_layout()
                plt.savefig(f"{base_filename.replace('.json', '')}_importance.png")
            except Exception:
                print(json.dumps({
                    "status": "warning",
                    "message": "Could not generate parameter importance plot"
                }))
            
            # Plot parallel coordinate plot
            plt.figure(figsize=(12, 8))
            optuna.visualization.matplotlib.plot_parallel_coordinate(study)
            plt.tight_layout()
            plt.savefig(f"{base_filename.replace('.json', '')}_parallel.png")
        except Exception as e:
            print(json.dumps({
                "status": "warning",
                "message": f"Could not generate Optuna plots: {str(e)}"
            }))
        else:
            print(json.dumps({
                "status": "warning",
                "message": "Not enough data to generate plots"
            }))


class OptunaOptimizer:
    """
    Optimizer using only Optuna (fallback if Ray is not available)
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the optimizer with the given configuration
        
        Args:
            config: Configuration dictionary with the following keys:
                - strategy_name: Name of the strategy to optimize
                - search_space: Parameter search space definition
                - num_trials: Number of trials to run
                - metric: Metric to optimize
                - mode: 'max' or 'min'
                - num_workers: Number of parallel workers (for future distributed implementation)
                - output_dir: Directory to save results
        """
        self.config = config
        self.best_result = None
        self.all_results = []
        
        # Set default values if not provided
        self.config.setdefault('num_workers', 4)
        self.config.setdefault('mode', 'max')
        self.config.setdefault('output_dir', './results/optimization')
        
        # Ensure output directory exists
        os.makedirs(self.config['output_dir'], exist_ok=True)
        
        # Determine study direction
        self.direction = optuna.study.StudyDirection.MAXIMIZE if self.config['mode'] == 'max' else optuna.study.StudyDirection.MINIMIZE
    
    def objective(self, trial: optuna.Trial) -> float:
        """
        Objective function for Optuna to evaluate
        
        In a real implementation, this would call your trading strategy backtesting function.
        Here we simulate a result for demonstration purposes.
        
        Args:
            trial: Optuna trial object
            
        Returns:
            Metric value to optimize
        """
        # Convert search space definition to Optuna trial parameters
        config = {}
        for param_name, param_config in self.config['search_space'].items():
            if param_config['type'] == 'int':
                config[param_name] = trial.suggest_int(param_name, param_config['min'], param_config['max'])
            elif param_config['type'] == 'float':
                config[param_name] = trial.suggest_float(param_name, param_config['min'], param_config['max'])
            elif param_config['type'] == 'categorical':
                config[param_name] = trial.suggest_categorical(param_name, param_config['values'])
        
        # Simulate a trading strategy backtest
        # In a real implementation, you would call your trading backtest function here
        time.sleep(0.5)  # Simulate computation time
        
        # Extract parameters (for demonstration)
        rsi_period = config.get('rsi_period', 14)
        overbought = config.get('overbought', 70)
        oversold = config.get('oversold', 30)
        
        # Simulate performance metrics
        # In a real implementation, these would be actual backtest results
        profit_factor = 1.0 + 0.1 * (abs(rsi_period - 15) / 10)
        profit_factor += 0.2 * (abs(overbought - 75) / 20)
        profit_factor += 0.2 * (abs(oversold - 25) / 15)
        
        # Add some noise
        profit_factor *= (0.9 + 0.2 * random.random())
        
        # Calculate other metrics based on profit_factor
        win_rate = 0.4 + (profit_factor - 1) * 0.1 + 0.1 * random.random()
        expectancy = (profit_factor - 1) * 0.5 + 0.2 * random.random()
        max_drawdown = 10 + (3 - min(3, profit_factor)) * 10 + 5 * random.random()
        sharpe_ratio = (profit_factor - 1) * 0.5 + 0.3 * random.random()
        
        # Store additional metrics as trial user attributes
        trial.set_user_attr("win_rate", win_rate * 100)
        trial.set_user_attr("expectancy", expectancy)
        trial.set_user_attr("max_drawdown", max_drawdown)
        trial.set_user_attr("sharpe_ratio", sharpe_ratio)
        
        # Return the metric to optimize
        return profit_factor if self.config['metric'] == 'profit_factor' else eval(self.config['metric'])
    
    def run_optimization(self) -> Dict[str, Any]:
        """
        Run the optimization
        
        Returns:
            Dictionary with optimization results
        """
        start_time = time.time()
        
        # Send JSON progress updates
        print(json.dumps({
            "status": "progress",
            "message": f"Starting optimization for {self.config['strategy_name']}"
        }))
        
        print(json.dumps({
            "status": "progress", 
            "message": f"Number of trials: {self.config['num_trials']}"
        }))
        
        print(json.dumps({
            "status": "progress",
            "message": f"Optimizing for {self.config['metric']} ({self.config['mode']})"
        }))
        
        # Create Optuna study
        study = optuna.create_study(
            direction=self.direction,
            sampler=optuna.samplers.TPESampler(),
            pruner=optuna.pruners.MedianPruner()
        )
        
        # Run optimization
        study.optimize(self.objective, n_trials=self.config['num_trials'])
        
        # Get best result
        best_trial = study.best_trial
        best_result = {
            "parameters": best_trial.params,
            "metrics": {
                self.config['metric']: best_trial.value,
                "win_rate": best_trial.user_attrs.get("win_rate"),
                "expectancy": best_trial.user_attrs.get("expectancy"),
                "max_drawdown": best_trial.user_attrs.get("max_drawdown"),
                "sharpe_ratio": best_trial.user_attrs.get("sharpe_ratio")
            },
            "trial_id": best_trial.number,
        }
        
        # Get all results
        all_results = []
        for trial in study.trials:
            if trial.state == optuna.trial.TrialState.COMPLETE:
                all_results.append({
                    "parameters": trial.params,
                    "metrics": {
                        self.config['metric']: trial.value,
                        "win_rate": trial.user_attrs.get("win_rate"),
                        "expectancy": trial.user_attrs.get("expectancy"),
                        "max_drawdown": trial.user_attrs.get("max_drawdown"),
                        "sharpe_ratio": trial.user_attrs.get("sharpe_ratio")
                    },
                    "trial_id": trial.number,
                })
        
        # Calculate runtime
        runtime = time.time() - start_time
        
        # Prepare result summary
        result_summary = {
            "strategy_name": self.config['strategy_name'],
            "best_parameters": best_result["parameters"],
            "best_metrics": best_result["metrics"],
            "all_trials": all_results,
            "completed_trials": len(all_results),
            "runtime_seconds": runtime,
            "timestamp": time.time(),
        }
        
        # Save results to file
        results_file = os.path.join(
            self.config['output_dir'],
            f"{self.config['strategy_name']}_results_{int(time.time())}.json"
        )
        with open(results_file, 'w') as f:
            json.dump(result_summary, f, indent=2)
        
        # Generate visualization
        self._generate_optimization_plots(study, results_file)
        
        # Send final JSON progress updates
        print(json.dumps({
            "status": "progress",
            "message": f"Optimization completed in {runtime:.2f} seconds"
        }))
        
        print(json.dumps({
            "status": "progress",
            "message": f"Best {self.config['metric']}: {best_result['metrics'][self.config['metric']]:.4f}"
        }))
        
        print(json.dumps({
            "status": "progress",
            "message": f"Best parameters: {best_result['parameters']}"
        }))
        
        print(json.dumps({
            "status": "progress",
            "message": f"Results saved to {results_file}"
        }))
        
        return result_summary
    
    def _generate_optimization_plots(self, study: optuna.Study, base_filename: str) -> None:
        """
        Generate optimization visualization plots
        
        Args:
            study: Optuna study object
            base_filename: Base filename for saving plots
        """
        # Plot optimization history
        plt.figure(figsize=(10, 6))
        optuna.visualization.matplotlib.plot_optimization_history(study)
        plt.tight_layout()
        plt.savefig(f"{base_filename.replace('.json', '')}_history.png")
        
        # Plot parameter importances
        try:
            plt.figure(figsize=(10, 6))
            optuna.visualization.matplotlib.plot_param_importances(study)
            plt.tight_layout()
            plt.savefig(f"{base_filename.replace('.json', '')}_importance.png")
        except:
            print(json.dumps({
                "status": "warning",
                "message": "Could not generate parameter importance plot"
            }))
        
        # Plot parallel coordinate plot
        plt.figure(figsize=(12, 8))
        optuna.visualization.matplotlib.plot_parallel_coordinate(study)
        plt.tight_layout()
        plt.savefig(f"{base_filename.replace('.json', '')}_parallel.png")


def process_command(command: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process commands from TypeScript code
    
    Args:
        command: Command dictionary with action and parameters
        
    Returns:
        Dictionary with results
    """
    action = command.get("action")
    
    if action == "run_optimization":
        # Check what implementations are available
        if RAY_AVAILABLE and TUNE_AVAILABLE:
            try:
                # Run optimization with Ray and Optuna
                optimizer = RayOptunaOptimizer(command.get("config", {}))
                results = optimizer.run_optimization()
                return {
                    "status": "success",
                    "results": results,
                    "implementation": "ray_optuna"
                }
            except Exception as e:
                print(json.dumps({
                    "status": "warning",
                    "message": f"Error with Ray Tune implementation: {str(e)}. Falling back to Optuna-only."
                }))
                # Fall back to Optuna-only implementation
                optimizer = OptunaOptimizer(command.get("config", {}))
                results = optimizer.run_optimization()
                return {
                    "status": "success",
                    "results": results,
                    "implementation": "optuna_only"
                }
        else:
            # Use Optuna-only implementation
            print(json.dumps({
                "status": "info",
                "message": "Ray Tune not available, using Optuna-only implementation"
            }))
            optimizer = OptunaOptimizer(command.get("config", {}))
            results = optimizer.run_optimization()
            return {
                "status": "success",
                "results": results,
                "implementation": "optuna_only"
            }
    
    elif action == "test":
        # Simple test command to verify Python integration
        versions = {}
        
        try:
            versions["python_version"] = sys.version
        except Exception:
            pass
            
        try:
            versions["optuna_version"] = optuna.__version__
        except Exception:
            pass
            
        try:
            versions["numpy_version"] = np.__version__
        except Exception:
            pass
            
        try:
            versions["pandas_version"] = pd.__version__
        except Exception:
            pass
            
        # Ray availability is already checked during import
        versions["ray_available"] = RAY_AVAILABLE
        if RAY_AVAILABLE:
            try:
                import ray as ray_module  # Local import to avoid linting errors
                versions["ray_version"] = ray_module.__version__
            except Exception:
                pass
        versions["ray_tune_available"] = TUNE_AVAILABLE
        
        return {
            "status": "success",
            "message": "Python integration is working correctly!",
            **versions
        }
    
    else:
        return {
            "status": "error",
            "message": f"Unknown action: {action}"
        }


if __name__ == "__main__":
    # Read command from stdin
    try:
        command_json = sys.stdin.read()
        command = json.loads(command_json)
        result = process_command(command)
        print(json.dumps(result))
    except Exception as e:
        error_result = {
            "status": "error",
            "message": str(e)
        }
        print(json.dumps(error_result))
