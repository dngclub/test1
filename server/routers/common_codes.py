"""공통코드관리 API — tsopdev.co_common_code (MariaDB).

| Method | Path                              | 설명                         |
|--------|-----------------------------------|------------------------------|
| GET    | /api/common_codes                 | 목록 조회 (그룹/ID/명 필터)  |
| POST   | /api/common_codes/save            | 다건 등록 + 수정 (upsert)    |
| POST   | /api/common_codes/delete          | 다건 삭제 (그룹+ID 단위)     |

회사 컨벤션: 파일명(common_codes.py) ↔ router prefix(/api/common_codes) 일치.
파일명에는 하이픈 불가 → 본 자식 라우터는 underscore prefix 사용 (frontend 도 동일).
DB 는 빌더 등록 DB(`tsopdev` / MariaDB) 를 _ez2ai_db 헬퍼로 조회 후 pymysql 직접 연결.
"""
from __future__ import annotations

from datetime import date, datetime

import pymysql
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from server._ez2ai_db import get_database
from server.host_auth import HostUser, verify_with_host

router = APIRouter(prefix='/api/common_codes', tags=['common_codes'])


# ── DB 유틸 ──────────────────────────────────────────
def _conn():
    """tsopdev MariaDB pymysql 연결 (빌더 등록 정보 사용).

    이 기능은 건물관리(tsop) 전용이다. tsopdev 가 등록되지 않은 프로젝트에서는 None 을 반환하고,
    조회 엔드포인트는 빈 결과로, 쓰기 엔드포인트는 503 으로 폴백한다(무관 프로젝트에서 500 방지).
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
        autocommit=False,
    )


def _ensure_table(cur) -> None:
    """co_common_code 가 없으면 생성. 기존 운영 스키마와 1:1 동일."""
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS co_common_code (
            common_cd_group       VARCHAR(100) NOT NULL,
            common_cd_id          VARCHAR(100) NOT NULL,
            common_cd             VARCHAR(100) NOT NULL,
            common_cd_name        VARCHAR(100) NULL,
            common_cd_val         VARCHAR(100) NULL,
            common_cd_sort        INT          NULL,
            super_common_cd       VARCHAR(100) NULL,
            super_common_cd_val   VARCHAR(100) NULL,
            use_yn                VARCHAR(20)  DEFAULT 'Y',
            memo                  VARCHAR(100) NULL,
            regist_datetime       DATETIME     NULL,
            register_id           VARCHAR(15)  NULL,
            audit_datetime        DATETIME     NULL,
            audit_id              VARCHAR(15)  NULL,
            PRIMARY KEY (common_cd_group, common_cd_id, common_cd)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """
    )


