#!/bin/bash
# 🚀 [PRODUCTION-OPERATIONAL]
# Production operational script

# Dashboard Cleanup Script - usunie WSZYSTKIE dashboardy trading bot z Grafany

echo "🗑️ USUWANIE WSZYSTKICH DASHBOARDÓW TRADING BOT Z GRAFANY"
echo "=================================================="

# Ustawienia Grafany (ZAKTUALIZOWANE)
GRAFANA_URL=${GRAFANA_URL:-"http://localhost:3001"}
GRAFANA_USER=${GRAFANA_USER:-"admin"}
GRAFANA_PASS=${GRAFANA_PASS:-"17021991"}

echo "📋 Sprawdzam wszystkie dashboardy..."

# Pobierz listę dashboardów
DASHBOARDS=$(curl -s -u "$GRAFANA_USER:$GRAFANA_PASS" \
  "$GRAFANA_URL/api/search?type=dash-db" | \
  grep -oP '"uid":"[^"]*"' | \
  cut -d'"' -f4)

if [ -z "$DASHBOARDS" ]; then
    echo "❌ Nie znaleziono dashboardów"
    echo "✅ Grafana jest CZYSTA!"
    exit 0
fi

echo "🎯 Znalezione dashboardy do usunięcia:"
for uid in $DASHBOARDS; do
    echo "  - UID: $uid"
done

echo ""
echo "️ Usuwam dashboardy automatycznie..."

# Usuń każdy dashboard
for uid in $DASHBOARDS; do
    echo "Usuwam dashboard UID: $uid"
    
    response=$(curl -s -w "%{http_code}" -o /dev/null \
      -u "$GRAFANA_USER:$GRAFANA_PASS" \
      -X DELETE \
      "$GRAFANA_URL/api/dashboards/uid/$uid")
    
    if [ "$response" = "200" ]; then
        echo "✅ Usunięto dashboard $uid"
    else
        echo "❌ Błąd usuwania dashboard $uid (kod: $response)"
        
        # Jeśli provisioned, usuń z Docker
        echo "🔧 Próbuję usunąć z provisioning..."
        docker exec trading-bot-grafana find /var/lib/grafana/dashboards -name "*$uid*.json" -delete 2>/dev/null
        docker exec trading-bot-grafana find /var/lib/grafana/dashboards -name "*trading*.json" -delete 2>/dev/null
        docker exec trading-bot-grafana find /var/lib/grafana/dashboards -name "*bot*.json" -delete 2>/dev/null
        echo "🔄 Restartuje Grafanę..."
        docker restart trading-bot-grafana
        sleep 5
        echo "✅ Provisioned dashboards usunięte!"
    fi
    echo ""
done

echo "✅ GOTOWE! Sprawdź Grafanę czy dashboardy zostały usunięte."
