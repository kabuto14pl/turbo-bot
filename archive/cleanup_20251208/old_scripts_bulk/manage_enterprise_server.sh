#!/bin/bash
# 🚀 Enterprise Server Management Script
# Łatwe zarządzanie API server na porcie 3000

PIDFILE="/workspaces/turbo-bot/enterprise_server.pid"
LOGFILE="/workspaces/turbo-bot/logs/enterprise_server.log"

case "$1" in
  start)
    if [ -f "$PIDFILE" ] && kill -0 $(cat "$PIDFILE") 2>/dev/null; then
      echo "❌ Server już działa (PID: $(cat $PIDFILE))"
      exit 1
    fi
    echo "🚀 Uruchamiam Enterprise Server..."
    cd /workspaces/turbo-bot
    npm run start:enterprise > "$LOGFILE" 2>&1 &
    echo $! > "$PIDFILE"
    sleep 3
    if kill -0 $(cat "$PIDFILE") 2>/dev/null; then
      echo "✅ Server uruchomiony (PID: $(cat $PIDFILE))"
      echo "🌐 URL: http://localhost:3000"
      curl -s http://localhost:3000/health | jq -r '"Status: \(.status) | Mode: \(.trading.mode)"'
    else
      echo "❌ Błąd uruchamiania - sprawdź logi: tail -f $LOGFILE"
      rm -f "$PIDFILE"
      exit 1
    fi
    ;;
    
  stop)
    if [ ! -f "$PIDFILE" ]; then
      echo "⚠️  Server nie jest uruchomiony (brak PID file)"
      exit 1
    fi
    PID=$(cat "$PIDFILE")
    if kill -0 "$PID" 2>/dev/null; then
      echo "🛑 Zatrzymuję server (PID: $PID)..."
      kill "$PID"
      sleep 2
      if kill -0 "$PID" 2>/dev/null; then
        echo "⚠️  Wymuszam zatrzymanie..."
        kill -9 "$PID"
      fi
      rm -f "$PIDFILE"
      echo "✅ Server zatrzymany"
    else
      echo "⚠️  Proces nie działa, czyszczę PID file"
      rm -f "$PIDFILE"
    fi
    ;;
    
  restart)
    $0 stop
    sleep 2
    $0 start
    ;;
    
  status)
    if [ -f "$PIDFILE" ] && kill -0 $(cat "$PIDFILE") 2>/dev/null; then
      PID=$(cat "$PIDFILE")
      echo "✅ Server DZIAŁA (PID: $PID)"
      echo ""
      echo "📊 Status:"
      curl -s http://localhost:3000/health | jq '.'
      echo ""
      echo "📈 Uptime: $(curl -s http://localhost:3000/health | jq -r '.uptime')s"
    else
      echo "❌ Server NIE DZIAŁA"
      [ -f "$PIDFILE" ] && rm -f "$PIDFILE"
      exit 1
    fi
    ;;
    
  logs)
    if [ ! -f "$LOGFILE" ]; then
      echo "⚠️  Brak pliku logów: $LOGFILE"
      exit 1
    fi
    tail -f "$LOGFILE"
    ;;
    
  health)
    echo "🏥 Health Check:"
    curl -s http://localhost:3000/health | jq '.'
    ;;
    
  *)
    echo "🚀 Enterprise Server Manager"
    echo ""
    echo "Użycie: $0 {start|stop|restart|status|logs|health}"
    echo ""
    echo "Komendy:"
    echo "  start   - Uruchom server"
    echo "  stop    - Zatrzymaj server"
    echo "  restart - Restart server"
    echo "  status  - Sprawdź status"
    echo "  logs    - Pokaż logi (tail -f)"
    echo "  health  - Health check endpoint"
    exit 1
    ;;
esac

exit 0
