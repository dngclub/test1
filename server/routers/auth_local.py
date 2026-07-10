"""Standalone 모드 자체 인증 라우터 — /api/auth/*.

CHAT.md 2026-05-20 — embedded 모드에서는 본체 ez2ai_server (/api/auth/login 등) 가
이 path 를 처리. standalone 모드에서는 본 라우터가 처리 (vite proxy 분기로 결정).

본 라우터는 embedded 모드에서도 마운트되긴 하지만, vite proxy 가 standalone 일 때만
자식 BE 로 forward 하므로 충돌 없음.

엔드포인트:
- POST /api/auth/login              — 로그인 (tenant_id + user_id + password)
- POST /api/auth/change-password    — 비밀번호 변경
- GET  /api/auth/me                 — 현재 토큰 사용자 정보 (sliding refresh 포함)
- POST /api/auth/logout             — 클라이언트 토큰 삭제 (서버 stateless, 200 만 반환)
- GET  /api/auth/tenants            — 로그인 화면 드롭다운용 (인증 불요)
"""
from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, Response
from pydantic import BaseModel, Field

from server import _auth_local

router = APIRouter(prefix='/api/auth', tags=['auth_local'])


# ── Pydantic 모델 ─────────────────────────────────────
class LoginRequest(BaseModel):
    # 프로토타입은 테넌트 미사용 — 호환을 위해 optional 로만 받고 무시한다.
    tenant_id: str | None = Field(default=None, max_length=64)
    user_id: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=_auth_local.MIN_PASSWORD_LENGTH)


# ── 엔드포인트 ────────────────────────────────────────
@router.get('/tenants')
def get_tenants():
    """로그인 화면의 테넌트 드롭다운용. 인증 불요."""
    return {'items': _auth_local.list_tenants()}


@router.post('/login')
def login(body: LoginRequest):
    """로그인. 성공 시 토큰 + 사용자 + password_change_required 반환."""
    user, password_change_required = _auth_local.authenticate(
        body.user_id, body.password
    )
    token = _auth_local.issue_jwt(user)
    return {
        'success': True,
        'token': token,
        'user': user.model_dump(),
        'password_change_required': password_change_required,
    }


@router.post('/change-password')
def change_password(
    body: ChangePasswordRequest,
    authorization: str | None = Header(default=None),
):
    """비밀번호 변경 (인증 필요)."""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='인증이 필요합니다.')
    token = authorization[7:].strip()
    payload = _auth_local.decode_jwt(token)

    user_id = payload.get('user_id')
    if not user_id:
        raise HTTPException(status_code=401, detail='유효하지 않은 토큰입니다.')

    _auth_local.change_password(user_id, body.current_password, body.new_password)
    return {'success': True, 'message': '비밀번호가 변경되었습니다.'}


@router.get('/me')
def me(
    response: Response,
    authorization: str | None = Header(default=None),
):
    """현재 토큰 사용자 정보 + sliding refresh.

    잔여 시간이 임계치 미만이면 새 토큰을 발급해서 X-New-Token 응답 헤더로 반환.
    클라이언트는 X-New-Token 이 있으면 localStorage 의 auth_token 을 교체.
    """
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='인증이 필요합니다.')
    token = authorization[7:].strip()
    payload = _auth_local.decode_jwt(token)

    # Sliding refresh
    if _auth_local.should_refresh(payload):
        new_token = _auth_local.refresh_jwt(payload)
        response.headers['X-New-Token'] = new_token

    return {
        'user': {
            'user_id': payload.get('user_id'),
            'user_name': payload.get('user_name'),
            'tenant_id': payload.get('tenant_id'),
            'bplc_id': payload.get('bplc_id'),
            'bld_id': payload.get('bld_id'),
            'system_yn': payload.get('system_yn'),
            'tenant_yn': payload.get('tenant_yn'),
            'group_yn': payload.get('group_yn'),
            'bld_yn': payload.get('bld_yn'),
            'is_super_admin': bool(payload.get('is_super_admin', False)),
        },
        'exp': payload.get('exp'),
    }


@router.post('/logout')
def logout():
    """클라이언트 측 토큰 삭제만 — 서버는 stateless 라 별도 처리 없음."""
    return {'success': True}
