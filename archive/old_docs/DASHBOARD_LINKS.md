# 🌐 Dashboard Access Links

## 🔧 KROK 1: Forward Ports w VS Code

Porty **SĄ AKTYWNE** ale VS Code musi je zobaczyć:

1. W VS Code naciśnij `Ctrl+Shift+P` (lub `Cmd+Shift+P` na Mac)
2. Wpisz: **"Ports: Focus on Ports View"**
3. To otworzy panel PORTS (jeśli go nie ma)

**LUB**

1. Kliknij menu: **View** → **Command Palette**
2. Wpisz: **"Forward a Port"**
3. Dodaj porty: **8080** i **3001**

## 🔗 Aktywne Porty:

### Port 8080 - Dashboard
```
Proces: node (PID 717)
Bind: 0.0.0.0:8080 (dostępny publicznie)
Status: ✅ LISTENING
```

### Port 3001 - Bot API  
```
Proces: node (PID 1010)
Bind: :::3001 (IPv6)
Status: ✅ LISTENING
```

## 🌐 Public URLs (Po Ustawieniu Portów):

```
Dashboard:
https://organic-space-rotary-phone-974wg5q445p62x4g9-8080.app.github.dev

Bot Health:
https://organic-space-rotary-phone-974wg5q445p62x4g9-3001.app.github.dev/health

WebSocket Status:
https://organic-space-rotary-phone-974wg5q445p62x4g9-3001.app.github.dev/api/websocket/okx
```

## 🔧 Jeśli Dalej Nie Widać Portów:

```bash
# Restart dashboard na innym porcie
pm2 restart dashboard
pm2 logs dashboard --lines 5

# Sprawdź czy porty są aktywne
netstat -tlnp | grep -E ":(8080|3001)"
```

## 📞 Test Lokalnie (W Terminal VS Code):

```bash
# Test dashboard
curl http://localhost:8080

# Test bot API
curl http://localhost:3001/health

# Test WebSocket
curl http://localhost:3001/api/websocket/okx
```

Jeśli **lokalne curl działa** ale **browser nie** = problem z port forwarding w Codespace.

## ✅ Ostateczne Rozwiązanie:

W terminalu VS Code wpisz:
```bash
code --tunnel --accept-server-license-terms
```

To zrestartuje tunnel i powinno naprawić port forwarding.
