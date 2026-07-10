"""자체 인증 모듈 — standalone(프로토타입) 전용. 외부 DB·테넌트·본체 의존 0.

설계 원칙 (절대):
- 최초 프로젝트는 DB 연결 없이 그대로 프로토타입으로 동작해야 한다.
- 기본 계정 admin / admin 으로 즉시 로그인 가능. (env EZ2AI_ADMIN_ID / EZ2AI_ADMIN_PW 로 변경)
- 테넌트 개념 없음(단일 사용자 프로토타입). 외부 DB(co_user/iv_tenant) 쿼리 일체 없음.
- 비밀번호 변경분만 .dev_context/users.json 에 로컬 영속.
- JWT: PyJWT HS256. SECRET 은 env > .dev_context/jwt.key 자동 생성.

실제 업무 DB(CRUD)는 빌더에서 DB 를 등록·컴파일한 뒤 server/_ez2ai_db.py 를 통해 사용한다.
본 인증 모듈은 그와 무관하게 항상 단독 동작한다.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import secrets
import time
from pathlib import Path

import jwt as pyjwt
from fastapi import HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ── 상수 ──────────────────────────────────────────────
MIN_PASSWORD_LENGTH = 4
JWT_ALGORITHM = 'HS256'
TOKEN_HOURS = int(os.environ.get('EZ2AI_JWT_HOURS', '48'))
REFRESH_THRESHOLD_RATIO = 0.75

# 기본 관리자 계정 (env override). DB 없이 즉시 로그인 가능한 프로토타입 계정.
DEFAULT_ADMIN_ID = (os.environ.get('EZ2AI_ADMIN_ID', '').strip() or 'admin')
DEFAULT_ADMIN_PW = (os.environ.get('EZ2AI_ADMIN_PW', '').strip() or 'admin')

_SECRET_FILE = Path('.dev_context') / 'jwt.key'
_USERS_FILE = Path('.dev_context') / 'users.json'


# ── SECRET KEY 로딩 ───────────────────────────────────
def _load_or_create_secret() -> str:
    """env > .dev_context/jwt.key > 자동 생성 후 영구 저장."""
    env_val = os.environ.get('EZ2AI_JWT_SECRET', '').strip()
    if env_val:
        return env_val
    try:
        if _SECRET_FILE.exists():
            val = _SECRET_FILE.read_text(encoding='utf-8').strip()
            if val:
                return val
    except OSError:
        pass
    new_secret = secrets.token_urlsafe(48)
    try:
        _SECRET_FILE.parent.mkdir(parents=True, exist_ok=True)
        _SECRET_FILE.write_text(new_secret, encoding='utf-8')
    except OSError:
        pass
    return new_secret


_SECRET = _load_or_create_secret()


# ── 비밀번호 헬퍼 ──────────────────────────────────────
def hash_password(plain: str) -> str:
    """SHA-256 평문 해시."""
    return hashlib.sha256((plain or '').encode('utf-8')).hexdigest()


def verify_password(plain: str, stored_hash: str) -> bool:
    if not stored_hash:
        return False
    return hash_password(plain) == stored_hash


def validate_new_password(new_plain: str) -> str | None:
    if not new_plain or len(new_plain) < MIN_PASSWORD_LENGTH:
        return f'비밀번호는 최소 {MIN_PASSWORD_LENGTH}자 이상이어야 합니다.'
    return None


# ── 로컬 사용자 저장소 (.dev_context/users.json) ──────
def _load_users() -> dict[str, str]:
    """{user_id: password_hash}. 항상 기본 admin 을 보장."""
    users: dict[str, str] = {}
    try:
        if _USERS_FILE.exists():
            data = json.loads(_USERS_FILE.read_text(encoding='utf-8'))
            if isinstance(data, dict):
                users = {str(k): str(v) for k, v in data.items()}
    except (OSError, ValueError):
        users = {}
    if DEFAULT_ADMIN_ID not in users:
        users[DEFAULT_ADMIN_ID] = hash_password(DEFAULT_ADMIN_PW)
    return users


def _save_users(users: dict[str, str]) -> None:
    try:
        _USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
        _USERS_FILE.write_text(
            json.dumps(users, ensure_ascii=False, indent=2), encoding='utf-8'
        )
    except OSError as exc:
        logger.warning('[auth_local] users.json 저장 실패 (graceful): %s', exc)


# ── 사용자 모델 ─────────────────────────────────────────
class LocalUser(BaseModel):
    """JWT payload + 클라이언트 응답 공통 모델. 프로토타입은 단일 관리자."""
    user_id: str
    user_name: str | None = None
    tenant_id: str | None = None
    bplc_id: str | None = None
    bld_id: str | None = None
    system_yn: str | None = 'Y'
    tenant_yn: str | None = 'N'
    group_yn: str | None = 'N'
    bld_yn: str | None = 'N'
    is_super_admin: bool = True
    email_addr: str | None = None
    role_cl_cd: str | None = None
    post_company_name: str | None = None
    user_img: str | None = None


# ── 테넌트 목록 — 프로토타입은 테넌트 없음 ────────────
def list_tenants() -> list[dict]:
    """테넌트 개념 미사용. 로그인 화면은 테넌트 없이 동작한다."""
    return []


# ── 인증 (login) ───────────────────────────────────────
def authenticate(user_id: str, password: str) -> tuple[LocalUser, bool]:
    """DB 없이 로컬 계정(기본 admin/admin) 인증.

    Returns: (LocalUser, password_change_required). 실패 시 HTTPException.
    """
    uid = (user_id or '').strip()
    if not uid or not password:
        raise HTTPException(status_code=400, detail='사용자ID와 비밀번호를 입력하세요.')

    users = _load_users()
    stored = users.get(uid)
    if stored is None or not verify_password(password, stored):
        raise HTTPException(
            status_code=401, detail='사용자ID 또는 비밀번호가 올바르지 않습니다.'
        )

    user = LocalUser(user_id=uid, user_name=uid, is_super_admin=True, system_yn='Y')
    return user, False


# ── 비밀번호 변경 ──────────────────────────────────────
def change_password(user_id: str, current_password: str, new_password: str) -> None:
    err = validate_new_password(new_password)
    if err:
        raise HTTPException(status_code=400, detail=err)
    if current_password == new_password:
        raise HTTPException(status_code=400, detail='새 비밀번호가 현재 비밀번호와 동일합니다.')

    uid = (user_id or '').strip()
    users = _load_users()
    stored = users.get(uid)
    if stored is None or not verify_password(current_password, stored):
        raise HTTPException(status_code=401, detail='현재 비밀번호가 올바르지 않습니다.')

    users[uid] = hash_password(new_password)
    _save_users(users)


# ── JWT 발급/검증 ──────────────────────────────────────
def issue_jwt(user: LocalUser) -> str:
    now = int(time.time())
    payload = {
        'sub': user.user_id,
        'user_id': user.user_id,
        'user_name': user.user_name,
        'tenant_id': user.tenant_id,
        'bplc_id': user.bplc_id,
        'bld_id': user.bld_id,
        'system_yn': user.system_yn,
        'tenant_yn': user.tenant_yn,
        'group_yn': user.group_yn,
        'bld_yn': user.bld_yn,
        'is_super_admin': user.is_super_admin,
        'iat': now,
        'exp': now + TOKEN_HOURS * 3600,
    }
    return pyjwt.encode(payload, _SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> dict:
    try:
        return pyjwt.decode(token, _SECRET, algorithms=[JWT_ALGORITHM])
    except pyjwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail='토큰이 만료되었습니다.') from exc
    except pyjwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail='유효하지 않은 토큰입니다.') from exc


def should_refresh(payload: dict) -> bool:
    exp = int(payload.get('exp', 0))
    now = int(time.time())
    remaining = exp - now
    threshold = int(TOKEN_HOURS * 3600 * (1 - REFRESH_THRESHOLD_RATIO))
    return remaining > 0 and remaining < threshold


def refresh_jwt(payload: dict) -> str:
    user = LocalUser(
        user_id=payload['user_id'],
        user_name=payload.get('user_name'),
        tenant_id=payload.get('tenant_id'),
        bplc_id=payload.get('bplc_id'),
        bld_id=payload.get('bld_id'),
        system_yn=payload.get('system_yn', 'Y'),
        tenant_yn=payload.get('tenant_yn', 'N'),
        group_yn=payload.get('group_yn', 'N'),
        bld_yn=payload.get('bld_yn', 'N'),
        is_super_admin=bool(payload.get('is_super_admin', True)),
    )
    return issue_jwt(user)


# ── host_auth 호환 (standalone 인증) ───────────────────
def verify_jwt_to_host_user(authorization: str | None):
    """host_auth.verify_with_host 대체 — JWT 만 검증, DB 미접근."""
    if not authorization:
        raise HTTPException(status_code=401, detail='인증 헤더가 없습니다.')
    if not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='인증 헤더 형식 오류 (Bearer 필요)')
    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail='토큰이 비어 있습니다.')

    payload = decode_jwt(token)
    from server.host_auth import HostUser
    return HostUser(
        user_id=payload.get('user_id') or '',
        tenant_id=payload.get('tenant_id'),
        group_id=None,
        role=None,
        is_super_admin=bool(payload.get('is_super_admin', True)),
    )
