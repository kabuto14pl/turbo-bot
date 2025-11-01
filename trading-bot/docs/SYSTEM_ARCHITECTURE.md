<!-- 📚 [SHARED-INFRASTRUCTURE] -->
<!-- Documentation component -->
```mermaid
graph TB
    subgraph "🌐 Data Sources"
        WS1[Binance WebSocket]
        WS2[External APIs]
        CSV[Historical Data]
        NEWS[News Feed]
    end
    
    subgraph "📊 Data Processing Layer"
        NORM[Data Normalizer]
        KAFKA[Kafka Message Bus]
        STORE[DuckDB Store]
        CACHE[Redis Cache]
    end
    
    subgraph "🧠 Core Trading Engine"
        SM[Strategy Manager<br/>30+ Strategies]
        PAIRS[Pairs Trading<br/>Cointegration Engine]
        ML[ML Pipeline<br/>TensorFlow/PyTorch]
        AGG[Signal Aggregator]
    end
    
    subgraph "⚡ Ray Distributed Computing"
        RAY[Ray Cluster]
        OPT[Optuna Optimizer]
        BACK[Parallel Backtesting]
        TRAIN[Model Training]
    end
    
    subgraph "🛡️ Risk & Portfolio Management"
        RISK[Risk Manager<br/>VaR, Kelly, Position Sizing]
        PORT[Portfolio Manager<br/>Asset Allocation]
        COMP[Compliance Engine<br/>GDPR Logger]
    end
    
    subgraph "🎯 Execution Layer"
        EXEC[Execution Engine]
        BROKER[Broker Interface]
        ORDERS[Order Management]
    end
    
    subgraph "📈 Monitoring & Analytics"
        PROM[Prometheus Metrics]
        GRAF[Grafana Dashboard]
        ALERT[Alert System]
        LOG[Secure Logging]
    end

    %% Data Flow
    WS1 --> NORM
    WS2 --> NORM
    CSV --> STORE
    NEWS --> NORM
    
    NORM --> KAFKA
    KAFKA --> STORE
    KAFKA --> CACHE
    
    STORE --> SM
    CACHE --> SM
    SM --> PAIRS
    SM --> ML
    
    PAIRS --> AGG
    ML --> AGG
    SM --> AGG
    
    AGG --> RAY
    RAY --> OPT
    RAY --> BACK
    RAY --> TRAIN
    
    AGG --> RISK
    RISK --> PORT
    PORT --> EXEC
    
    EXEC --> BROKER
    BROKER --> ORDERS
    
    EXEC --> PROM
    RISK --> PROM
    PORT --> PROM
    PROM --> GRAF
    GRAF --> ALERT
    
    COMP --> LOG
    RISK --> COMP
    PORT --> COMP

    %% Styling
    classDef dataSource fill:#e1f5fe
    classDef processing fill:#f3e5f5
    classDef core fill:#e8f5e8
    classDef distributed fill:#fff3e0
    classDef risk fill:#ffebee
    classDef execution fill:#f1f8e9
    classDef monitoring fill:#fafafa
    
    class WS1,WS2,CSV,NEWS dataSource
    class NORM,KAFKA,STORE,CACHE processing
    class SM,PAIRS,ML,AGG core
    class RAY,OPT,BACK,TRAIN distributed
    class RISK,PORT,COMP risk
    class EXEC,BROKER,ORDERS execution
    class PROM,GRAF,ALERT,LOG monitoring
```

# 🏗️ SYSTEM ARCHITECTURE DIAGRAM
**Complete Trading Bot Architecture - 2025 Enterprise Level**

## 📋 Component Details

### 🌐 Data Sources Layer
- **Binance WebSocket**: Real-time market data (<10ms latency)
- **External APIs**: Economic indicators, news sentiment
- **Historical Data**: CSV files for backtesting (252+ days)
- **News Feed**: Sentiment analysis for fundamental signals

### 📊 Data Processing Layer
- **Data Normalizer**: Standardizes data formats across sources
- **Kafka Message Bus**: Event-driven architecture, pub-sub pattern
- **DuckDB Store**: High-performance analytical database
- **Redis Cache**: Sub-millisecond data access for real-time trading

### 🧠 Core Trading Engine
- **Strategy Manager**: Orchestrates 30+ trading strategies
- **Pairs Trading**: Johansen cointegration, correlation analysis
- **ML Pipeline**: TensorFlow 2.13+, LSTM, RL algorithms
- **Signal Aggregator**: Combines and weights multiple signals

### ⚡ Ray Distributed Computing
- **Ray Cluster**: Distributed computing for scalability
- **Optuna Optimizer**: Hyperparameter optimization
- **Parallel Backtesting**: Concurrent strategy testing
- **Model Training**: Distributed ML model training

### 🛡️ Risk & Portfolio Management
- **Risk Manager**: VaR, Kelly criterion, position sizing
- **Portfolio Manager**: Asset allocation, rebalancing
- **Compliance Engine**: GDPR-compliant logging, audit trails

### 🎯 Execution Layer
- **Execution Engine**: Smart order routing
- **Broker Interface**: Multi-broker connectivity
- **Order Management**: Order lifecycle management

### 📈 Monitoring & Analytics
- **Prometheus**: Metrics collection and storage
- **Grafana**: Real-time dashboards and visualization
- **Alert System**: Automated notifications and alerts
- **Secure Logging**: GDPR-compliant audit trails

## 🔄 Data Flow Description

1. **Data Ingestion**: Multiple sources → Normalizer → Kafka
2. **Strategy Processing**: Kafka → Strategies → Signal generation
3. **Risk Assessment**: Signals → Risk Manager → Portfolio validation
4. **Execution**: Approved signals → Execution Engine → Broker
5. **Monitoring**: All components → Prometheus → Grafana dashboards

## 🚀 Key Features

- **Real-time Processing**: <10ms market data to signal generation
- **Distributed Computing**: Ray cluster for scalability
- **Enterprise Security**: GDPR compliance, secure logging
- **High Availability**: Redundant components, failover mechanisms
- **Monitoring**: Comprehensive metrics and alerting
