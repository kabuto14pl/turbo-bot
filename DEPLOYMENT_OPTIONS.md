# 🚀 OPCJE DEPLOYMENT POZA CODESPACES
**Problem:** Codespaces wyłącza się po 30 minutach braku aktywności  
**Rozwiązanie:** Deploy na external server/service

---

## 📊 PORÓWNANIE OPCJI DEPLOYMENT

| Opcja | Koszt | Łatwość | Uptime | Zalecane |
|-------|-------|---------|--------|----------|
| **Local Machine** | 💰 Darmowe | ⭐⭐⭐⭐⭐ | 🟡 Gdy komputer włączony | Rozwój |
| **VPS (DigitalOcean, Vultr)** | 💰💰 $5-10/mies | ⭐⭐⭐⭐ | 🟢 99.9% | ✅ Produkcja |
| **Cloud VM (AWS, GCP, Azure)** | 💰💰💰 $10-50/mies | ⭐⭐⭐ | 🟢 99.99% | Enterprise |
| **Heroku** | 💰💰 $7/mies | ⭐⭐⭐⭐⭐ | 🟢 99.9% | Szybki start |
| **Railway.app** | 💰 $5/mies | ⭐⭐⭐⭐⭐ | 🟢 99.9% | ✅ Zalecane |
| **Render.com** | 💰 Darmowe/Paid | ⭐⭐⭐⭐⭐ | 🟡/🟢 | Dobre |
| **Docker + Cloud** | 💰💰 Variable | ⭐⭐⭐ | 🟢 99.9% | Skalowalne |

---

## 🎯 ZALECANE ROZWIĄZANIE: Railway.app

**Dlaczego Railway.app:**
- ✅ Prosty deployment z GitHub
- ✅ $5/miesiąc starter plan
- ✅ 24/7 uptime
- ✅ Automatyczne restarts
- ✅ Logs i monitoring
- ✅ Environment variables
- ✅ PostgreSQL/Redis included

### Quick Deploy na Railway:

```bash
# 1. Zainstaluj Railway CLI:
npm install -g @railway/cli

# 2. Login:
railway login

# 3. Initialize projekt:
railway init

# 4. Link do GitHub repo:
railway link

# 5. Deploy:
railway up
```

---

## 💻 OPCJA 1: LOCAL MACHINE (NAJPROSTSZA)

### A. Windows/Mac/Linux - Native

```bash
# 1. Sklonuj repo:
git clone https://github.com/kabuto14pl/turbo-bot.git
cd turbo-bot

# 2. Zainstaluj dependencies:
npm install

# 3. Skopiuj .env:
cp .env.template .env
nano .env  # Edytuj konfigurację

# 4. Uruchom w tle:
# Windows (PowerShell):
Start-Process -NoNewWindow npm exec ts-node trading-bot/autonomous_trading_bot_final.ts

# Mac/Linux:
nohup npm exec ts-node trading-bot/autonomous_trading_bot_final.ts > logs/bot.log 2>&1 &
echo $! > bot.pid
```

### B. Windows - jako Windows Service

```powershell
# Użyj node-windows:
npm install -g node-windows

# Utwórz service script (bot-service.js):
@"
var Service = require('node-windows').Service;

var svc = new Service({
  name: 'Trading Bot',
  description: 'Autonomous Trading Bot',
  script: 'C:\\path\\to\\turbo-bot\\trading-bot\\autonomous_trading_bot_final.ts',
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ]
});

svc.on('install', function(){
  svc.start();
});

svc.install();
"@ | Out-File -FilePath bot-service.js

# Zainstaluj:
node bot-service.js
```

### C. Linux - jako Systemd Service

```bash
# 1. Utwórz service file:
sudo nano /etc/systemd/system/trading-bot.service

# 2. Dodaj konfigurację:
cat << 'EOF' | sudo tee /etc/systemd/system/trading-bot.service
[Unit]
Description=Autonomous Trading Bot
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/$USER/turbo-bot
ExecStart=/usr/bin/npm exec ts-node trading-bot/autonomous_trading_bot_final.ts
Restart=always
RestartSec=10
StandardOutput=append:/home/$USER/turbo-bot/logs/bot.log
StandardError=append:/home/$USER/turbo-bot/logs/bot-error.log
Environment=NODE_ENV=production
Environment=MODE=simulation

[Install]
WantedBy=multi-user.target
EOF

# 3. Włącz i uruchom:
sudo systemctl daemon-reload
sudo systemctl enable trading-bot
sudo systemctl start trading-bot

# 4. Sprawdź status:
sudo systemctl status trading-bot

# 5. Logi:
sudo journalctl -u trading-bot -f
```

---

## ☁️ OPCJA 2: VPS (DigitalOcean, Vultr, Linode)

### Krok po kroku - DigitalOcean Droplet:

