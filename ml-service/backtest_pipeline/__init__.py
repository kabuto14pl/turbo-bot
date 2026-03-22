"""
╔══════════════════════════════════════════════════════════════════════════╗
║   TURBO-BOT v6.0.0 — FULL PIPELINE BACKTEST ENGINE                    ║
║   Modular Architecture (PATCH #74 — SOL Production + Multi-Pair)       ║
║                                                                          ║
║   Simulates ALL 16+ phases of the production trading pipeline:          ║
║     Phase 0:  Pre-checks (circuit breaker)                              ║
║     Phase 1:  Data Collection                                           ║
║     Phase 2:  Neural AI Update (Regime Detection)                       ║
║     Phase 3:  Quantum Pre-Processing (QFM feature mapping)             ║
║     Phase 4:  Signal Generation (5 strategies + XGBoost ML)            ║
║     Phase 5:  Quantum Boost (VQC + QMC + QAOA + QRA)                  ║
║     Phase 6:  Ensemble Voting (weighted consensus)                      ║
║     Phase 7:  Post-Ensemble Gates (PRIME, Skynet Override)             ║
║     Phase 8:  Risk Check (drawdown, confidence floor)                  ║
║     Phase 9:  Execution (fee gate, sizing, initial SL/TP)             ║
║     Phase 10: Classical Position Monitoring (5-phase trailing)         ║
║     Phase 11: Quantum Position Monitoring (QPM health scoring)         ║
║     Phase 12: Skynet LLM Cycle (NeuronAI decision)                    ║
║     Phase 13: Learning (Thompson Sampling, defense mode, evolution)    ║
║     Phase 14: Sentiment Analysis (PATCH #58)                           ║
║     Phase 15: LLM Override Validation (PATCH #58)                      ║
║     Phase 16: Sentiment Signal Modifier (PATCH #58)                    ║
║     Phase 17: Entry Quality Filter — S/R + Volume + MTF (PATCH #59)   ║
║     Phase 18: Price Action Gate — Structure + S/R + Timing (#62)       ║
║     Phase 19: Long Trend Filter — EMA counter-trend gate (#63/#66)     ║
║     Phase 20: Pre-Entry Momentum — candle direction check (#66)        ║
║     Phase 21: Grid Ranging + VolPause + L3 + Contrarian (#67)          ║
║     Phase 22: Funding Rate Arbitrage — delta-neutral (#71)              ║
║     Phase 23: Grid V2 — dedicated mean-reversion (#71)                 ║
║     Phase 24: News/Sentiment Filter — event detection (#71)            ║
║                                                                          ║
║   Modules:                                                               ║
║     config.py             — Constants, thresholds, parameters           ║
║     regime_detector.py    — Market regime classification                ║
║     strategies.py         — 5 classical strategies + Grid Ranging       ║
║     quantum_backend.py    — Quantum backend abstraction                 ║
║     quantum_sim.py        — Quantum pipeline simulation                 ║
║     ml_simulator.py       — ML prediction simulation (legacy)           ║
║     xgboost_ml.py         — Real XGBoost ML engine (PATCH #58)         ║
║     llm_validator.py      — LLM override validator (PATCH #58)         ║
║     sentiment_analyzer.py — Sentiment + Contrarian mode (PATCH #67)    ║
║     quantum_fidelity_replay.py — Remote GPU parity / fidelity harness   ║
║     sr_filter.py          — Entry quality: S/R + Volume + MTF (#59)    ║
║     price_action.py       — Price Action engine: PA + S/R (#62)        ║
║     data_downloader.py    — Multi-pair data downloader (#67)            ║
║     neuron_ai.py          — NeuronAI + PRIME Gate simulation           ║
║     position_manager.py   — 5-phase trailing SL/TP + partials (L1-L3)  ║
║     ensemble.py           — Weighted ensemble voting                    ║
║     engine.py             — Main backtest orchestrator                  ║
║     funding_rate.py       — Funding Rate Arbitrage module (#71)         ║
║     grid_v2.py            — Grid V2 mean-reversion strategy (#71)      ║
║     news_filter.py        — News/Sentiment event filter (#71)          ║
║     runner.py             — CLI runner + multi-pair reporting           ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

__version__ = '2.16.0'
__patch__ = 75
