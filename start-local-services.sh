#!/bin/bash
# ============================================================================
# TURBO-BOT — Start Local GPU + Ollama Services
# PATCH #149H: Simple toggle to start GPU and Ollama locally
#
# Usage:
#   ./start-local-services.sh          # Start both GPU + Ollama
#   ./start-local-services.sh gpu      # Start GPU only
#   ./start-local-services.sh ollama   # Start Ollama only
#   ./start-local-services.sh status   # Check status
#   ./start-local-services.sh stop     # Stop local services
# ============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

GPU_PORT=4001
OLLAMA_PORT=11434
GPU_PID_FILE="/tmp/turbo-bot-gpu.pid"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

check_gpu_service() {
    if curl -s --connect-timeout 2 "http://127.0.0.1:${GPU_PORT}/ping" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ GPU Service: ONLINE (port ${GPU_PORT})${NC}"
        return 0
    else
        echo -e "${RED}❌ GPU Service: OFFLINE (port ${GPU_PORT})${NC}"
        return 1
    fi
}

check_ollama() {
    if curl -s --connect-timeout 2 "http://127.0.0.1:${OLLAMA_PORT}/api/tags" >/dev/null 2>&1; then
        local models
        models=$(curl -s "http://127.0.0.1:${OLLAMA_PORT}/api/tags" | python3 -c "import sys,json; [print(m['name']) for m in json.load(sys.stdin).get('models',[])]" 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✅ Ollama: ONLINE (port ${OLLAMA_PORT}) | Models: ${models}${NC}"
        return 0
    else
        echo -e "${RED}❌ Ollama: OFFLINE (port ${OLLAMA_PORT})${NC}"
        return 1
    fi
}

start_gpu() {
    echo -e "${CYAN}🚀 Starting GPU CUDA Service on port ${GPU_PORT}...${NC}"
    
    if check_gpu_service 2>/dev/null; then
        echo -e "${YELLOW}GPU Service already running${NC}"
        return 0
    fi
    
    # Check if Python and torch are available
    if ! command -v python3 &>/dev/null; then
        echo -e "${RED}❌ python3 not found. Install Python 3.8+${NC}"
        return 1
    fi
    
    # Start gpu-cuda-service.py in background
    cd "${SCRIPT_DIR}"
    GPU_PORT=${GPU_PORT} nohup python3 gpu-cuda-service.py > /tmp/turbo-bot-gpu.log 2>&1 &
    echo $! > "${GPU_PID_FILE}"
    
    # Wait for startup
    echo -n "Waiting for GPU service"
    for i in $(seq 1 15); do
        if curl -s --connect-timeout 1 "http://127.0.0.1:${GPU_PORT}/ping" >/dev/null 2>&1; then
            echo ""
            echo -e "${GREEN}✅ GPU Service started (PID: $(cat ${GPU_PID_FILE}))${NC}"
            
            # Check backend (CUDA or CPU)
            local health
            health=$(curl -s "http://127.0.0.1:${GPU_PORT}/health" 2>/dev/null || echo "{}")
            local backend
            backend=$(echo "${health}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('backend','unknown'))" 2>/dev/null || echo "unknown")
            echo -e "${CYAN}   Backend: ${backend}${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
    done
    echo ""
    echo -e "${RED}❌ GPU Service failed to start. Check /tmp/turbo-bot-gpu.log${NC}"
    return 1
}

start_ollama() {
    echo -e "${CYAN}🚀 Checking Ollama on port ${OLLAMA_PORT}...${NC}"
    
    if check_ollama 2>/dev/null; then
        echo -e "${YELLOW}Ollama already running${NC}"
        return 0
    fi
    
    # Try to start Ollama
    if command -v ollama &>/dev/null; then
        echo "Starting Ollama serve..."
        nohup ollama serve > /tmp/turbo-bot-ollama.log 2>&1 &
        
        echo -n "Waiting for Ollama"
        for i in $(seq 1 20); do
            if curl -s --connect-timeout 1 "http://127.0.0.1:${OLLAMA_PORT}/api/tags" >/dev/null 2>&1; then
                echo ""
                echo -e "${GREEN}✅ Ollama started${NC}"
                
                # Check if required model is available
                local model="${OLLAMA_MODEL:-qwen3:14b}"
                local has_model
                has_model=$(curl -s "http://127.0.0.1:${OLLAMA_PORT}/api/tags" | python3 -c "import sys,json; models=[m['name'] for m in json.load(sys.stdin).get('models',[])]; print('yes' if any('${model}' in m for m in models) else 'no')" 2>/dev/null || echo "no")
                
                if [ "${has_model}" = "no" ]; then
                    echo -e "${YELLOW}⚠️  Model '${model}' not found. Pulling...${NC}"
                    ollama pull "${model}" || echo -e "${RED}Failed to pull ${model}. Try manually: ollama pull ${model}${NC}"
                fi
                return 0
            fi
            echo -n "."
            sleep 1
        done
        echo ""
        echo -e "${RED}❌ Ollama failed to start. Check /tmp/turbo-bot-ollama.log${NC}"
        return 1
    else
        echo -e "${RED}❌ Ollama not installed. Install: curl -fsSL https://ollama.com/install.sh | sh${NC}"
        return 1
    fi
}

stop_services() {
    echo -e "${CYAN}🛑 Stopping local services...${NC}"
    
    # Stop GPU
    if [ -f "${GPU_PID_FILE}" ]; then
        local pid
        pid=$(cat "${GPU_PID_FILE}")
        if kill -0 "${pid}" 2>/dev/null; then
            kill "${pid}"
            echo -e "${GREEN}GPU Service stopped (PID: ${pid})${NC}"
        fi
        rm -f "${GPU_PID_FILE}"
    fi
    
    # Note: Ollama is system-level, don't auto-stop it
    echo -e "${YELLOW}Note: Ollama is not stopped (it's a system service). Stop manually: systemctl stop ollama${NC}"
}

show_status() {
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    echo -e "${CYAN}   TURBO-BOT Local Services Status${NC}"
    echo -e "${CYAN}════════════════════════════════════════${NC}"
    check_gpu_service || true
    check_ollama || true
    
    echo ""
    echo -e "${CYAN}Environment variables for ecosystem.config.js:${NC}"
    echo "  GPU_LOCAL_MODE=true"
    echo "  OLLAMA_LOCAL_MODE=true"
    echo ""
    echo -e "${CYAN}Fallback behavior when local PC is off:${NC}"
    echo "  GPU → CPU fallback (built into HybridQuantumClassicalPipeline)"
    echo "  Ollama → next LLM provider (GitHub → Grok → Claude → rule-based)"
}

# ── MAIN ──────────────────────────────────────────────────────────────
case "${1:-all}" in
    gpu)
        start_gpu
        ;;
    ollama)
        start_ollama
        ;;
    status)
        show_status
        ;;
    stop)
        stop_services
        ;;
    all)
        start_gpu
        echo ""
        start_ollama
        echo ""
        show_status
        ;;
    *)
        echo "Usage: $0 {all|gpu|ollama|status|stop}"
        exit 1
        ;;
esac
