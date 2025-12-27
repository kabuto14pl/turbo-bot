#!/bin/bash
# Keep Codespace Alive - Ping co 5 minut

while true; do
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  
  # Ping bot health
  health=$(curl -s http://localhost:3001/health 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    echo "[$timestamp] ✅ Codespace alive - Bot healthy"
  else
    echo "[$timestamp] ⚠️ Codespace alive - Bot may be down"
  fi
  
  # Ping every 5 minutes
  sleep 300
done