```bash
# 1. Utwórz Droplet na DigitalOcean:
#    - Ubuntu 22.04 LTS
#    - Basic plan: $6/miesiąc
#    - SSH key authentication

# 2. SSH do serwera:
ssh root@YOUR_DROPLET_IP

# 3. Zainstaluj Node.js:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install -y git build-essential

# 4. Sklonuj repo:
git clone https://github.com/kabuto14pl/turbo-bot.git
cd turbo-bot

# 5. Install dependencies:
npm install

# 6. Setup .env:
cp .env.template .env
nano .env  # Configure

# 7. Install PM2 (Process Manager):
npm install -g pm2

# 8. Start bot z PM2:
pm2 start npm --name "trading-bot" -- exec ts-node trading-bot/autonomous_trading_bot_final.ts

# 9. Setup PM2 startup:
pm2 startup systemd
pm2 save

# 10. Monitor:
pm2 status
pm2 logs trading-bot
pm2 monit
```

### PM2 Commands:
```bash
pm2 start trading-bot     # Start
pm2 stop trading-bot      # Stop
pm2 restart trading-bot   # Restart
pm2 logs trading-bot      # Logs
pm2 monit                 # Monitor
pm2 delete trading-bot    # Remove
```

---

## 🐳 OPCJA 3: DOCKER (Portable Solution)

### Dockerfile dla bota:

```dockerfile
# File: Dockerfile
FROM node:20-alpine

# Install dependencies
RUN apk add --no-cache python3 make g++ git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose health check port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start bot
CMD ["npm", "exec", "ts-node", "trading-bot/autonomous_trading_bot_final.ts"]
```

### Docker Compose:

```yaml
# File: docker-compose.yml
version: '3.8'

services:
  trading-bot:
    build: .
    container_name: trading-bot
    restart: unless-stopped
    ports:
      - "3001:3001"
      - "9090:9090"
    environment:
      - NODE_ENV=production
      - MODE=simulation
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - trading-network

  # Optional: Redis cache
  redis:
    image: redis:7-alpine
    container_name: trading-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - trading-network

  # Optional: Prometheus monitoring
  prometheus:
    image: prom/prometheus:latest
    container_name: trading-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - trading-network

volumes:
  redis-data:
  prometheus-data:

networks:
  trading-network:
    driver: bridge
```

### Deploy z Docker:

```bash
# 1. Build image:
docker-compose build

# 2. Start services:
docker-compose up -d

# 3. Check status:
docker-compose ps

# 4. Logs:
docker-compose logs -f trading-bot

# 5. Stop:
docker-compose down

# 6. Update and restart:
git pull
docker-compose up -d --build
```

---

## ⚡ OPCJA 4: HEROKU (Managed Platform)

```bash
# 1. Install Heroku CLI:
curl https://cli-assets.heroku.com/install.sh | sh

# 2. Login:
heroku login

# 3. Create app:
heroku create turbo-trading-bot

# 4. Add Procfile:
echo "web: npm exec ts-node trading-bot/autonomous_trading_bot_final.ts" > Procfile

# 5. Configure environment:
heroku config:set MODE=simulation
heroku config:set HEALTH_CHECK_PORT=3001
heroku config:set NODE_ENV=production

# 6. Deploy:
git push heroku master

# 7. Scale dyno:
heroku ps:scale web=1

# 8. Logs:
heroku logs --tail

# 9. Keep alive (prevent sleeping):
# Add to package.json scripts:
"heroku-postbuild": "npm run build"
```

### Heroku Keep-Alive Script:

```javascript
// keep-alive.js - Ping endpoint co 25 minut
const https = require('https');

const HEROKU_URL = 'https://turbo-trading-bot.herokuapp.com';

function ping() {
  https.get(`${HEROKU_URL}/health`, (res) => {
    console.log(`Ping: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error('Ping error:', err);
  });
}

// Ping co 25 minut (przed 30-minutowym timeout)
setInterval(ping, 25 * 60 * 1000);

console.log('Keep-alive started');
```

---

## 🚂 OPCJA 5: RAILWAY.APP (ZALECANE!)

### Deploy na Railway.app:

```bash
# 1. Zainstaluj CLI:
npm i -g @railway/cli

# 2. Login:
railway login

# 3. Initialize:
railway init

# 4. Link GitHub repo:
railway link

# 5. Add environment variables:
railway variables set MODE=simulation
railway variables set NODE_ENV=production

# 6. Deploy:
railway up

# 7. Monitor:
railway logs

# 8. Open:
railway open
```

### Railway.toml Configuration:

```toml
# railway.toml
[build]
builder = "NIXPACKS"
buildCommand = "npm install"

[deploy]
startCommand = "npm exec ts-node trading-bot/autonomous_trading_bot_final.ts"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

---

## 📊 MONITORING & KEEP-ALIVE

### 1. UptimeRobot (Darmowy)
```
1. Załóż konto: uptimerobot.com
2. Dodaj Monitor:
   - Type: HTTP(s)
   - URL: https://your-bot.com/health
   - Interval: 5 minutes
3. Alerts: Email/SMS przy downtime
```

### 2. Healthchecks.io (Darmowy)
```
1. Załóż konto: healthchecks.io
2. Create check: "Trading Bot"
3. Add cron schedule: */5 * * * * (co 5 minut)
4. Ping URL z bota:
```

