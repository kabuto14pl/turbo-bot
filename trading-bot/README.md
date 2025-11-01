<!-- 📚 [SHARED-INFRASTRUCTURE] -->
<!-- Documentation component -->
# Trading Bot

## Overview

This trading bot project is designed to facilitate both backtesting and live
trading. It is structured into three main layers: Core, Infrastructure, and
Interface, allowing for a clean separation of concerns.

## Project Structure

- **Core**: Contains the business logic of the trading bot, including strategy
  definitions, risk management, and portfolio management.
  - `strategy/index.ts`: Defines and executes trading strategies.
  - `risk/index.ts`: Assesses and manages trading risks.
  - `portfolio/index.ts`: Manages the trading portfolio.
  - `types/index.ts`: Contains type definitions for strategies, risk metrics,
    and portfolio items.

- **Infrastructure**: Manages data access and external interactions.
  - `data/index.ts`: Handles data retrieval from various sources.
  - `exchange/index.ts`: Interacts with different exchanges for trading
    operations.
  - `logging/index.ts`: Logs application events and errors.
  - `types/index.ts`: Contains type definitions for data and exchange responses,
    as well as log entries.

- **Interface**: Provides user interaction methods.
  - `cli/index.ts`: Command line interface for bot management.
  - `gui/index.ts`: Graphical user interface for bot management.
  - `rest/index.ts`: RESTful API for bot management.
  - `types/index.ts`: Contains type definitions for CLI options, GUI
    configurations, and REST API responses.

## Getting Started

1. Clone the repository.
2. Install dependencies using npm:
   ```
   npm install
   ```
3. Configure your trading strategies and risk management settings in the Core
   layer.
4. Choose your preferred interface (CLI, GUI, or REST API) to interact with the
   bot.

## Usage

- To run the CLI interface, execute:
  ```
  npm run cli
  ```
- For the GUI, run:
  ```
  npm run gui
  ```
- To access the REST API, start the server and use the provided endpoints.

## Distributed Optimization with Ray and Optuna

This project includes a distributed parameter optimization system that uses Ray
and Optuna to find optimal trading strategy parameters. The system can run in
distributed mode with Ray or fall back to single-machine mode with Optuna if Ray
is not available.

### Prerequisites

1. Python 3.8-3.11 is recommended for full Ray support (Ray doesn't support
   Python 3.12+)
2. Required Python packages (installed automatically by the setup script):
   - optuna
   - ray[tune] (optional, for distributed execution)
   - pandas
   - numpy
   - matplotlib
   - scikit-learn

### Installation

Install the required Python packages:

```bash
# Compile the installation script
npx tsc tools/install_python_packages.ts

# Run the installation script
node tools/install_python_packages.js
```

### Running Optimization

You can run the distributed optimization with:

```bash
# Compile the optimization script
npx tsc run_distributed_optimization.ts

# Run with default parameters (RSITurbo strategy, 100 trials, 4 workers)
node run_distributed_optimization.js

# Run with custom parameters
node run_distributed_optimization.js StrategyName NumTrials NumWorkers OutputDir
```

Example:

```bash
node run_distributed_optimization.js SuperTrend 200 8 ./results/supertrend_opt
```

### Optimization Configuration

The optimization supports the following parameters:

- RSI parameters:
  - `rsi_period`: Integer (5-25)
  - `overbought`: Integer (60-85)
  - `oversold`: Integer (15-40)

- Trade management parameters:
  - `take_profit`: Float (0.5-5.0)
  - `stop_loss`: Float (0.5-3.0)
  - `trailing_stop`: Float (0.0-2.0)

- SuperTrend parameters:
  - `atr_period`: Integer (5-30)
  - `atr_multiplier`: Float (1.0-4.0)

The optimization results include:

- Best parameters found
- Performance metrics (profit factor, win rate, etc.)
- All trial results
- Visualization plots

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any
enhancements or bug fixes.

## License

This project is licensed under the MIT License.
