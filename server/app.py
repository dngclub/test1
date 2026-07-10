"""자식 프로젝트 FastAPI 진입점.

본체 ez2ai_server 와 무관하게 동작. 자체 비즈니스 라우터는 server/routers/ 하위에 추가.
사용자 인증은 자식 frontend 가 vite proxy 로 본체 API 직접 호출하므로
본 backend 는 자체 라우터에서만 JWT 검증을 사용 (server/auth.py).
"""
import logging
import os
import pathlib

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.routers import router as routers_router

# === ez2ai backend file logging v2 ===
# dev_plan/64/11 §3.4 — EZ2AI_BACKEND_LOG_FILE 환경변수가 set 되면
# root + uvicorn 계열 logger 에 모두 FileHandler 추가. 누가 띄우든 동일 file 누적.
_log_path = os.environ.get('EZ2AI_BACKEND_LOG_FILE')
if _log_path:
    try:
        pathlib.Path(_log_path).parent.mkdir(parents=True, exist_ok=True)
        _abs = str(pathlib.Path(_log_path).resolve())
        _h = logging.FileHandler(_log_path, mode='a', encoding='utf-8')
        _h.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s %(name)s: %(message)s'
        ))
        for _name in (
            '', 'uvicorn', 'uvicorn.error', 'uvicorn.access',
            'fastapi', 'sqlalchemy.engine',
        ):
            _lg = logging.getLogger(_name)
            if not any(
                getattr(h, 'baseFilename', None) == _abs for h in _lg.handlers
            ):
                _lg.addHandler(_h)
            if _lg.level == logging.NOTSET or _lg.level > logging.INFO:
                _lg.setLevel(logging.INFO)
    except Exception:  # noqa: BLE001
        pass
# === end ez2ai backend file logging v2 ===

app = FastAPI(title='ez2AI Builder Project')

_origins = [
    os.environ.get('EZ2AI_BASE_URL', 'http://localhost:8000'),
]
_frontend_port = os.environ.get('FRONTEND_PORT', '3001')
_origins.append(f'http://localhost:{_frontend_port}')

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(routers_router)


@app.get('/health')
def health() -> dict:
    return {'status': 'ok'}
