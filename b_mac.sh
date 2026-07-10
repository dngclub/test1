#!/usr/bin/env bash
# ez2AI Standalone runner (macOS). Mirrors b.bat.
#   b_mac.sh            launch: backend in a NEW Terminal window, frontend in THIS terminal
#   b_mac.sh backend    run backend  in current shell
#   b_mac.sh frontend   run frontend in current shell
#   b_mac.sh stop       free BE/FE ports
#
# Mode flags (consumed by server/_run_mode.py and vite.config.ts):
#   RUN_MODE=standalone, EZ2AI_RUN_MODE=standalone, VITE_RUN_MODE=standalone
# .env.standalone in project root overrides port defaults (KEY=VALUE per line).
set -u

export RUN_MODE=standalone EZ2AI_RUN_MODE=standalone VITE_RUN_MODE=standalone
export VITE_BASE_PATH=/
: "${VITE_ALLOWED_HOSTS:=all}"; export VITE_ALLOWED_HOSTS
export PYTHONIOENCODING=utf-8 PYTHONUTF8=1

# ---- load .env.standalone (already-set env vars take precedence) ----
if [ -f ".env.standalone" ]; then
  while IFS='=' read -r k v; do
    case "$k" in ''|\#*) continue ;; esac
    cur=$(eval "printf '%s' \"\${$k:-}\"")
    [ -z "$cur" ] && export "$k=$v"
  done < .env.standalone
fi
: "${BACKEND_PORT:=13502}"; export BACKEND_PORT
: "${FRONTEND_PORT:=13501}"; export FRONTEND_PORT

free_port() {
  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -ti "tcp:$1" 2>/dev/null || true)
    [ -n "$pids" ] && kill -9 $pids 2>/dev/null || true
  fi
}

# Create .venv resiliently — bypass a PATH-shadowing parent venv whose interpreter
# cannot bootstrap pip (no ensurepip). Probe real base interpreters by ABSOLUTE path
# first (Homebrew Apple Silicon/Intel + system), then fall back to uv / virtualenv.
create_venv() {
  for py in "${EZ2AI_CHILD_PYTHON:-}" \
            /opt/homebrew/bin/python3 /usr/local/bin/python3 /usr/bin/python3 \
            python3.12 python3.11 python3.10 python3; do
    [ -z "$py" ] && continue
    command -v "$py" >/dev/null 2>&1 || [ -x "$py" ] || continue
    if "$py" -m venv .venv >/dev/null 2>&1 && [ -f .venv/bin/activate ]; then
      echo "[OK]   venv created with: $py"
      return 0
    fi
    rm -rf .venv 2>/dev/null || true
  done
  if command -v uv >/dev/null 2>&1 && uv venv .venv >/dev/null 2>&1; then
    echo "[OK]   venv created with: uv"; return 0
  fi
  if command -v virtualenv >/dev/null 2>&1 && virtualenv -p python3 .venv >/dev/null 2>&1; then
    echo "[OK]   venv created with: virtualenv"; return 0
  fi
  return 1
}

# Install requirements into the ACTIVE venv. Prefer the venv's own pip; if the venv
# has no pip (uv-created), fall back to 'uv pip install'.
install_deps() {
  if python -m pip install -r requirements.txt; then return 0; fi
  if command -v uv >/dev/null 2>&1 && uv pip install -r requirements.txt; then return 0; fi
  return 1
}

run_backend() {
  echo "=== ez2AI Standalone - Backend (port $BACKEND_PORT) ==="
  free_port "$BACKEND_PORT"
  [ -d .venv ] && [ ! -f .venv/bin/activate ] && rm -rf .venv
  if [ ! -d .venv ]; then
    create_venv || {
      echo "[ERROR] venv create failed - no venv-capable python found."
      echo "        Install one of: python3-venv, uv, or virtualenv."
      exit 1
    }
  fi
  . .venv/bin/activate
  if ! python -c "import uvicorn, fastapi, sqlalchemy, watchfiles, jwt, pymysql" 2>/dev/null; then
    install_deps || { echo "[ERROR] pip install failed"; exit 1; }
  fi
  mkdir -p .dev_context/logs .dev_context/runtime
  # --reload-dir server: watch only the python source. Otherwise watchfiles also
  # watches .dev_context/logs/standalone.log; at debug level its change logs are
  # written back into that file -> a new change -> infinite self-feeding watch loop.
  echo "[RUN ] uvicorn server.app:app --port $BACKEND_PORT --reload --reload-dir server"
  exec python -m uvicorn server.app:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload --reload-dir server --timeout-graceful-shutdown 3
}

run_frontend() {
  echo "=== ez2AI Standalone - Frontend (port $FRONTEND_PORT) ==="
  free_port "$FRONTEND_PORT"
  cd web || exit 1
  if [ ! -d node_modules ] || [ ! -x node_modules/.bin/vite ]; then
    npm install || { echo "[ERROR] npm install failed"; exit 1; }
  fi
  echo "[RUN ] vite --port $FRONTEND_PORT --mode standalone"
  exec npx vite --port "$FRONTEND_PORT" --strictPort --mode standalone
}

case "${1:-}" in
  backend)  run_backend ;;
  frontend) run_frontend ;;
  stop)     free_port "$BACKEND_PORT"; free_port "$FRONTEND_PORT"; echo "[OK] stopped" ;;
  "")
    echo "=== ez2AI Standalone (macOS) ==="
    echo "  Backend  : new Terminal window - http://localhost:$BACKEND_PORT"
    echo "  Frontend : THIS terminal       - http://localhost:$FRONTEND_PORT"
    DIR=$(pwd)
    mkdir -p .dev_context/logs
    if ! osascript -e "tell application \"Terminal\" to do script \"cd '$DIR' && ./b_mac.sh backend\"" >/dev/null 2>&1; then
      echo "[WARN] could not open a new Terminal; running backend in background"
      "$0" backend >.dev_context/logs/standalone.log 2>&1 &
      BE_PID=$!
      trap 'kill "$BE_PID" 2>/dev/null; free_port "$FRONTEND_PORT"' INT TERM EXIT
    fi
    sleep 2
    run_frontend
    ;;
  *) echo "[Usage] b_mac.sh | b_mac.sh backend | b_mac.sh frontend | b_mac.sh stop"; exit 1 ;;
esac
