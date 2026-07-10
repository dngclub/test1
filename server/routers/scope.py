"""범위(Scope) 선택기 API — tenant / bplc(권역) / bld(빌딩) 3 단계 옵션 조회.

| Method | Path                  | 설명                                         |
|--------|-----------------------|----------------------------------------------|
| GET    | /api/scope/options    | tenant·bplc·bld 옵션 목록 (필터 cascading)   |

설계
- CHAT.md Q3=B (자식 SPA 가 자체 selector 구축)
- CHAT.md Q4=A + 실DB 확인: bplc_id = 권역 (iv_building_group)
- CHAT.md Q5=B (자식 backend 가 iv_tenant / iv_building_group / iv_building 직접 조회)
- CHAT.md Q13 = "본체 테넌트와 무관하게 독립적으로 동작"
  → 본체 사용자가 어떤 tenant 든 상관없이, 자식 selector 가 보유한
    tenant 목록을 모두 노출. (후속: 본체↔자식 tenant 매핑)
"""
from __future__ import annotations

import pymysql
from fastapi import APIRouter, Depends, Query

from server._ez2ai_db import get_database
from server.host_auth import HostUser, verify_with_host

router = APIRouter(prefix='/api/scope', tags=['scope'])


def _conn():
    """tsopdev MariaDB 연결 (빌더 등록 정보 사용).

    이 기능은 건물관리(tsop) 전용이다. tsopdev 가 등록되지 않은 프로젝트에서는 None 을 반환하고,
    조회 엔드포인트는 빈 결과로 폴백한다(무관 프로젝트에서 500 방지).
    """
    try:
        db = get_database('tsopdev')
    except (KeyError, RuntimeError):
        return None
    return pymysql.connect(
        host=db['host'],
        port=int(db['port']),
        user=db['user'],
        password=db['password'],
        database=db['db_name'],
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
    )


@router.get('/options')
def get_options(
    tenant_id: str | None = Query(default=None, description='선택된 테넌트 — 지정 시 그 하위 권역·빌딩만 반환'),
    bplc_id: str | None = Query(default=None, description='선택된 권역 — 지정 시 그 하위 빌딩만 반환'),
    user: HostUser = Depends(verify_with_host),  # noqa: ARG001 — 인증 강제
):
    """범위 선택기 옵션 조회 (cascading).

    반환:
    - tenants: 전체 테넌트 목록 (use_yn='Y')
    - bplcs:   tenant_id 필터 적용된 권역 목록
    - bldgs:   tenant_id + bplc_id 필터 적용된 빌딩 목록
    """
    conn = _conn()
    if conn is None:
        return {'tenants': [], 'bplcs': [], 'bldgs': []}  # 범위 DB(tsopdev) 미등록 — 빈 결과 폴백.
    try:
        with conn.cursor() as cur:
            # 1) 전체 테넌트
            cur.execute(
                "SELECT tenant_id, tenant_name, company_cd "
                "FROM iv_tenant "
                "WHERE COALESCE(use_yn,'Y')='Y' "
                "ORDER BY tenant_name"
            )
            tenants = cur.fetchall()

            # 2) 권역 (tenant_id 필터)
            bplcs = []
            if tenant_id and tenant_id.strip():
                cur.execute(
                    "SELECT bplc_id, bplc_name, tenant_id "
                    "FROM iv_building_group "
                    "WHERE tenant_id=%s AND COALESCE(use_yn,'Y')='Y' "
                    "ORDER BY COALESCE(sorder,99999), bplc_name",
                    (tenant_id.strip(),),
                )
                bplcs = cur.fetchall()

            # 3) 빌딩 (tenant_id + bplc_id 필터)
            bldgs = []
            if tenant_id and tenant_id.strip():
                where = ["tenant_id=%s", "COALESCE(use_yn,'Y')='Y'"]
                params = [tenant_id.strip()]
                if bplc_id and bplc_id.strip():
                    where.append("bplc_id=%s")
                    params.append(bplc_id.strip())
                cur.execute(
                    f"SELECT bld_id, bld_name, bld_abbr_name, bplc_id, tenant_id "
                    f"FROM iv_building "
                    f"WHERE {' AND '.join(where)} "
                    f"ORDER BY COALESCE(sorder,99999), bld_name",
                    params,
                )
                bldgs = cur.fetchall()

        return {
            'tenants': tenants,
            'bplcs': bplcs,
            'bldgs': bldgs,
        }
    finally:
        conn.close()
