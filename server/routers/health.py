"""헬스체크 — 파일명 `health.py` ↔ router prefix `/api/health` 일치 컨벤션."""
from fastapi import APIRouter

# ⚠️ 파일명과 prefix 가 일치해야 vite 자동 디스커버리에 잡힘
router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("")
async def health_check() -> dict:
    return {"status": "ok", "service": "ez2ai_builder"}
