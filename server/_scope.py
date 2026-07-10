"""범위(Scope) 필터 의존성 — 자식 SPA 가 보낸 X-Tenant-Id / X-Bplc-Id / X-Bld-Id
헤더를 추출해서 SQL WHERE 절에 자동 적용하기 위한 헬퍼.

설계 (CHAT.md 2026-05-19)
- 자식 selector (ScopeContext) 가 선택한 값을 axios 인터셉터로 모든 요청에 주입.
- 본 모듈은 그 헤더를 FastAPI Depends 로 받아서 Pydantic-like dict 로 반환.
- 라우터는 scope.tenant_id / scope.bplc_id / scope.bld_id 가 None 인지 검사하여
  WHERE 절에 추가.

권한 정책 (CHAT.md Q8 = "추후 공통 모듈")
- 현재는 사용자가 보낸 값을 그대로 신뢰. 누구나 어떤 tenant/bplc/bld 든 선택 가능.
- 권한관리 단계에서 user 가 접근 가능한 scope 만 허용하도록 검증 추가 예정.
"""
from __future__ import annotations

from fastapi import Header
from pydantic import BaseModel


class ScopeFilter(BaseModel):
    """X-Tenant-Id / X-Bplc-Id / X-Bld-Id 헤더 추출 결과.

    값이 빈 문자열이면 None 으로 정규화 (라우터에서 if 검사 간소화).
    """
    tenant_id: str | None = None
    bplc_id: str | None = None
    bld_id: str | None = None

    def where_clauses(self, alias: str = '') -> tuple[list[str], list]:
        """WHERE 절 fragment + 파라미터 리스트 생성.

        alias='' 면 'tenant_id = %s', alias='a' 면 'a.tenant_id = %s'.
        scope 값이 None 인 컬럼은 절에 포함 안 됨.
        """
        prefix = (alias + '.') if alias else ''
        where: list[str] = []
        params: list = []
        if self.tenant_id:
            where.append(f'{prefix}tenant_id = %s')
            params.append(self.tenant_id)
        if self.bplc_id:
            where.append(f'{prefix}bplc_id = %s')
            params.append(self.bplc_id)
        if self.bld_id:
            where.append(f'{prefix}bld_id = %s')
            params.append(self.bld_id)
        return where, params


def get_scope(
    x_tenant_id: str | None = Header(default=None, alias='X-Tenant-Id'),
    x_bplc_id: str | None = Header(default=None, alias='X-Bplc-Id'),
    x_bld_id: str | None = Header(default=None, alias='X-Bld-Id'),
) -> ScopeFilter:
    """FastAPI Depends 진입점.

    사용 예 (라우터):
        @router.get('/list')
        def list_items(scope: ScopeFilter = Depends(get_scope), user = Depends(verify_with_host)):
            where, params = scope.where_clauses()
            sql = 'SELECT * FROM wk_xxx'
            if where:
                sql += ' WHERE ' + ' AND '.join(where)
            cur.execute(sql, params)
            ...
    """
    def _norm(v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s if s else None
    return ScopeFilter(
        tenant_id=_norm(x_tenant_id),
        bplc_id=_norm(x_bplc_id),
        bld_id=_norm(x_bld_id),
    )
