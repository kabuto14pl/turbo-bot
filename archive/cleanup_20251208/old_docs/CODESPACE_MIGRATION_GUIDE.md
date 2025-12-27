<!-- 📚 [SHARED-INFRASTRUCTURE] -->
<!-- Documentation component -->
# 🚀 Turbo Trading Bot - GitHub Codespaces Migration Guide

## Gotowe do przeniesienia! 🎯

Twój projekt został przygotowany do działania w GitHub Codespaces. Oto co zostało skonfigurowane:

### ✅ Utworzone pliki konfiguracyjne:

1. **`.devcontainer/devcontainer.json`** - Główna konfiguracja Codespace
2. **`.devcontainer/setup.sh`** - Skrypt automatycznej instalacji
3. **`.env.template`** - Szablon zmiennych środowiskowych
4. **`docker-compose.codespace.yml`** - Konfiguracja kontenerów
5. **`Dockerfile`** - Obraz Dockera dla produkcji
6. **GitHub Workflows** - CI/CD pipeline

### 🔧 Zaktualizowane pliki:

- **`package.json`** - Dodane skrypty i zależności
- **`README.md`** - Dokumentacja dla Codespaces
- **`.gitignore`** - Rozszerzona lista ignorowanych plików
- **ESLint/Prettier** - Konfiguracja formatowania kodu

## 🚀 Kroki do przeniesienia:

### 1. Przygotuj repozytorium
```bash
# Zatwierdź wszystkie zmiany
git add .
git commit -m "🚀 Prepare for GitHub Codespaces migration"
git push origin main
```

### 2. Utwórz Codespace
1. Idź do swojego repozytorium na GitHub
2. Kliknij zielony przycisk **"Code"**
3. Wybierz zakładkę **"Codespaces"**
4. Kliknij **"Create codespace on main"**

### 3. Konfiguracja po starcie Codespace
```bash
# Skopiuj zmienne środowiskowe
cp .env.template .env

# Edytuj .env i dodaj swoje klucze API:
# - OKX_API_KEY
# - OKX_SECRET_KEY  
# - OKX_PASSPHRASE
```

### 4. Uruchom bota
```bash
# Tryb deweloperski z hot reload
npm run dev

# Lub tryb produkcyjny
npm start
```

## 🌟 Funkcje Codespace:

### 🔗 Porty (automatycznie przekierowane):
- **3000** - API bota
- **8080** - Grafana Dashboard
- **9090** - Prometheus Metrics
- **3001** - Frontend UI

### 🛠️ Dostępne komendy:
```bash
npm run dev          # Tryb deweloperski
npm run build        # Budowanie TypeScript
npm test             # Testy jednostkowe
npm run lint         # Sprawdzanie kodu
npm run monitor      # Uruchom monitoring
npm run health       # Sprawdź status bota
```

### 📊 Monitoring:
- **Grafana**: `http://localhost:8080` (admin/admin123)
- **Prometheus**: `http://localhost:9090`
- **Health Check**: `http://localhost:3000/health`

## 🔒 Bezpieczeństwo:

### ⚠️ WAŻNE - Klucze API:
1. **NIE** commituj pliku `.env` do repozytorium
2. Używaj **GitHub Secrets** dla produkcji
3. W Codespace klucze są bezpieczne w `.env`

### 🔐 Zarządzanie sekretami:
```bash
# Dodaj sekrety w GitHub:
# Settings → Secrets and variables → Codespaces
# - OKX_API_KEY
# - OKX_SECRET_KEY
# - OKX_PASSPHRASE
```

## 🐛 Rozwiązywanie problemów:

### Problem z uprawnieniami:
```bash
./scripts/fix-permissions.sh
```

### Problem z zależnościami:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Problem z TypeScript:
```bash
npm run build
npx tsc --init
```

## 🎯 Korzyści z Codespaces:

1. **✅ Koniec z problemami WSL**
2. **🌐 Dostęp z dowolnego miejsca**
3. **🔧 Prekonfigurowane środowisko**
4. **🚀 Szybki start projektu**
5. **📊 Zintegrowany monitoring**
6. **🐳 Docker support**
7. **🔄 Automatyczne CI/CD**

## 📞 Wsparcie:

Jeśli masz problemy:
1. Sprawdź logi: `npm run logs`
2. Sprawdź health: `npm run health`
3. Zrestartuj Codespace
4. Sprawdź GitHub Issues

---

**🎉 Gratulacje! Twój bot jest gotowy do działania w chmurze!**

Żadnych więcej problemów z WSL - wszystko działa w przeglądarce! 🌟