def _fmt_dt(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def _row_to_dto(r: dict) -> dict:
    """DB row → API 응답 dict (snake_case 그대로 유지)."""
    return {
        'common_cd_group': r['common_cd_group'],
        'common_cd_id': r['common_cd_id'],
        'common_cd': r['common_cd'],
        'common_cd_name': r.get('common_cd_name'),
        'common_cd_val': r.get('common_cd_val'),
        'common_cd_sort': r.get('common_cd_sort'),
        'super_common_cd': r.get('super_common_cd'),
        'super_common_cd_val': r.get('super_common_cd_val'),
        'use_yn': r.get('use_yn') or 'Y',
        'memo': r.get('memo'),
        'regist_datetime': _fmt_dt(r.get('regist_datetime')),
        'register_id': r.get('register_id'),
        'audit_datetime': _fmt_dt(r.get('audit_datetime')),
        'audit_id': r.get('audit_id'),
    }


# ── Pydantic 모델 ─────────────────────────────────────
class CommonCodeIn(BaseModel):
    common_cd_group: str = Field(..., min_length=1, max_length=100)
    common_cd_id: str = Field(..., min_length=1, max_length=100)
    common_cd: str = Field(..., min_length=1, max_length=100)
    common_cd_name: str | None = Field(default=None, max_length=100)
    common_cd_val: str | None = Field(default=None, max_length=100)
    common_cd_sort: int | None = None
    super_common_cd: str | None = Field(default=None, max_length=100)
    super_common_cd_val: str | None = Field(default=None, max_length=100)
    use_yn: str | None = Field(default='Y', max_length=20)
    memo: str | None = Field(default=None, max_length=100)


class SaveRequest(BaseModel):
    items: list[CommonCodeIn]


class DeleteTarget(BaseModel):
    """삭제 대상 — 그룹+ID 또는 그룹+ID+CD 단위로 지정 가능."""
    common_cd_group: str
    common_cd_id: str
    common_cd: str | None = None


class DeleteRequest(BaseModel):
    codes: list[DeleteTarget]


# ── 엔드포인트 ────────────────────────────────────────
@router.get('')
def list_common_codes(
    common_cd_group: str | None = Query(default=None),
    common_cd_id: str | None = Query(default=None),
    common_cd_name: str | None = Query(default=None),
    user: HostUser = Depends(verify_with_host),  # noqa: ARG001 (인증 강제)
):
    """공통코드 목록 조회.

    - common_cd_group: 정확히 일치 (드롭다운 선택값)
    - common_cd_id / common_cd_name: LIKE 부분일치
    """
    conn = _conn()
    if conn is None:
        return {'items': [], 'total': 0}  # 공통코드 DB(tsopdev) 미등록 — 빈 결과 폴백.
    try:
        with conn.cursor() as cur:
            _ensure_table(cur)
            conn.commit()

            where: list[str] = []
            params: list = []

            if common_cd_group and common_cd_group.strip():
                where.append('common_cd_group = %s')
                params.append(common_cd_group.strip())
            if common_cd_id and common_cd_id.strip():
                where.append('common_cd_id LIKE %s')
                params.append(f"%{common_cd_id.strip()}%")
            if common_cd_name and common_cd_name.strip():
                where.append('common_cd_name LIKE %s')
                params.append(f"%{common_cd_name.strip()}%")

            sql = 'SELECT * FROM co_common_code'
            if where:
                sql += ' WHERE ' + ' AND '.join(where)
            sql += (
                ' ORDER BY common_cd_group, common_cd_id,'
                ' COALESCE(common_cd_sort, 99999), common_cd'
            )
            cur.execute(sql, params)
            rows = cur.fetchall()
        return {'items': [_row_to_dto(r) for r in rows], 'total': len(rows)}
    finally:
        conn.close()


@router.get('/groups')
def list_groups(user: HostUser = Depends(verify_with_host)):  # noqa: ARG001
    """공통코드그룹 드롭다운용 — distinct group 목록."""
    conn = _conn()
    if conn is None:
        return {'groups': []}  # 공통코드 DB(tsopdev) 미등록 — 빈 결과 폴백.
    try:
        with conn.cursor() as cur:
            _ensure_table(cur)
            conn.commit()
            cur.execute(
                'SELECT DISTINCT common_cd_group FROM co_common_code'
                ' ORDER BY common_cd_group'
            )
            rows = cur.fetchall()
        groups = [r['common_cd_group'] for r in rows if r.get('common_cd_group')]
        return {'groups': groups}
    finally:
        conn.close()


@router.get('/all')
def list_all_grouped(user: HostUser = Depends(verify_with_host)):  # noqa: ARG001
    """전체 공통코드 일괄 조회 (use_yn='Y' 만) — 프론트 CommonCodesContext 캐싱용.

    CHAT.md Q14=B 권장안:
    - 앱 시작 시 1 회 호출 → React Context 에 저장 → 모든 페이지가 useCommonCodes() 로 꺼냄.

    반환 구조:
    {
      "by_id": {
        "{common_cd_group}.{common_cd_id}": [
          { common_cd, common_cd_name, common_cd_val, common_cd_sort, super_common_cd, ... },
          ...
        ],
        ...
      },
      "total": 1234
    }
    """
    conn = _conn()
    if conn is None:
        return {'by_id': {}, 'total': 0}  # 공통코드 DB(tsopdev) 미등록 — 빈 결과 폴백.
    try:
        with conn.cursor() as cur:
            _ensure_table(cur)
            conn.commit()
            cur.execute(
                "SELECT common_cd_group, common_cd_id, common_cd, common_cd_name, common_cd_val, "
                "       common_cd_sort, super_common_cd, super_common_cd_val, use_yn, memo "
                "FROM co_common_code "
                "WHERE COALESCE(use_yn,'Y')='Y' "
                "ORDER BY common_cd_group, common_cd_id, COALESCE(common_cd_sort,99999), common_cd"
            )
            rows = cur.fetchall()
        by_id: dict[str, list[dict]] = {}
        for r in rows:
            key = f"{r['common_cd_group']}.{r['common_cd_id']}"
            by_id.setdefault(key, []).append({
                'common_cd': r['common_cd'],
                'common_cd_name': r.get('common_cd_name'),
                'common_cd_val': r.get('common_cd_val'),
                'common_cd_sort': r.get('common_cd_sort'),
                'super_common_cd': r.get('super_common_cd'),
                'super_common_cd_val': r.get('super_common_cd_val'),
                'memo': r.get('memo'),
            })
        return {'by_id': by_id, 'total': len(rows)}
    finally:
        conn.close()


@router.post('/save')
def save_common_codes(
    body: SaveRequest,
    user: HostUser = Depends(verify_with_host),
):
    """공통코드 다건 upsert.

    - PK (group, id, cd) 가 동일하면 UPDATE, 신규면 INSERT.
    - regist_datetime / register_id 는 신규 등록 시에만 채워지고,
      audit_datetime / audit_id 는 매 호출마다 갱신.
    """
    if not body.items:
        raise HTTPException(status_code=400, detail='저장할 데이터가 없습니다.')

    # 필수값 검증
    for idx, item in enumerate(body.items):
        if not item.common_cd_group.strip():
            raise HTTPException(status_code=400, detail=f'[{idx + 1}행] 공통코드그룹은 필수입니다.')
        if not item.common_cd_id.strip():
            raise HTTPException(status_code=400, detail=f'[{idx + 1}행] 공통코드ID는 필수입니다.')
        if not item.common_cd.strip():
            raise HTTPException(status_code=400, detail=f'[{idx + 1}행] 공통코드는 필수입니다.')

    user_id = user.user_id
    now = datetime.now()
    inserted = 0
    updated = 0

    conn = _conn()
    if conn is None:
        raise HTTPException(
            status_code=503,
            detail='이 프로젝트에는 공통코드 DB(tsopdev)가 등록되지 않았습니다.',
        )
    try:
        with conn.cursor() as cur:
            _ensure_table(cur)
            for item in body.items:
                # 존재 여부 + owner 동시 확인 (78 차 08 권한 가드).
                # UI 가드는 1차 방어용이며, 본 분기가 단일 SSOT 권한 결정자.
                cur.execute(
                    'SELECT register_id FROM co_common_code WHERE'
                    ' common_cd_group=%s AND common_cd_id=%s AND common_cd=%s',
                    (item.common_cd_group, item.common_cd_id, item.common_cd),
                )
                existing = cur.fetchone()
                exists = existing is not None
                if exists and not user.is_super_admin:
                    owner = existing.get('register_id')
                    if owner and owner != user_id:
                        raise HTTPException(
                            status_code=403,
                            detail=(
                                f'[{item.common_cd_group}/{item.common_cd_id}/{item.common_cd}] '
                                '본인이 등록한 공통코드만 수정할 수 있습니다.'
                            ),
                        )

                if exists:
                    cur.execute(
                        """
                        UPDATE co_common_code SET
                            common_cd_name = %s,
                            common_cd_val = %s,
                            common_cd_sort = %s,
                            super_common_cd = %s,
                            super_common_cd_val = %s,
                            use_yn = %s,
                            memo = %s,
                            audit_datetime = %s,
                            audit_id = %s
                        WHERE common_cd_group=%s AND common_cd_id=%s AND common_cd=%s
                        """,
                        (
                            item.common_cd_name,
                            item.common_cd_val,
                            item.common_cd_sort,
                            item.super_common_cd,
                            item.super_common_cd_val,
                            (item.use_yn or 'Y').strip() or 'Y',
                            item.memo,
                            now,
                            user_id,
                            item.common_cd_group,
                            item.common_cd_id,
                            item.common_cd,
                        ),
                    )
                    updated += 1
                else:
                    cur.execute(
                        """
                        INSERT INTO co_common_code (
                            common_cd_group, common_cd_id, common_cd,
                            common_cd_name, common_cd_val, common_cd_sort,
                            super_common_cd, super_common_cd_val,
                            use_yn, memo,
                            regist_datetime, register_id,
                            audit_datetime, audit_id
                        ) VALUES (
                            %s, %s, %s,
                            %s, %s, %s,
                            %s, %s,
                            %s, %s,
                            %s, %s,
                            %s, %s
                        )
                        """,
                        (
                            item.common_cd_group,
                            item.common_cd_id,
                            item.common_cd,
                            item.common_cd_name,
                            item.common_cd_val,
                            item.common_cd_sort,
                            item.super_common_cd,
                            item.super_common_cd_val,
                            (item.use_yn or 'Y').strip() or 'Y',
                            item.memo,
                            now,
                            user_id,
                            now,
                            user_id,
                        ),
                    )
                    inserted += 1
        conn.commit()
        return {
            'success': True,
            'inserted': inserted,
            'updated': updated,
            'message': f'{inserted}건 등록, {updated}건 수정되었습니다.',
        }
    except pymysql.MySQLError as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f'저장 실패: {exc}') from exc
    finally:
        conn.close()


