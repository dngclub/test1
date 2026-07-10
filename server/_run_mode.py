"""실행 모드 헬퍼 — embedded(본체 연결) vs standalone(독립 실행).

환경변수 우선순위:
1. RUN_MODE         (사용자가 .env 에 명시한 기본 변수)
2. EZ2AI_RUN_MODE   (빌더가 주입한 변수)
3. 'embedded'       (기본값)

CHAT.md 2026-05-20 — Standalone 모드 신설:
- embedded: 본체 ez2ai_server (8000) 가 떠있고, 자식이 그 안에 iframe 으로 동작
- standalone: 본체 없이 자식 backend 가 자체 JWT + co_user 직접 인증
"""
from __future__ import annotations

import os
from typing import Literal


def get_run_mode() -> Literal['embedded', 'standalone']:
    """현재 실행 모드 반환. 알 수 없는 값이면 'embedded'."""
    raw = (os.environ.get('RUN_MODE')
           or os.environ.get('EZ2AI_RUN_MODE')
           or 'embedded').strip().lower()
    return 'standalone' if raw == 'standalone' else 'embedded'


def is_standalone() -> bool:
    """standalone 모드 여부."""
    return get_run_mode() == 'standalone'


def is_embedded() -> bool:
    """embedded 모드 여부 (기본)."""
    return get_run_mode() == 'embedded'
