#!/usr/bin/env bash
set -euo pipefail

VPS_HOST="${VPS_HOST:-root@64.226.70.149}"
REMOTE_HEALTH_URL="${REMOTE_HEALTH_URL:-http://127.0.0.1:4001/health}"
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-8}"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --host)
            VPS_HOST="$2"
            shift 2
            ;;
        --remote-health-url)
            REMOTE_HEALTH_URL="$2"
            shift 2
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 64
            ;;
    esac
done

echo "[vps-check] host=$VPS_HOST"
echo "[vps-check] remote_health_url=$REMOTE_HEALTH_URL"

ssh_opts=(
    -o BatchMode=yes
    -o PreferredAuthentications=publickey
    -o PubkeyAuthentication=yes
    -o NumberOfPasswordPrompts=0
    -o KbdInteractiveAuthentication=no
    -o PasswordAuthentication=no
    -o ConnectTimeout="$SSH_CONNECT_TIMEOUT"
    -o StrictHostKeyChecking=accept-new
)

if ! ssh "${ssh_opts[@]}" "$VPS_HOST" "echo [ssh-ok]" >/dev/null 2>&1; then
    echo "[vps-check] ERROR: SSH key-based access is not available for $VPS_HOST" >&2
    echo "[vps-check] HINT: configure SSH keys or run the health command manually on VPS" >&2
    exit 77
fi

health_json="$(ssh "${ssh_opts[@]}" "$VPS_HOST" "curl -fsS --max-time 5 '$REMOTE_HEALTH_URL'" 2>/dev/null || true)"

if [[ -z "$health_json" ]]; then
    echo "[vps-check] ERROR: remote GPU tunnel health endpoint did not respond" >&2
    exit 78
fi

echo "[vps-check] health=$health_json"

if grep -q '"status":"online"' <<<"$health_json"; then
    echo "[vps-check] RESULT=ONLINE"
    exit 0
fi

echo "[vps-check] RESULT=NOT_ONLINE"
exit 79