@router.post('/delete')
def delete_common_codes(
    body: DeleteRequest,
    user: HostUser = Depends(verify_with_host),
):
    """공통코드 다건 삭제.

    - 각 target 에 common_cd 가 있으면 행 단위 삭제,
      없으면 (group, id) 에 매칭되는 모든 행 삭제.

    권한 (78 차 08): 본인이 등록한 행 또는 super admin 만 삭제 가능.
    한 건이라도 권한 없으면 전체 트랜잭션 롤백.
    """
    if not body.codes:
        raise HTTPException(status_code=400, detail='삭제할 항목을 선택해주세요.')

    total = 0
    conn = _conn()
    if conn is None:
        raise HTTPException(
            status_code=503,
            detail='이 프로젝트에는 공통코드 DB(tsopdev)가 등록되지 않았습니다.',
        )
    try:
        with conn.cursor() as cur:
            # 1) 권한 사전 검증 (모든 대상 행) — 한 건이라도 거부면 즉시 403.
            if not user.is_super_admin:
                for tgt in body.codes:
                    if tgt.common_cd:
                        cur.execute(
                            'SELECT register_id FROM co_common_code WHERE'
                            ' common_cd_group=%s AND common_cd_id=%s AND common_cd=%s',
                            (tgt.common_cd_group, tgt.common_cd_id, tgt.common_cd),
                        )
                    else:
                        cur.execute(
                            'SELECT register_id FROM co_common_code WHERE'
                            ' common_cd_group=%s AND common_cd_id=%s',
                            (tgt.common_cd_group, tgt.common_cd_id),
                        )
                    rows = cur.fetchall()
                    for row in rows:
                        owner = row.get('register_id')
                        if owner and owner != user.user_id:
                            raise HTTPException(
                                status_code=403,
                                detail=(
                                    f'[{tgt.common_cd_group}/{tgt.common_cd_id}'
                                    f'{"/" + tgt.common_cd if tgt.common_cd else ""}] '
                                    '본인이 등록한 공통코드만 삭제할 수 있습니다.'
                                ),
                            )

            # 2) 실제 삭제
            for tgt in body.codes:
                if tgt.common_cd:
                    cur.execute(
                        'DELETE FROM co_common_code WHERE'
                        ' common_cd_group=%s AND common_cd_id=%s AND common_cd=%s',
                        (tgt.common_cd_group, tgt.common_cd_id, tgt.common_cd),
                    )
                else:
                    cur.execute(
                        'DELETE FROM co_common_code WHERE'
                        ' common_cd_group=%s AND common_cd_id=%s',
                        (tgt.common_cd_group, tgt.common_cd_id),
                    )
                total += cur.rowcount
        conn.commit()
        return {'success': True, 'deleted': total, 'message': f'{total}건이 삭제되었습니다.'}
    finally:
        conn.close()
