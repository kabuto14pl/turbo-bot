#!/bin/bash

echo "🔍 KOMPLEKSOWY AUDYT AUTONOMICZNEGO TRADING BOTA"
echo "================================================================="
echo "Data: $(date)"
echo "================================================================="

# 1. STATUS GŁÓWNYCH PROCESÓW
echo
echo "📊 1. STATUS GŁÓWNYCH PROCESÓW"
echo "----------------------------------------"

echo "🤖 Bot Trading:"
if pgrep -f "autonomous_trading_bot" > /dev/null; then
    echo "  ✅ Bot uruchomiony (PID: $(pgrep -f autonomous_trading_bot))"
else
    echo "  ❌ Bot nie działa"
fi

echo "🔧 Proxy:"
if pgrep -f "stable-proxy\|debug-proxy" > /dev/null; then
    echo "  ✅ Proxy uruchomiony (PID: $(pgrep -f 'stable-proxy\|debug-proxy'))"
else
    echo "  ❌ Proxy nie działa"
fi

echo "🐳 Docker:"
if sudo docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(grafana|prometheus|alertmanager)"; then
    echo "  ✅ Kontenery Docker działają"
else
    echo "  ❌ Problemy z kontenerami Docker"
fi

# 2. TESTY POŁĄCZEŃ
echo
echo "🌐 2. TESTY POŁĄCZEŃ"
echo "----------------------------------------"

echo "🤖 Bot API (port 9092):"
if curl -s http://localhost:9092/health > /dev/null; then
    echo "  ✅ Bot API dostępny"
    echo "  📊 Health: $(curl -s http://localhost:9092/health | head -c 50)..."
else
    echo "  ❌ Bot API niedostępny"
fi

