#!/bin/bash
# Skrypt do konfiguracji środowiska Python dla optymalizacji w WSL
# 🐧 WERSJA LINUX/WSL - Zaktualizowano 2025-07-28
# ✅ Używa systemowego Python 3.10.18 zamiast Windows venv

# Kolory do lepszej czytelności
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ścieżki
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Dla WSL używamy lokalnego środowiska, nie na dysku Windows
VENV_DIR="$HOME/.venv/trading-bot"
REQUIREMENTS_PATH="$PROJECT_ROOT/tools/python/requirements.txt"

echo -e "${BLUE}Konfiguracja środowiska Python dla Ray Tune${NC}"
echo -e "${BLUE}Katalog projektu: ${PROJECT_ROOT}${NC}"
echo -e "${BLUE}Środowisko wirtualne: ${VENV_DIR}${NC}"

# Sprawdź, czy Python jest zainstalowany
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 nie jest zainstalowany. Zainstaluj go przed kontynuowaniem.${NC}"
    echo -e "Możesz użyć: sudo apt update && sudo apt install -y python3 python3-pip python3-venv"
    exit 1
fi

# Sprawdź wersję Pythona
PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}Używam: ${PYTHON_VERSION}${NC}"

# Upewnij się, że mamy python3-venv
echo -e "${BLUE}🔍 Sprawdzam wymagane pakiety...${NC}"
if ! dpkg -l | grep -q python3-venv; then
    echo -e "${YELLOW}⚠️ Pakiet python3-venv nie jest zainstalowany. Instaluję...${NC}"
    sudo apt update
    sudo apt install -y python3-venv python3-pip python3-dev
fi

# Utwórz wirtualne środowisko
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${YELLOW}Tworzę nowe środowisko wirtualne w ${VENV_DIR}${NC}"
    mkdir -p "$VENV_DIR"
    python3 -m venv "$VENV_DIR"
    
    if [ ! -d "$VENV_DIR" ]; then
        echo -e "${RED}Nie udało się utworzyć środowiska wirtualnego.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Środowisko wirtualne już istnieje.${NC}"
fi

# Aktywuj środowisko
echo -e "${YELLOW}Aktywuję środowisko wirtualne...${NC}"
source "$VENV_DIR/bin/activate"

# Aktualizuj pip
echo -e "${YELLOW}Aktualizuję pip...${NC}"
pip install --upgrade pip

# Zainstaluj wymagane pakiety
echo -e "${YELLOW}Instaluję wymagane pakiety...${NC}"
pip install -r "$REQUIREMENTS_PATH"

# Sprawdź, czy Ray jest zainstalowany
if python3 -c "import ray" &> /dev/null; then
    RAY_VERSION=$(python3 -c "import ray; print(ray.__version__)")
    echo -e "${GREEN}Ray jest zainstalowany (wersja: ${RAY_VERSION})${NC}"
else
    echo -e "${RED}Ray nie jest zainstalowany lub wystąpił błąd podczas importu.${NC}"
    exit 1
fi

# Sprawdź, czy Ray Tune jest zainstalowany
if python3 -c "from ray import tune" &> /dev/null; then
    echo -e "${GREEN}Ray Tune jest zainstalowany${NC}"
else
    echo -e "${RED}Ray Tune nie jest zainstalowany lub wystąpił błąd podczas importu.${NC}"
    exit 1
fi

# Zapisz ścieżkę do środowiska
echo "$VENV_DIR" > ~/.trading-bot-venv-path
echo -e "${GREEN}Zapisano ścieżkę do środowiska: ~/.trading-bot-venv-path${NC}"

echo -e "\n${GREEN}Środowisko zostało pomyślnie skonfigurowane!${NC}"
echo -e "${BLUE}Aby aktywować środowisko ręcznie, użyj:${NC}"
echo -e "source $VENV_DIR/bin/activate"

# Zapisz informacje o środowisku
echo "#!/bin/bash" > "$PROJECT_ROOT/tools/activate_env.sh"
echo "source \"$VENV_DIR/bin/activate\"" >> "$PROJECT_ROOT/tools/activate_env.sh"
chmod +x "$PROJECT_ROOT/tools/activate_env.sh"

echo -e "${GREEN}Utworzono skrypt aktywacyjny: ${PROJECT_ROOT}/tools/activate_env.sh${NC}"
echo -e "${YELLOW}Możesz teraz uruchomić optymalizację za pomocą:${NC}"
echo -e "npx ts-node tools/optimize_all_strategies_with_ray.ts"
