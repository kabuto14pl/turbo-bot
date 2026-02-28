# 🚀 VPS DEPLOYMENT - QUICK REFERENCE

---

## ❓ CZY MOGĘ WYŁĄCZYĆ VS CODE A BOT DALEJ BĘDZIE DZIAŁAŁ?

### ❌ **OBECNIE (Lokalny Windows):** NIE

- Bot działa w PowerShell terminal w VS Code
- **VS Code zamknięte = Terminal zamknięty = BOT STOP**
- Komputer musi być włączony 24/7

### ✅ **PO DEPLOYMENT NA VPS:** TAK

- Bot działa na serwerze Linux (64.226.70.149)
- **Niezależny od VS Code i lokalnego komputera**
- Działa 24/7 automatycznie

---

## ⚡ SZYBKI DEPLOYMENT (5 minut)

### 1️⃣ Połącz się z serwerem

```bash
ssh root@64.226.70.149
```

### 2️⃣ Uruchom automatyczny deployment

```bash
# Pobierz script
curl -O https://raw.githubusercontent.com/kabuto14pl/turbo-bot/master/scripts/deploy_to_vps.sh

# Nadaj uprawnienia
chmod +x deploy_to_vps.sh

# Uruchom
./deploy_to_vps.sh
```

### 3️⃣ Poczekaj 5 minut

Script automatycznie:
- ✅ Zainstaluje Node.js 20.x
- ✅ Zainstaluje PM2
- ✅ Sklonuje repository
- ✅ Zainstaluje dependencies
- ✅ Skonfiguruje environment
- ✅ Uruchomi bota

### 4️⃣ Weryfikacja

```bash
# Sprawdź status
pm2 list

# Zobacz logi
pm2 logs turbo-bot --lines 30

# Health check
curl localhost:3001/health
```

### ✅ **GOTOWE!** Bot działa 24/7!

---

## 🎮 ZARZĄDZANIE BOTEM (PO DEPLOYMENT)

### Status i Logi

```bash
# Status
pm2 status

# Logi (live)
pm2 logs turbo-bot

# Ostatnie 50 linii
pm2 logs turbo-bot --lines 50

# Tylko błędy
pm2 logs turbo-bot --err
```

### Kontrola

```bash
# Restart
pm2 restart turbo-bot

# Stop
pm2 stop turbo-bot

# Start (jeśli zatrzymany)
pm2 start turbo-bot

# Zero-downtime reload
pm2 reload turbo-bot
```

### Monitoring

```bash
# Real-time monitoring UI
pm2 monit

# Szczegóły procesu
pm2 describe turbo-bot

# Health check
curl localhost:3001/health
curl localhost:3001/api/status
```

---

## 🔄 UPDATE KODU

### Gdy zmienisz kod w repozytorium

```bash
# SSH do serwera
ssh root@64.226.70.149

# Przejdź do katalogu
cd /opt/turbo-bot

# Pobierz zmiany
git pull origin master

# Zainstaluj nowe dependencies (jeśli były)
npm install

# Reload bot (zero downtime)
pm2 reload turbo-bot
```

---

## 📊 DOSTĘP Z ZEWNĄTRZ

### Health checks (z Windows PowerShell)

```powershell
# Health check
curl http://64.226.70.149:3001/health

# Status
curl http://64.226.70.149:3001/api/status
```

### Remote SSH z VS Code

1. Zainstaluj extension: **Remote - SSH**
2. Ctrl+Shift+P → "Remote-SSH: Connect to Host"
3. Wpisz: `root@64.226.70.149`
4. Otwórz folder: `/opt/turbo-bot`
5. Edytuj pliki bezpośrednio na serwerze

---

## 🚨 TROUBLESHOOTING

### Bot nie startuje

```bash
# Sprawdź logi błędów
pm2 logs turbo-bot --err --lines 100

# Sprawdź czy process działa
pm2 list

# Restart
pm2 restart turbo-bot
```

### Sprawdź zasoby serwera

```bash
# Pamięć
free -h

# Dysk
df -h

# CPU
top
```

### Restart całego PM2

```bash
pm2 kill
pm2 start ecosystem.config.js --env production
pm2 save
```

---

## 📁 WAŻNE LOKALIZACJE

| Co | Gdzie |
|---|---|
| **Kod bota** | `/opt/turbo-bot/` |
| **Logi PM2** | `/opt/turbo-bot/logs/pm2-*.log` |
| **Config** | `/opt/turbo-bot/.env` |
| **PM2 ecosystem** | `/opt/turbo-bot/ecosystem.config.js` |

---

## 🔐 BEZPIECZEŃSTWO

### Podstawowy firewall

```bash
# Instalacja UFW
sudo apt install -y ufw

# Zezwól SSH (WAŻNE!)
sudo ufw allow 22/tcp

# Zezwól health check
sudo ufw allow 3001/tcp

# Włącz
sudo ufw enable

# Status
sudo ufw status
```

---

## ✅ CHECKLIST PO DEPLOYMENT

- [ ] `pm2 list` pokazuje "turbo-bot" jako "online"
- [ ] `pm2 logs turbo-bot` pokazuje logi trading
- [ ] `curl localhost:3001/health` zwraca `{"status":"healthy"}`
- [ ] Bot pokazuje "Enterprise ML System v2.0.0 loaded successfully"
- [ ] `pm2 save` wykonane (persistence)
- [ ] Startup script skonfigurowany (`pm2 startup`)

---

## 💡 KORZYŚCI Z VPS

| Funkcja | Lokalny Bot | VPS Bot |
|---------|-------------|---------|
| **24/7 Uptime** | ❌ Wymaga PC on | ✅ Zawsze on |
| **VS Code** | ❌ Musi być otwarty | ✅ Nie potrzebny |
| **Auto-restart** | ❌ Nie | ✅ PM2 auto |
| **Remote access** | ❌ Trudny | ✅ SSH/API |
| **Awaria prądu** | ❌ Bot stop | ✅ Działa dalej |

---

## 📞 WSPARCIE

- **Deployment Guide:** [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md)
- **GitHub Repo:** https://github.com/kabuto14pl/turbo-bot
- **Server IP:** 64.226.70.149

---

## 🎯 NASTĘPNE KROKI

1. **Deploy na VPS** (5 minut)
2. **Weryfikuj że działa** (`pm2 logs`)
3. **Zamknij VS Code** - bot nadal działa ✅
4. **Monitoruj zdalnie** przez SSH/API
5. **Ciesz się botom 24/7!** 🚀

---

**⚡ TL;DR:** 
```bash
ssh root@64.226.70.149
curl -O https://raw.githubusercontent.com/kabuto14pl/turbo-bot/master/scripts/deploy_to_vps.sh
chmod +x deploy_to_vps.sh && ./deploy_to_vps.sh
# Poczekaj 5 minut = GOTOWE!
```

**Potem możesz zamknąć VS Code - bot działa niezależnie!** ✅
