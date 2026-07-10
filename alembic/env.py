"""ez2AI Builder 자식 프로젝트 alembic 환경 (자동 생성).

DSN          : server._ez2ai_db.get_database() — 본체 컴파일된 databases.json
target_metadata: ez2ai_document/design/{MENU_CODE}/db_design.json 들로부터 동적 SQLAlchemy MetaData 구성

본 파일은 빌더 본체(folder_initializer)가 갱신합니다. 직접 수정 금지 — 다음 갱신 시 덮어쓰임.
"""
from __future__ import annotations

import json
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import (
    Boolean, Column, DateTime, Float, Integer, MetaData,
    Numeric, String, Table, Text, create_engine, pool,
)

if context.config.config_file_name:
    fileConfig(context.config.config_file_name)

_BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BASE))

# ── DSN 해석 — 본체가 컴파일해준 databases.json ────────────────
try:
    from server._ez2ai_db import get_database  # type: ignore
    _target_name = os.environ.get("EZ2AI_TARGET_DB")
    _db = get_database(_target_name)
    _DSN_SYNC = _db["connection_string_sync"]
    _DEFAULT_SCHEMA = _db.get("schema")
except Exception as exc:  # noqa: BLE001
    raise RuntimeError(
        f"자식 DB 정보 로드 실패: {exc}. 본체 ez2AI 화면에서 프로젝트 DB 를 등록하세요."
    ) from exc

# ── target_metadata — db_design.json 들로부터 동적 구성 ────────
_TYPE_MAP = {
    "integer": Integer, "int": Integer, "bigint": Integer,
    "smallint": Integer, "serial": Integer, "bigserial": Integer,
    "string": String, "varchar": String, "char": String, "nvarchar": String,
    "text": Text, "longtext": Text, "clob": Text,
    "boolean": Boolean, "bool": Boolean,
    "date": DateTime, "datetime": DateTime, "timestamp": DateTime, "time": DateTime,
    "float": Float, "real": Float, "double": Float,
    "numeric": Numeric, "decimal": Numeric, "money": Numeric,
}


def _column_type(col: dict):
    raw = (col.get("type") or "string").lower().strip()
    base = raw.split("(", 1)[0]
    cls = _TYPE_MAP.get(base, String)
    if cls is String and "(" in raw:
        try:
            length = int(raw.split("(", 1)[1].rstrip(")").split(",")[0])
            return String(length)
        except (ValueError, IndexError):
            return String(255)
    if cls is Numeric and "(" in raw:
        try:
            inside = raw.split("(", 1)[1].rstrip(")")
            parts = [p.strip() for p in inside.split(",")]
            if len(parts) == 2:
                return Numeric(int(parts[0]), int(parts[1]))
            return Numeric(int(parts[0]))
        except (ValueError, IndexError):
            return Numeric()
    return cls()


def _build_metadata() -> MetaData:
    md = MetaData(schema=_DEFAULT_SCHEMA)
    seen: set[str] = set()
    # dev_plan/145 — db_design.json 위치: 신규(ez2ai_document/design/{menu}) +
    # 레거시(flat ez2ai_document/{menu}/design, web/src/{menu}) glob. 백업 폴더 제외.
    _design_paths: list = []
    _doc_dir = _BASE / "ez2ai_document"
    if _doc_dir.exists():
        _design_paths += [
            p for p in _doc_dir.glob("design/*/db_design.json")  # 신규 카테고리
            if "_migration_backup_" not in str(p)
        ]
        _design_paths += [
            p for p in _doc_dir.glob("*/design/db_design.json")  # 레거시 flat
            if "_migration_backup_" not in str(p)
        ]
    _src_dir = _BASE / "web" / "src"
    if _src_dir.exists():
        _design_paths += list(_src_dir.rglob("db_design.json"))
    if _design_paths:
        for db_design_path in sorted(_design_paths):
            try:
                payload = json.loads(db_design_path.read_text(encoding="utf-8"))
            except Exception:  # noqa: BLE001
                continue
            for table in payload.get("tables", []) or []:
                tname = (table.get("name") or "").strip()
                if not tname or tname in seen:
                    continue
                seen.add(tname)
                cols = []
                for c in table.get("columns", []) or []:
                    cname = (c.get("name") or "").strip()
                    if not cname:
                        continue
                    is_pk = bool(c.get("primary_key"))
                    cols.append(Column(
                        cname,
                        _column_type(c),
                        primary_key=is_pk,
                        nullable=not (is_pk or bool(c.get("not_null"))),
                    ))
                if cols:
                    Table(tname, md, *cols)
    return md


target_metadata = _build_metadata()


def _include_name(name, type_, parent_names):  # noqa: ANN001
    """autogenerate 가 본체 public 스키마 등을 건드리지 않도록 자식 스키마만 한정."""
    if type_ == "schema":
        return name == _DEFAULT_SCHEMA
    if type_ == "table":
        schema = parent_names.get("schema_name") if isinstance(parent_names, dict) else None
        if _DEFAULT_SCHEMA and schema and schema != _DEFAULT_SCHEMA:
            return False
    return True


def run_migrations_offline() -> None:
    context.configure(
        url=_DSN_SYNC,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=bool(_DEFAULT_SCHEMA),
        include_name=_include_name,
        version_table_schema=_DEFAULT_SCHEMA,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(_DSN_SYNC, poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=bool(_DEFAULT_SCHEMA),
            include_name=_include_name,
            version_table_schema=_DEFAULT_SCHEMA,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