```typescript
// W bot code:
import axios from 'axios';

const HEALTHCHECK_URL = 'https://hc-ping.com/YOUR-UUID';

setInterval(async () => {
  try {
    await axios.get(HEALTHCHECK_URL);
    console.log('Healthcheck ping sent');
  } catch (error) {
    console.error('Healthcheck ping failed:', error);
  }
}, 5 * 60 * 1000); // Co 5 minut
```

### 3. Self-Ping Script (Internal)

```typescript
// W trading-bot/autonomous_trading_bot_final.ts
// Dodaj w constructor():

private startSelfPing(): void {
  const selfPingInterval = 25 * 60 * 1000; // 25 minut
  
  setInterval(() => {
    try {
      fetch(`http://localhost:${this.config.healthCheckPort}/health`)
        .then(res => console.log(`🏓 Self-ping: ${res.status}`))
        .catch(err => console.error('Self-ping failed:', err));
    } catch (error) {
      console.error('Self-ping error:', error);
    }
  }, selfPingInterval);
}

// Wywołaj w initialize():
this.startSelfPing();
```

---

## 🛡️ PRODUCTION BEST PRACTICES

### 1. Auto-Restart na Crash

**PM2:**
```bash
pm2 start bot.js --max-restarts=10 --min-uptime=5000
```

**Systemd:**
```ini
[Service]
Restart=always
RestartSec=10
```

**Docker:**
```yaml
restart: unless-stopped
```

### 2. Log Rotation

```bash
# Install logrotate:
sudo apt-get install logrotate

# Configure:
sudo nano /etc/logrotate.d/trading-bot

/home/user/turbo-bot/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 user user
    sharedscripts
    postrotate
        systemctl reload trading-bot
    endscript
}
```

### 3. Monitoring Stack

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml

volumes:
  grafana-data:
```

---

## 💰 KOSZTY PORÓWNANIE

### Miesiąc (24/7 uptime):

| Rozwiązanie | Koszt/miesiąc | Uwagi |
|-------------|---------------|-------|
| Local Machine | €0 (prąd ~€5) | Wymaga zawsze włączonego PC |
| Railway.app | $5 | ✅ Zalecane dla start |
| DigitalOcean VPS | $6 | Dobra wartość |
| Heroku Hobby | $7 | Łatwy deploy |
| AWS EC2 t2.micro | $8-10 | Free tier 12 mies |
| GCP Cloud Run | $5-15 | Pay per use |
| Azure VM | $10-20 | Enterprise |

---

## 🎯 REKOMENDACJA DLA TWOJEGO PRZYPADKU

### Rozwój/Testing:
```
✅ Local Machine + PM2
   - Darmowe
   - Pełna kontrola
   - Łatwy debug
```

### Produkcja (małe):
```
✅ Railway.app ($5/mies)
   - Prosty deploy
   - Auto-scaling
   - Monitoring
   - 99.9% uptime
```

### Produkcja (średnie):
```
✅ DigitalOcean VPS ($10/mies)
   - Pełna kontrola
   - Docker support
   - Snapshots backup
   - SSH access
```

### Enterprise:
```
✅ AWS/GCP + Kubernetes
   - High availability
   - Auto-scaling
   - Load balancing
   - Multi-region
```

---

## 🚀 QUICK START - ZALECANE ROZWIĄZANIE

### Railway.app (5 minut setup):

```bash
# 1. Push code to GitHub (jeśli jeszcze nie):
git add .
git commit -m "Prepare for Railway deployment"
git push origin master

# 2. Railway.app website:
# - Zaloguj przez GitHub: railway.app
# - "New Project" → "Deploy from GitHub repo"
# - Wybierz turbo-bot
# - Configure env variables w dashboard

# 3. Done! Bot działa 24/7 ✅
```

### Environment Variables na Railway:
```
MODE=simulation
NODE_ENV=production
TRADING_SYMBOL=BTCUSDT
INITIAL_CAPITAL=10000
HEALTH_CHECK_PORT=3001
ENABLE_LIVE_TRADING=false
```

---

## 📞 WSPARCIE

Jeśli masz problemy z deployment:

1. **Railway issues:** railway.app/help
2. **DigitalOcean:** digitalocean.com/community
3. **Docker:** docs.docker.com
4. **PM2:** pm2.keymetrics.io/docs

---

## ✅ CHECKLIST PRZED DEPLOYMENT

- [ ] .env configured (MODE, API keys if live)
- [ ] Database backed up
- [ ] Logs directory created
- [ ] Health checks working
- [ ] Monitoring setup
- [ ] Alerts configured
- [ ] Backup strategy
- [ ] SSL certificate (if public)
- [ ] Firewall rules
- [ ] Documentation updated

---

**Recommended:** Start z Railway.app ($5/mies), później przejdź na VPS gdy potrzebujesz więcej kontroli.

**For 24/7 trading:** VPS + PM2 + Systemd + Monitoring jest najbardziej reliable.

Powodzenia z deployment! 🚀
