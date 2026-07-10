@echo off
REM ASCII-only - cmd.exe parses .bat under CP949 even with chcp 65001.
REM Non-ASCII text breaks line parsing and silently splits commands.
REM
REM === Standalone runner (CHAT 2026-05-20 Q7=C) ===
REM Runs P00001 safety system WITHOUT the host ez2AI server on port 8000.
REM
REM   b.bat               - launch BOTH consoles (default)
REM   b.bat backend       - run backend  in current console (port 13502)
REM   b.bat frontend      - run frontend in current console (port 13501)
REM   b.bat stop          - kill any process holding BE/FE ports
REM
REM Mode flags injected (consumed by server/_run_mode.py and vite.config.ts):
REM   RUN_MODE=standalone, EZ2AI_RUN_MODE=standalone, VITE_RUN_MODE=standalone
REM
REM Auth: child uses self-contained JWT against tsopdev.co_user
REM (server/_auth_local.py). NO host introspection.
REM
REM .env.standalone in project root overrides port defaults (KEY=VALUE per line).
chcp 65001 > nul
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1

REM ---- mode flags ----
set RUN_MODE=standalone
set EZ2AI_RUN_MODE=standalone
set VITE_RUN_MODE=standalone

REM ---- vite base path: standalone serves at root ----
set VITE_BASE_PATH=/
if "%VITE_ALLOWED_HOSTS%"=="" set VITE_ALLOWED_HOSTS=all

REM ---- load .env.standalone (KEY=VALUE per line, # comments ignored) ----
REM Already-set env vars (e.g. BACKEND_PORT/FRONTEND_PORT injected by the builder
REM from project settings) take precedence over .env.standalone defaults.
if exist ".env.standalone" (
    for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env.standalone") do (
        if not "%%A"=="" if not defined %%A set "%%A=%%B"
    )
)

REM ---- defaults (only if not set by env or .env.standalone) ----
if "%BACKEND_PORT%"=="" set BACKEND_PORT=13502
if "%FRONTEND_PORT%"=="" set FRONTEND_PORT=13501

title ez2AI Standalone - %~1

if /i "%~1"=="backend"  goto backend
if /i "%~1"=="frontend" goto frontend
if /i "%~1"=="stop"     goto stop
if "%~1"==""             goto launch_both
echo [Usage] b.bat                  ^(no arg^)  -- launch BOTH (BE + FE)
echo         b.bat backend          -- run BE  in current console
echo         b.bat frontend         -- run FE  in current console
echo         b.bat stop             -- kill any process holding BE/FE ports
echo         env: BACKEND_PORT (default 13502), FRONTEND_PORT (default 13501)
echo         mode: standalone (no host ez2AI :8000 required)
echo [Received] arg=[%~1]
pause
exit /b 1

REM ============================================================
REM :: LAUNCH :: (no-arg default - backend in NEW console, frontend in THIS one)
REM    Matches the parent project b.bat: only the backend opens a new cmd window;
REM    the frontend (vite) runs in the current terminal so its output stays here.
REM ============================================================
:launch_both
echo ===============================================
echo   ez2AI Standalone
echo   Backend  : new console  - http://localhost:%BACKEND_PORT%
echo   Frontend : THIS console - http://localhost:%FRONTEND_PORT%
echo ===============================================
echo [INFO] Opening backend console...
start "ez2AI Standalone BE (port %BACKEND_PORT%)" cmd /k "%~f0 backend"
REM tiny delay so BE binds the port before FE proxies through it
timeout /t 2 /nobreak > nul
echo [INFO] Starting frontend in THIS console (Ctrl+C to stop)...
echo.
goto frontend

REM ============================================================
REM :: STOP :: (free both ports if held)
REM ============================================================
:stop
echo [INFO] Freeing BACKEND_PORT %BACKEND_PORT% ...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%BACKEND_PORT% ^| findstr LISTENING') do (
    echo [PORT %BACKEND_PORT%] PID %%a terminating...
    taskkill /F /PID %%a >nul 2>&1
)
echo [INFO] Freeing FRONTEND_PORT %FRONTEND_PORT% ...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%FRONTEND_PORT% ^| findstr LISTENING') do (
    echo [PORT %FRONTEND_PORT%] PID %%a terminating...
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] done.
exit /b 0

REM ============================================================
REM :: BACKEND :: (standalone)
REM ============================================================
:backend
echo ===============================================
echo   ez2AI Standalone - Backend
echo   Mode: %RUN_MODE%
echo   Port: %BACKEND_PORT%
echo   URL : http://localhost:%BACKEND_PORT%
echo ===============================================

REM ---- pre-cleanup: kill leftover holder of our port ----
echo [INFO] Checking port %BACKEND_PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%BACKEND_PORT% ^| findstr LISTENING') do (
    echo [PORT %BACKEND_PORT%] PID %%a terminating...
    taskkill /F /PID %%a >nul 2>&1
)

