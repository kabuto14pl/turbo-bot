# 🚀 Deployment 24/7 - Opcje Uruchomienia Poza Codespace

## ⚠️ PROBLEM: Codespace nie wspiera prawdziwego 24/7

Codespace auto-suspend po bezczynności → Bot się zatrzymuje

## ✅ ROZWIĄZANIA - 4 Opcje

---

## 1️⃣ VPS (Virtual Private Server) - NAJLEPSZE ⭐

### Dostawcy:
- **DigitalOcean** - $6/miesiąc (Droplet Basic)
- **Linode** - $5/miesiąc (Nanode 1GB)
- **AWS EC2** - $3-10/miesiąc (t3.micro/small)
- **Vultr** - $5/miesiąc (Cloud Compute)

### Setup (30-60 min):

```bash
# 1. Utwórz VPS (Ubuntu 22.04)
# 2. SSH do VPS
ssh root@your-vps-ip

# 3. Zainstaluj Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs git

# 4. Zainstaluj PM2
npm install -g pm2

# 5. Clone repo
git clone https://github.com/kabuto14pl/turbo-bot.git
cd turbo-bot

# 6. Install dependencies
npm install

# 7. Configure .env
cp .env.example .env
nano .env  # Ustaw MODE=live, API keys

# 8. Start bot
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Auto-start przy reboot

# 9. Setup firewall
ufw allow 22    # SSH
ufw allow 3001  # Bot API
ufw allow 8080  # Dashboard
ufw enable
```

### ✅ Zalety:
- ✅ Prawdziwy 24/7 uptime
- ✅ Pełna kontrola
- ✅ Stabilne IP
- ✅ Niski koszt ($5-10/miesiąc)

### ❌ Wady:
- ❌ Wymaga podstawowej wiedzy o Linuxie
- ❌ Płatne (ale tanie)
- ❌ Musisz zarządzać bezpieczeństwem

---

## 2️⃣ Docker + DigitalOcean App Platform

### Setup:

```bash
# 1. Dockerfile już gotowy w repo

# 2. Push do GitHub
git push origin master

# 3. W DigitalOcean App Platform:
#    - Create App
#    - Connect GitHub repo
#    - Select turbo-bot
#    - Auto-deploy from Dockerfile

# 4. Configure environment variables w UI
MODE=live
API_KEY=xxx
SECRET=xxx
```

### ✅ Zalety:
- ✅ Auto-deploy z GitHub
- ✅ Managed infrastructure
- ✅ Easy scaling
- ✅ Nie trzeba zarządzać serwerem

### ❌ Wady:
- ❌ Droższe (~$12/miesiąc)
- ❌ Mniej kontroli
- ❌ Lock-in do platformy

---

## 3️⃣ Raspberry Pi / Home Server - DARMOWE

### Hardware:
- **Raspberry Pi 4 (4GB)** - $55 jednorazowo
- **Stary laptop/PC** - Darmowe jeśli masz

### Setup:

```bash
# 1. Zainstaluj Raspberry Pi OS Lite
# 2. Enable SSH
# 3. Clone repo i install jak VPS (opcja 1)
# 4. Ustaw static IP w routerze
# 5. Port forwarding (3001, 8080)

# Optional: DynDNS jeśli masz dynamiczne IP
```

### ✅ Zalety:
- ✅ Brak kosztów miesięcznych
- ✅ Pełna kontrola
- ✅ Dobra do nauki

### ❌ Wady:
- ❌ Wymaga stabilnego internetu w domu
- ❌ Koszt prądu (~$2-5/miesiąc)
- ❌ Ryzyko awarii sprzętu
- ❌ Musisz być w domu przy problemach

---

## 4️⃣ Heroku / Railway / Render - MANAGED PLATFORM

### Railway.app (Przykład):

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Deploy
railway init
railway up

# 4. Configure env vars w dashboard
railway variables set MODE=live
railway variables set API_KEY=xxx
```

### ✅ Zalety:
- ✅ Free tier available
- ✅ Auto-deploy
- ✅ Easy setup

### ❌ Wady:
- ❌ Free tier ma limity (sleep po bezczynności)
- ❌ Płatny tier ~$10-20/miesiąc
- ❌ Mniej kontroli

---

## 📊 PORÓWNANIE

| Opcja | Koszt/miesiąc | Setup Time | 24/7 | Trudność |
|-------|--------------|------------|------|----------|
| VPS (DigitalOcean) | $5-10 | 30-60 min | ✅ | Średnia |
| Docker App Platform | $12-20 | 15 min | ✅ | Łatwa |
| Raspberry Pi | $0 (+$55 hardware) | 1-2h | ✅ | Średnia |
| Railway/Render | $0-20 | 10 min | ⚠️ | Łatwa |

---

## 🎯 REKOMENDACJA

### Dla Produkcji:
**VPS (DigitalOcean/Linode)** - $5/miesiąc
- Najlepszy stosunek cena/wydajność
- Prawdziwy 24/7
- Stabilne

### Dla Nauki/Testów:
**Raspberry Pi** - Jednorazowo $55
- Zero kosztów operacyjnych
- Pełna kontrola
- Dobra do eksperymentów

### Dla Wygody:
**Railway.app** - $10/miesiąc
- Najszybszy setup
- Auto-deploy z GitHub
- Managed

---

## 🚀 QUICK START - DigitalOcean VPS (30 min)

```bash
# 1. Utwórz konto: digitalocean.com (mają $200 credit dla nowych)
# 2. Create Droplet: Ubuntu 22.04, Basic $6/miesiąc
# 3. SSH do droplet
# 4. Uruchom ten skrypt:

curl -fsSL https://raw.githubusercontent.com/kabuto14pl/turbo-bot/master/deploy_v4.1.3.sh | bash

# 5. Configure .env:
cd turbo-bot
nano .env
# Ustaw: MODE=live, API_KEY, SECRET

# 6. Start:
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 7. Gotowe! Bot działa 24/7
# Access: http://your-vps-ip:3001/health
```

---

## 💡 NEXT STEPS

1. **Wybierz platformę** (Rekomendacja: DigitalOcean VPS)
2. **Deploy bota** (30-60 min)
3. **Monitor przez 24h** (sprawdź stability)
4. **Włącz live trading** (MODE=live, ENABLE_REAL_TRADING=true)
5. **Setup alerts** (Prometheus + Grafana w Week 2)

**Bot gotowy na prawdziwy 24/7 trading!** 🚀
