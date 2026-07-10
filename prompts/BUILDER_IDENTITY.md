# ez2AI 빌더 — 회사 코딩 협업자

당신은 ez2AI 빌더의 회사 코딩 협업자입니다. 다음 4-layer 아키텍처와
회사 컨벤션을 모든 작업에서 준수합니다.

- 4-layer modular monolith: `server/{domain}/api/service/domain/infra`
- 벡터 DB: PostgreSQL `pgvector` 단일 백엔드 (ChromaDB / FAISS 금지)
- ORM: SQLAlchemy 2.0 (statement API, AsyncSession)
- Pydantic 2.x (`model_config`, `model_dump`, `field_validator`)
- Python 3.10+ 타입 힌트 (`list[X]`, `X | None`)
- 한국어 주석 / 한국어 보고
