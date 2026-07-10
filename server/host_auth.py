"""본체(ez2AI :8000) 토큰 introspection — 자식이 자체 JWT 디코드 없이 검증.

CLAUDE.md §B.1.1 ("자식 backend 자체 인증 검증 금지", "토큰 검증은 본체로 위임") 준수:
- 자식 SECRET_KEY 미보유 / JWT 디코드 코드 없음.
- 본체 `/api/users/me` 호출 결과의 tenant_id 를 사용 (서명 검증된 값 → 위조 불가).

캐시: 토큰 sha256 → 60초 TTL (본체 호출 부하 완화).
실패 모드:
- 본체 401 → 자식 401 (그대로 전파)
- 본체 비응답 → 503 (fail-closed: 무인증 통과 절대 금지)
- 본체 200 이지만 tenant_id 누락 → 403
"""

from __future__ import annotations

import hashlib
import os
import threading
import time

import httpx
from fastapi import Header, HTTPException
from pydantic import BaseModel

# 본체 URL — env_manager / b.bat 환경 모두 기본값으로 동작.
HOST_URL = os.environ.get("EZ2AI_HOST_URL", "http://localhost:8000")
INTROSPECT_PATH = "/api/users/me"
CACHE_TTL_SECONDS = 60.0
HTTP_TIMEOUT_SECONDS = 5.0


class HostUser(BaseModel):
    """본체가 검증해 돌려준 사용자 컨텍스트 (검증된 값만).

    extra 필드는 Pydantic 2.x 기본 'ignore' — 본체가 추가 필드를 줘도 무시.
    """

    user_id: str
    tenant_id: str | None = None
    group_id: str | None = None
    role: int | None = None
    is_super_admin: bool = False

    @property
    def effective_tenant_id(self) -> str | None:
        """검증된 테넌트 컨텍스트 (selected_tenant_id 제거 후 tenant_id 직접 반환)."""
        return self.tenant_id


# ── TTL 캐시 (in-process) ─────────────────────────────
_cache: dict[str, tuple[HostUser, float]] = {}
_cache_lock = threading.Lock()


def _token_key(token: str) -> str:
    """캐시 키 — 평문 토큰을 메모리에 보관하지 않기 위해 sha256."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _cache_get(token: str) -> HostUser | None:
    key = _token_key(token)
    now = time.monotonic()
    with _cache_lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        user, expires_at = entry
        if now >= expires_at:
            _cache.pop(key, None)
            return None
        return user


def _cache_set(token: str, user: HostUser) -> None:
    key = _token_key(token)
    with _cache_lock:
        _cache[key] = (user, time.monotonic() + CACHE_TTL_SECONDS)


# ── HTTP 클라이언트 (모듈 전역 — httpx.Client 는 thread-safe) ──
_client = httpx.Client(timeout=HTTP_TIMEOUT_SECONDS)


# ── Depends ──────────────────────────────────────────
def verify_with_host(
    authorization: str | None = Header(default=None),
) -> HostUser:
    """모든 보호 엔드포인트에서 Depends(verify_with_host) 로 사용.

    embedded 모드 (기본): 본체 introspection 으로 토큰 검증 (이하 기존 로직).
    standalone 모드 (CHAT.md 2026-05-20): 자식 자체 JWT 검증 (server._auth_local).

    헤더 누락 시 FastAPI 의 422 대신 일관된 401 을 반환 (프론트가 /login 으로 보내기 쉽게).
    """
    # ── standalone 모드 분기 (자식 자체 JWT) ──────────
    from server._run_mode import is_standalone  # lazy import (순환 방지)

    if is_standalone():
        from server import _auth_local

        return _auth_local.verify_jwt_to_host_user(authorization)

    # ── embedded 모드 (기존 본체 introspection) ──────
    if not authorization:
        raise HTTPException(status_code=401, detail="인증 헤더가 없습니다.")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="인증 헤더 형식 오류 (Bearer 필요)")
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="토큰이 비어 있습니다.")

    cached = _cache_get(token)
    if cached is not None:
        return cached

    try:
        res = _client.get(
            f"{HOST_URL}{INTROSPECT_PATH}",
            headers={"Authorization": f"Bearer {token}"},
        )
    except httpx.HTTPError as exc:
        # 본체 비응답 — fail-closed (절대 무인증 통과 금지)
        raise HTTPException(
            status_code=503,
            detail="인증 서버(본체) 응답 불가 — 잠시 후 다시 시도하세요.",
        ) from exc

    if res.status_code == 401:
        raise HTTPException(
            status_code=401,
            detail="토큰이 유효하지 않거나 만료되었습니다.",
        )
    if res.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"본체 인증 응답 오류 ({res.status_code})",
        )

    try:
        payload = res.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="본체 인증 응답 파싱 실패") from exc

    try:
        user = HostUser(**payload)
    except Exception as exc:  # pydantic ValidationError 포함
        raise HTTPException(
            status_code=502,
            detail=f"본체 인증 응답 형식 오류: {exc}",
        ) from exc

    if not user.effective_tenant_id:
        raise HTTPException(
            status_code=403,
            detail="테넌트 컨텍스트가 없는 사용자입니다.",
        )

    _cache_set(token, user)
    return user
