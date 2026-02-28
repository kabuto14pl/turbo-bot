# ⚡ START HERE - VPS 48H DEPLOYMENT (ULTRA QUICK)

**Nie chcesz czytać dokumentacji? Wykonaj tylko te kroki:**

---

## 🚀 5 KOMEND = BOT DZIAŁA 48H

### 1️⃣ Otwórz nowy terminal (PowerShell)
```
Win+R → wpisz "powershell" → Enter
```

### 2️⃣ Połącz z VPS
```bash
ssh root@64.226.70.149
```
*Wpisz password gdy poprosi*

### 3️⃣ Deployment (skopiuj i wklej całość)
```bash
curl -fsSL https://raw.githubusercontent.com/kabuto14pl/turbo-bot/master/scripts/deploy_to_vps.sh -o deploy.sh && chmod +x deploy.sh && ./deploy.sh
```
*Poczekaj 5 minut - zobaczysz progress*

### 4️⃣ Sprawdź czy działa
```bash
pm2 list
```
*Powinno pokazać: "turbo-bot | online" ✅*

### 5️⃣ Zobacz logi
```bash
pm2 logs turbo-bot --lines 30
```
*Szukaj: "Enterprise ML System v2.0.0 loaded successfully" ✅*

---

## ✅ GOTOWE!

**Bot działa 24/7 na serwerze!**

Możesz teraz:
- ✅ **ZAMKNĄĆ VS Code** - bot pracuje dalej
- ✅ **WYŁĄCZYĆ komputer** - bot nadal działa
- ✅ **Sprawdzać status** kiedy chcesz:
  ```bash
  ssh root@64.226.70.149
  pm2 logs turbo-bot
  ```

---

## 📊 Monitoring (opcjonalne)

W SSH terminal:
```bash
pm2 monit
```
*Real-time monitoring UI (Ctrl+C aby wyjść)*

---

## 🚨 Jeśli coś nie działa

```bash
# Sprawdź błędy
pm2 logs turbo-bot --err --lines 50

# Restart
pm2 restart turbo-bot

# Status
pm2 describe turbo-bot
```

---

## 📖 Więcej info?

- **Pełna dokumentacja:** [VPS_DEPLOYMENT_GUIDE.md](VPS_DEPLOYMENT_GUIDE.md)
- **Komendy:** [VPS_COMMAND_CARD.md](VPS_COMMAND_CARD.md)
- **Weryfikacja:** [VPS_VERIFICATION_CHECKLIST.md](VPS_VERIFICATION_CHECKLIST.md)

---

**⏱️ Całość: ~10 minut**  
**🎯 Rezultat: Bot 24/7 przez 48h (i dłużej!)**  
**✨ Zero zależności od VS Code czy lokalnego PC!**

---

## 💡 Quick Commands (zapisz sobie)

```bash
ssh root@64.226.70.149        # Połącz
pm2 list                       # Status
pm2 logs turbo-bot            # Logi
pm2 restart turbo-bot         # Restart
curl localhost:3001/health    # Health check
```

---

**🚀 To wszystko! Teraz wykonaj kroki 1-5 powyżej!**