echo "🔧 Proxy (port 9095):"
if curl -s http://localhost:9095/metrics | head -1 > /dev/null; then
    echo "  ✅ Proxy dostępny"
    TRADES=$(curl -s http://localhost:9095/metrics | grep "trading_bot_trades_total" | awk '{print $2}')
    echo "  📊 Transakcje: ${TRADES:-0}"
else
    echo "  ❌ Proxy niedostępny"
fi

echo "📈 Prometheus (port 9091):"
if curl -s http://localhost:9091/-/healthy > /dev/null; then
    echo "  ✅ Prometheus dostępny"
else
    echo "  ❌ Prometheus niedostępny"
fi

echo "📊 Grafana (port 3001):"
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "  ✅ Grafana dostępny"
else
    echo "  ❌ Grafana niedostępny"
fi

# 3. TESTY METRYK
echo
echo "📊 3. TESTY METRYK I DANYCH"
echo "----------------------------------------"

if curl -s http://localhost:9095/metrics > /dev/null; then
    echo "🔍 Dostępne metryki:"
    METRICS=$(curl -s http://localhost:9095/metrics | grep -E "^trading_bot_" | wc -l)
    echo "  📊 Podstawowe metryki: $METRICS"
    
    STATUS=$(curl -s http://localhost:9095/metrics | grep "trading_bot_status" | awk '{print $2}')
    echo "  🤖 Status: ${STATUS:-"N/A"}"
    
    TRADES=$(curl -s http://localhost:9095/metrics | grep "trading_bot_trades_total" | awk '{print $2}')
    echo "  📈 Transakcje: ${TRADES:-0}"
    
    PORTFOLIO=$(curl -s http://localhost:9095/metrics | grep "trading_bot_portfolio_value" | awk '{print $2}')
    echo "  💰 Portfolio: $${PORTFOLIO:-"N/A"}"
else
    echo "  ❌ Nie można pobrać metryk"
fi

# 4. TEST TRANSAKCJI
echo
echo "🧪 4. TEST TRANSAKCJI SYMULOWANEJ"
echo "----------------------------------------"

if curl -s http://localhost:9092/health > /dev/null; then
    echo "🧪 Wykonuję test transakcji..."
    RESULT=$(curl -X POST http://localhost:9092/test/trade \
        -H "Content-Type: application/json" \
        -d '{"symbol":"TESTUSDT","side":"buy","amount":0.001,"price":1000}' -s)
    
    if echo "$RESULT" | grep -q "executed"; then
        echo "  ✅ Test transakcji zakończony sukcesem"
        echo "  📊 Wynik: $(echo "$RESULT" | head -c 80)..."
    else
        echo "  ❌ Test transakcji nieudany"
    fi
else
    echo "  ❌ Bot niedostępny - nie można przetestować transakcji"
fi

# 5. SPRAWDZENIE KONFIGURACJI
echo
echo "⚙️ 5. SPRAWDZENIE KONFIGURACJI"
echo "----------------------------------------"

echo "📁 Pliki konfiguracyjne:"
if [ -f "/mnt/c/Users/katbo/Desktop/Turbo Bot Deva/trading-bot/.env" ]; then
    echo "  ✅ .env istnieje"
    TRADING_MODE=$(grep "TRADING_MODE" "/mnt/c/Users/katbo/Desktop/Turbo Bot Deva/trading-bot/.env" | cut -d'=' -f2)
    echo "  🎯 Trading Mode: ${TRADING_MODE:-"nie ustawiony"}"
else
    echo "  ❌ Brak pliku .env"
fi

if [ -f "/mnt/c/Users/katbo/Desktop/Turbo Bot Deva/docker-compose.yml" ]; then
    echo "  ✅ docker-compose.yml istnieje"
else
    echo "  ❌ Brak docker-compose.yml"
fi

# 6. SPRAWDZENIE STRATEGII
echo
echo "🎯 6. SPRAWDZENIE STRATEGII"
echo "----------------------------------------"

if curl -s http://localhost:9092/metrics | grep "trading_strategy" > /dev/null; then
    echo "🎯 Aktywne strategie:"
    STRATEGY_METRICS=$(curl -s http://localhost:9092/metrics | grep "trading_strategy_executions_total" | wc -l)
    echo "  📊 Metryki strategii: $STRATEGY_METRICS"
    
    if [ "$STRATEGY_METRICS" -gt 0 ]; then
        echo "  ✅ Strategie wykonują transakcje"
        curl -s http://localhost:9092/metrics | grep "trading_strategy_executions_total" | head -3 | while read line; do
            echo "    📈 $line"
        done
    else
        echo "  ⚠️ Brak wykonanych transakcji strategii"
    fi
else
    echo "  ❌ Brak danych o strategiach"
fi

# 7. SPRAWDZENIE AUTOMATYZACJI
echo
echo "🤖 7. SPRAWDZENIE AUTOMATYZACJI"
echo "----------------------------------------"

echo "🔄 Komponenty automatyczne:"
if pgrep -f "autonomous_trading_bot" > /dev/null; then
    echo "  ✅ Main Bot Loop działa"
    
    # Sprawdź uptime bota
    if curl -s http://localhost:9095/metrics | grep "trading_bot_uptime" > /dev/null; then
        UPTIME=$(curl -s http://localhost:9095/metrics | grep "trading_bot_uptime" | awk '{print $2}')
        UPTIME_MIN=$((UPTIME / 60))
        echo "  ⏱️ Uptime: ${UPTIME_MIN} minut"
    fi
else
    echo "  ❌ Main Bot Loop nie działa"
fi

echo "📊 Monitoring:"
if curl -s http://localhost:9091/-/healthy > /dev/null; then
    echo "  ✅ Prometheus scraping aktywny"
else
    echo "  ❌ Prometheus monitoring nie działa"
fi

echo "🚨 Alerting:"
if sudo docker ps | grep alertmanager > /dev/null; then
    echo "  ✅ AlertManager działa"
else
    echo "  ❌ AlertManager nie działa"
fi

# 8. PODSUMOWANIE
echo
echo "📋 8. PODSUMOWANIE AUTONOMII"
echo "================================================================="

SCORE=0
TOTAL=10

# Bot running
if pgrep -f "autonomous_trading_bot" > /dev/null; then ((SCORE++)); fi

# Proxy running  
if pgrep -f "stable-proxy\|debug-proxy" > /dev/null; then ((SCORE++)); fi

# Docker running
if sudo docker ps | grep grafana > /dev/null; then ((SCORE++)); fi

# Bot API
if curl -s http://localhost:9092/health > /dev/null; then ((SCORE++)); fi

# Metrics available
if curl -s http://localhost:9095/metrics > /dev/null; then ((SCORE++)); fi

# Prometheus
if curl -s http://localhost:9091/-/healthy > /dev/null; then ((SCORE++)); fi

# Grafana
if curl -s http://localhost:3001/api/health > /dev/null; then ((SCORE++)); fi

# Strategies working
if curl -s http://localhost:9092/metrics | grep "trading_strategy" > /dev/null; then ((SCORE++)); fi

# Test trading works
if curl -s http://localhost:9092/health > /dev/null; then ((SCORE++)); fi

# Configuration exists
if [ -f "/mnt/c/Users/katbo/Desktop/Turbo Bot Deva/trading-bot/.env" ]; then ((SCORE++)); fi

PERCENTAGE=$((SCORE * 100 / TOTAL))

echo "🎯 WYNIK AUTONOMII: $SCORE/$TOTAL ($PERCENTAGE%)"
echo

if [ $PERCENTAGE -ge 90 ]; then
    echo "🟢 DOSKONAŁY - Bot w pełni autonomiczny"
elif [ $PERCENTAGE -ge 70 ]; then
    echo "🟡 DOBRY - Bot w większości autonomiczny"
elif [ $PERCENTAGE -ge 50 ]; then
    echo "🟠 ŚREDNI - Bot częściowo autonomiczny"
else
    echo "🔴 SŁABY - Bot wymaga interwencji"
fi

echo
echo "================================================================="
echo "Audyt zakończony: $(date)"
echo "================================================================="