REM ---- venv (regenerate if broken, create if missing) ----
set VENV_BROKEN=0
if exist ".venv" (
    if not exist ".venv\Scripts\activate.bat" set VENV_BROKEN=1
)
if "%VENV_BROKEN%"=="1" (
    echo [WARN] .venv corrupt ^(activate.bat missing^) - regenerating...
    rmdir /s /q ".venv"
)
if not exist ".venv" (
    echo [INFO] Creating Python venv...
    python -m venv .venv
    if errorlevel 1 (
        echo [ERROR] venv create failed. Python 3.11+ must be on PATH.
        pause
        exit /b 1
    )
    echo [OK]   venv created
)
call ".venv\Scripts\activate.bat"
if errorlevel 1 (
    echo [ERROR] venv activate failed. Delete .venv and retry.
    pause
    exit /b 1
)
echo [OK]   venv activated

REM ---- core deps + pyjwt (standalone JWT) ----
python -c "import uvicorn, fastapi, sqlalchemy, watchfiles, jwt, pymysql" 2>nul
if errorlevel 1 (
    echo [INFO] Installing requirements.txt...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] requirements.txt install failed.
        pause
        exit /b 1
    )
    echo [OK]   requirements.txt installed
) else (
    echo [OK]   core deps available
)

REM ---- log / runtime dirs ----
if "%EZ2AI_BACKEND_LOG_FILE%"=="" set EZ2AI_BACKEND_LOG_FILE=%CD%\.dev_context\logs\standalone.log
if not exist ".dev_context\logs"    mkdir ".dev_context\logs"
if not exist ".dev_context\runtime" mkdir ".dev_context\runtime"

REM ---- alembic skipped: standalone uses existing tsopdev schema only ----
echo [SKIP] alembic - standalone mode uses existing tsopdev schema (read-only co_user)

REM ---- log level (EZ2AI_DEBUG=1/true/yes -> debug, else info) ----
set UV_LOG_LEVEL=info
if /i "%EZ2AI_DEBUG%"=="1"    set UV_LOG_LEVEL=debug
if /i "%EZ2AI_DEBUG%"=="true" set UV_LOG_LEVEL=debug
if /i "%EZ2AI_DEBUG%"=="yes"  set UV_LOG_LEVEL=debug
if /i "%EZ2AI_DEBUG%"=="on"   set UV_LOG_LEVEL=debug
echo [INFO] EZ2AI_DEBUG=%EZ2AI_DEBUG% -> uvicorn --log-level %UV_LOG_LEVEL%

REM ---- start uvicorn (--reload for HMR) ----
REM   --reload-dir server : watch ONLY the python source tree.
REM   Without it, watchfiles also watches .dev_context\logs\standalone.log and .git.
REM   At debug level watchfiles logs every change, and that log line is written back
REM   into standalone.log (root FileHandler) -> a new change -> infinite watch loop.
echo.
echo [RUN ] uvicorn server.app:app --port %BACKEND_PORT% --reload --reload-dir server (standalone)
python -m uvicorn server.app:app --host 0.0.0.0 --port %BACKEND_PORT% --reload --reload-dir server --timeout-graceful-shutdown 3 --log-level %UV_LOG_LEVEL%
echo.
echo [END ] uvicorn stopped. Press any key to close console.
pause > nul
exit /b

REM ============================================================
REM :: FRONTEND :: (standalone)
REM ============================================================
:frontend
echo ===============================================
echo   ez2AI Standalone - Frontend
echo   Mode: %VITE_RUN_MODE%
echo   Port: %FRONTEND_PORT%
echo   URL : http://localhost:%FRONTEND_PORT%
echo ===============================================

REM ---- pre-cleanup ----
echo [INFO] Checking port %FRONTEND_PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%FRONTEND_PORT% ^| findstr LISTENING') do (
    echo [PORT %FRONTEND_PORT%] PID %%a terminating...
    taskkill /F /PID %%a >nul 2>&1
)

cd web

REM ---- node_modules (install if missing or vite missing) ----
set NEED_NPM=0
if not exist "node_modules" set NEED_NPM=1
if exist "node_modules" (
    if not exist "node_modules\.bin\vite.cmd" set NEED_NPM=1
)
if "%NEED_NPM%"=="1" (
    echo [INFO] Installing node_modules ^(first run may take 1-2 min^)...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    echo [OK]   node_modules installed
) else (
    echo [OK]   node_modules already present
)

REM ---- start vite (standalone mode: loads web/.env.standalone) ----
echo.
echo [RUN ] npx vite --port %FRONTEND_PORT% --mode standalone
call npx vite --port %FRONTEND_PORT% --strictPort --mode standalone
echo.
echo [END ] vite stopped. Press any key to close console.
pause > nul
exit /b
