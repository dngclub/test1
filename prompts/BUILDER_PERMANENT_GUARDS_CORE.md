# ⚠ 영구 작업 규칙 — 매 step 시작 전 반드시 확인

> 본 블록은 오케스트라가 자동 주입합니다. 사용자가 매번 전달하지 않아도 항상 적용됩니다.

## ⭐ 0. DB · CRUD · 인증 필수 절차 (데이터가 필요한 작업이면 절대 생략 금지)

### 0.1 DB 연결 — 접속정보를 직접 찾거나 하드코딩하지 말 것
- DB 접속은 **반드시** `from server._ez2ai_db import get_psycopg2_conn, get_database` 사용:
  ```python
  from server._ez2ai_db import get_psycopg2_conn, get_database
  conn = get_psycopg2_conn()                       # 등록 DB 가 1개일 때 (자동 복호화)
  db = get_database('<명세서가 지정한 connection 이름>')  # 등록 DB 가 여러 개면 이름으로 선택
  ```
- **DB 가 여러 개면 "첫 DB" 를 가정하지 말 것.** 아래 §0.2 의 **[DB 작업 명세서]** 가 각 테이블의 connection 을 지정한다 — 그 connection 을 `get_database(name)` 으로 골라 사용한다(다른 DB 오연결 금지).
- 비밀번호·host·포트 코드 하드코딩 금지. `psycopg2.connect(dbname='ez2ai.simbizlocal', ...)` 직접 호출 금지(§B.0).
- 등록된 DB 가 없으면 임의로 진행하지 말고 **"개발 환경설정 > 데이터베이스에서 DB 를 먼저 등록/연결하세요"** 라고 보고한다.

### 0.2 테이블/컬럼 — [DB 작업 명세서] 의 처방을 그대로 따른다 (환각·임의생성 금지)
데이터 작업 전, 주입된 **[DB 작업 명세서]**(현재 설정된 DB 와 설계를 대조한 표)를 **먼저 확인**한다.
각 테이블은 명세서가 지정한 **connection / schema** 에서, 지정된 **처방** 대로만 작업한다:
- **REUSE(존재)**: 명세서의 실제 컬럼을 **그대로** 사용. **컬럼명 변경·임의 컬럼 추가 금지.**
- **CREATE(없음)**: 명세서의 설계 컬럼으로 그 schema 에 `CREATE TABLE IF NOT EXISTS {schema}.{table} ( ... )`.
- **ALTER(불일치)**: 명세서가 표시한 **누락 컬럼만** `ADD COLUMN IF NOT EXISTS` (기존 컬럼 변경 금지).
- **QUERY(sql)**: 기존 테이블을 **조회**한다 — 신규 테이블 생성 금지.
- **명세서에 없는 테이블을 임의로 만들거나, 명세서가 지정하지 않은 다른 DB/스키마에 만들지 말 것.**
대상 **schema 는 명세서가 테이블별로 지정한 schema** 를 사용한다(임의의 다른 schema 로 추측·변경 금지). 명세서가 비어있거나 불명확하면 직접 `information_schema.tables`/`.columns` 로 존재를 확인한 뒤 use-or-create 한다(이때도 추측한 schema 로 하드코딩하지 말 것 — 등록된 connection 의 실제 schema 기준).
- `db_design.json` 은 설계 기준(참고)이며, 구조 개선이 필요하면 §0.7 절차(보고→승인).
  테이블이 비어 있는 **조회/SQL 위주 메뉴**라면 억지로 새 테이블을 만들지 말고 **기존(다른 메뉴에 이미 설계된) 테이블을 재사용**한다(§0.7).

### 0.3 CRUD 4종 누락 금지
데이터 화면은 백엔드 라우터에 **목록(검색·페이징) / 생성 / 수정 / 삭제** 를 **모두** 구현한다.
각 핸들러: `conn.commit()` / 예외 시 `rollback()` / `finally` 에서 `close()`. 일부만 만들고 끝내지 말 것.
(완전한 CRUD 라우터 골격은 SHARED_GUIDE 의 "simbizlocal 스키마 테이블 생성/ CRUD 패턴" 참조)

### 0.4 인증 / 로그인 / 사용자 — "외부 프로젝트는 로그인부터"
- **기본값**: 사용자가 인증을 설계하지 않으면 `server/_auth_local.py` 의 **admin / admin (DB 불요) 프로토타입** 인증을 그대로 둔다.
- **사용자가 회원/로그인/권한을 요구하면**: `server/_auth_local.py`, `server/routers/auth_local.py`, 로그인 화면(`web/src/M000000000/standalone/StandaloneLoginPage.tsx`) 을 **발전**시켜 `users`(설계된) 테이블 기반 실제 인증을 구현한다 — 0.1~0.3 절차(연결·use-or-create·CRUD) 동일 적용.
- standalone 모드 인증은 `_auth_local` 의 **JWT 자체검증**을 사용한다. §B.1.1 의 `verify_with_host` / `import jwt 금지` 는 **embedded 전용**이며 standalone 인증 개발에는 적용하지 않는다.
- 단, 토큰 플러밍 `main.tsx` / `AuthProvider.tsx` / `ProtectedRoute.tsx` 는 수정 금지(§B 가드 유지).

## ⭐ 0.5 디자인 필수 절차 (화면/UI 작업이면 절대 생략 금지)

**임의로 CSS 를 작성하거나 화면을 마음대로 만들지 말 것.** 코딩 전 반드시 아래를 수행한다:

1. **디자인 가이드 Read**: `ez2ai_document/common_design/DESIGN_GUIDE.md` 를 **반드시 Read** 하여 레이아웃·색·간격·컴포넌트 규칙을 파악한다.
2. **레거시/첨부 이미지 열람**: 해당 메뉴의 `ez2ai_document/attachments/{MENU_CODE}/images/*.png`(레거시 화면 캡처)와 사용자가 첨부한 이미지를 **반드시 열람**(비전)하여 동일한 화면 구성으로 만든다. "이미지 없음/안 봄" 으로 임의 진행 금지.
3. **공통 디자인 시스템 사용**: `ez2ai_document/common_design/core.css` 를 **import** 하고, 공통 클래스(`eg-*` / `xx-*` 등 가이드의 클래스)를 사용한다. **자체 클래스/인라인 스타일로 새로 만들지 말 것.**
4. 공통 컴포넌트·샘플(`common_design/components/`, `common_design/samples/*.html`)을 참고해 동일 패턴으로 작성한다.

> ⚠ 자주 발생하는 결함: CSS import 누락 → 스타일 전혀 없는 화면 / 공통 클래스 미사용 → 레거시 캡처와 전혀 다른 디자인. 코딩 전 1~3 을 반드시 거친다.

## ⭐ 0.6 컨텍스트 관리 (토큰 절약 — 사용률 % 기준)

컨텍스트는 유한하다(모델/서버마다 한도 다름 — **도구가 표시하는 사용률 % 로 판단**한다. 한도 토큰 수를 가정하지 말 것).

**[효율] 불필요한 컨텍스트 소모 방지**
- 작업에 필요한 파일만 **타겟해서** 읽는다. 전체 디렉토리 일괄 읽기·광범위 grep 자제.
- 큰 파일은 필요한 부분만(offset/limit). 전체 덤프 금지.
- 추측성 탐색 전에 **제공된 인덱스(KIC · design_index · menu.json · db_design.json)** 를 먼저 활용한다.
- 불필요하게 긴 출력 자제. 핵심만.

**[정리] 사용률 80% 도달 시**
- ① 진행 상태를 산출물 md(`ez2ai_document/outputs/{메뉴코드}/{순번}_B_*.md`)로 **먼저 저장** →
  ② 사용자에게 **"컨텍스트를 압축(/compress·/compact)할까요?"** 제안 → ③ **승인 시** 압축한다.
- **무단 `/clear`(전체 삭제) 금지** — 맥락 손실. 압축을 우선하고, 산출물 저장으로 작업 연속성을 보장한다.

## ⭐ 0.7 설계 = 참고용 (개선은 "개발계획 보고 → 승인 → 반영")

제공된 설계(menu.json·db_design.json·DB_PLAN.md·API/컴포넌트/테스트 설계 등)는 **개발의 출발점이자 참고 기준**이다.
완벽하지 않을 수 있으므로, 더 나은 구조·테이블·필드·플로우가 보이면 **적극적으로 개선을 제안**한다.

**단, 설계를 마음대로 바꾸지 않는다. 설계 변경(테이블 추가/수정, 관계 변경, 화면·API 구조 변경, 리비전 변경 등)이 필요하면:**

1. **개발 계획(무엇을·왜·어떻게 바꿀지 + 영향 범위)을 md 로 작성해 사용자에게 먼저 보고**한다.
2. **사용자가 승인하면** 빌더가 제공하는 **설계 기능/설계 변경 도구로** 설계를 갱신(자동 리비전)하고 그에 맞춰 구현한다.
   **설계 파일(`*.json`)을 직접 텍스트 편집하지 않는다** — 구조화 경로로만 변경(스키마 손상 방지).
3. 승인 전에는 기존 설계대로 진행하거나 대기한다. **무단 설계 변경·무단 리비전 변경·직접 파일 편집 금지.**
   (설계 참고: `ez2ai_document/design/{메뉴코드}/` — 읽기 전용. 이전 버전은 각 설계 메뉴에서 검색.)

**DB 설계 변경 시 (테이블/컬럼/관계 변경):**
`db_design.json` 등 설계 파일을 직접 편집하지 않는다. 변경이 필요하면 소스 코드로 구현하고,
**무엇을·왜·어떻게 바꿨는지(추가/수정한 테이블·컬럼·API·화면)를 완료보고서(REPORT)에 구체적으로 기록**한다.
별도의 설계변경 문서를 따로 만들지 않는다 — 완료보고서가 변경 이력을 담당한다.
역설계(소스 기반) 실행 시 소스 코드와 완료보고서를 종합하여 메뉴/DB 설계가 자동 갱신되므로,
설계 파일을 손대지 말고 구현 + 완료보고서 기록에 집중한다.

**테이블이 없는 조회/SQL 위주 메뉴** (db_design 에 테이블 0개): 억지로 새 테이블을 만들지 말고
**다른 메뉴에 이미 설계된 기존 테이블을 재사용**한다. 새 테이블이 정말 필요하면 위 1)~2) 절차로 보고·승인 후 추가한다.
> 예: "견적진행현황"(조회) 은 "견적요청" 이 만든 견적 테이블을 **조회**한다 — 같은 의미의 견적 테이블을 새로 만들지 말 것.

## A. 서버 시작·재시작·로그 확인은 사용자 담당 — 코딩 도구 직접 실행 금지

- **스택 불문**(`uvicorn` / `npm run dev` / `start /B` / `b.*` 등)으로 자식 backend·frontend 를 **직접 띄우거나 죽이지 않는다.** `netstat` 포트 점유 검사 / `taskkill` PID 종료도 하지 않는다. (사용자가 b.bat 으로 운영 중인 프로세스와 포트 충돌·중복 기동을 유발함.)
- 코드 변경 후 동작 확인이 필요하면 **사용자에게 1줄로 재시작·로그 확인을 요청**하고, 사용자가 붙여준 콘솔 / `.dev_context/logs/dev.log` 출력으로 진단한다.
- 코딩 도구가 스스로 하는 검증은 **정적 검증(문법 / import / 컴파일)까지**다.
- **정적 검증을 "환경 탓"으로 생략하지 않는다.** `node_modules` 미설치 등으로 빌드/타입체크를 못 돌려도, 백엔드만 `py_compile` 하고 **프런트를 건너뛰지 말 것** — 작성·수정한 **모든 파일을 처음부터 끝까지 다시 정독**하여 문법을 스스로 검증한다.
- **자기 유발 문법 오류 자가 점검 (특히 프런트 TSX/CSS)**: ⑴ 블록 주석 `/* … */` 안에 `*/` 시퀀스를 넣으면 주석이 **조기 종료**되어 esbuild `Unexpected "*"` 파싱 오류가 난다 — 주석·배너·문자열에 `*/` 를 쓰지 말 것(필요 시 `eg-…/xx-…` 처럼 분리 표기). ⑵ 미종결 문자열·백틱 템플릿 리터럴, 짝 안 맞는 `{ } ( ) [ ]` 도 저장 전 확인한다.
- 기존 로그 file(`.dev_context/logs/dev.log`) **읽기**는 허용(read-only 진단). 로그가 `0 bytes` 면 새로 띄우지 말고 "사용자가 띄운 backend 출력을 콘솔에서 붙여넣어 달라" 고 요청한다.

## B. 절대 수정 금지 파일 (가드레일)

- `web/src/main.tsx`
- `web/src/M000000000/auth/AuthProvider.tsx`
- `web/src/M000000000/auth/ProtectedRoute.tsx`
- `web/src/App.tsx` — **본체 patch 대상**. `MenuPage` 가 `import.meta.glob('../../M*/*.tsx')` 로 메뉴 폴더를 자동 디스커버리 → 라우트/사이드바 자동 노출. 신규 메뉴는 `web/src/M0000000XX/{Domain}Page.tsx` 폴더 하나만 만들면 됨. App.tsx 에 `<Route>` 직접 추가 절대 금지.
- `web/package.json` / `web/package-lock.json` — 본체 자식 template 이 force_write. 의존성 누락은 본체에 보고 (`exceljs` 등 표준 의존성은 이미 포함됨). 자체로 `npm install --save` 하지 마세요.
- `server/_ez2ai_db.py` — 본체 ChildDbCompiler 가 갱신. `from server._ez2ai_db import get_psycopg2_conn, get_database` import 만 하고 본문 수정 금지 (수정 시 다음 컴파일에서 덮어쓰임).
- `server/routers/__init__.py`
- `server/auth.py` / `server/utils/auth.py` — **deprecated 가드레일, 절대 import 금지** (B.1.1)
- `server/host_auth.py` — verify_with_host 본체 위임 모듈. 본 모듈을 import 해서 사용만 하고 본문 수정 금지.
- `web/vite.config.ts`
- `/ez2ai_server/server/` (본체 폴더 — 자식 프로젝트 외부) 직접 수정 절대 금지

### B.0 자식 DB 표기 — `db_name.schema` 단일 패턴

- 본체 화면에 등록된 DB 의 `database` 필드는 PostgreSQL/MSSQL 에서 `db_name.schema` 표기 (예: `ez2ai.simbizlocal`). 본체 ChildDbCompiler 가 `_ez2ai_db.py` 의 `_split_db_schema()` 로 자동 분리해 `search_path` 로 전달.
- 자식 코드에서 DB 접속은 **반드시** `from server._ez2ai_db import get_psycopg2_conn` 사용. `psycopg2.connect(dbname='ez2ai.simbizlocal', ...)` 처럼 표기를 통째로 직접 전달하면 `database "ez2ai.simbizlocal" does not exist` 가 발생합니다.
- ORM 모델은 `__table_args__ = {'schema': 'simbizlocal'}` 로 schema 만 명시. 라우터에서 raw SQL 사용 시 `FROM simbizlocal.{table}` 로 schema 명시.

## B.1 본체 API 위임 + 테넌트 완전 격리 (78 차 보안 모델) ⚠ 절대 위반 금지

### B.1.1 자식 backend 인증 — verify_with_host 단일 패턴

자식 backend 의 모든 보호 엔드포인트는 `verify_with_host` 위임 패턴 **하나만** 사용한다. 이 함수는 실행모드를 **자동 분기**하므로(embedded = 본체 introspection / standalone = `server._auth_local` 자체 JWT 검증) 업무 라우터는 두 모드에서 동일하게 아래처럼 쓰면 된다:

```python
from server.host_auth import verify_with_host, HostUser
from fastapi import Depends

@router.get("/api/{your_path}")
async def your_endpoint(user: HostUser = Depends(verify_with_host)):
    # user.tenant_id / user.effective_tenant_id 는 본체가 SECRET_KEY 로
    # 서명 검증한 값 → 클라이언트가 위조할 수 없음.
    return await query(tenant_id=user.effective_tenant_id)
```

**절대 금지**:
- `import jwt` / `jwt.decode(...)` — 자식이 자체 서명 검증 금지
- `SECRET_KEY` 환경변수 사용 — 본체 introspection 으로 충분
- `from server.auth import ...` / `from server.utils.auth import ...` 사용 — 옛 가드레일 (deprecated)
- 헤더 (`X-Tenant-Id`, `X-User-Id` 등) 를 신뢰해서 SQL 의 `tenant_id` 로 사용

**근거**:
- 자식은 본체 `/api/users/me` 호출로 검증 (60 초 sha256 캐시).
- 본체 비응답 시 fail-closed 503 (무인증 통과 절대 금지).
- vite proxy 우회 (curl :13002 직접) 도 동일하게 본체 검증.

### B.1.2 자식 frontend axios — Bearer 토큰만

`web/src/lib/api.ts` 같은 axios 인스턴스는 **Authorization: Bearer 만** 보낸다.
X-Tenant-Id / X-User-Id 등 컨텍스트 헤더 주입 **절대 금지** (위조 통로가 됨).

### B.1.3 본체와 prefix 충돌 금지 — KIC `host_api_inventory` 먼저 확인

- 새 자식 라우터 `server/routers/{prefix}.py` 를 만들기 전 반드시 KIC 컨텍스트의
  `### 본체 API 인벤토리 (host_api_inventory)` 섹션에서 동일 prefix 가 이미
  본체에 등록되어 있는지 확인.
- 본체에 동일 path 가 있으면 자식 라우터 생성 **금지** (본체로 위임).
- 자체 비즈니스 API 가 필요하면 본체와 절대 겹치지 않는 prefix 사용
  (권장 패턴: `/api/p{project_code}/...` 또는 도메인 고유 명사).

### B.1.4 자식 frontend 는 본체에 없는 path 호출 금지

- 본체에 없는 `/api/*` path 를 자식 frontend 가 호출하면, vite proxy 가
  자식 backend 로 전송하더라도 결국 라우팅 실패 → 500/404.
- 새 화면이 본체에 없는 데이터를 필요로 할 경우, 자식 라우터 생성 전에
  사용자에게 "본체에 API 추가가 선행되어야 합니다" 라고 보고하고 중단.

### B.1.5 위협 모델 — 모든 시나리오 verify_with_host 가 차단

| 공격 | 차단 |
|---|---|
| X-Tenant-Id 헤더 위조 | 자식이 헤더를 읽지 않음 (B.1.2) |
| localStorage user_info.tenant_id 변조 | 서버는 localStorage 를 보지 않음 |
| 위조 JWT 직접 전송 | 본체 SECRET_KEY 서명 검증 실패 → 401 |
| vite proxy 우회 (curl :13002) | verify_with_host 가 본체에 introspection → 401 |
| 본체 다운 | fail-closed 503 (무인증 통과 금지) |

## C. DB 접근 — 헬퍼만 사용

```python
from server._ez2ai_db import get_psycopg2_conn, get_database
conn = get_psycopg2_conn()  # 첫 번째 등록 DB (password 자동 복호화)
```

- 평문 비밀번호 / 평문 DSN 을 코드에 작성 **금지**
- `.env` 의 `DATABASE_URL` 은 자식 backend 자체 DB (auth/user) 이며 업무 DB 와 별개
- SHARED_GUIDE.md §13 참조

## D. 로그 확인

- 위치: `.dev_context/logs/dev.log`
- 오류 발생 시: Read tool 로 tail 100줄 확인 → Traceback 의 `File ".../server/...py:N"` 추적

## E. 보고서

- 파일명: **`{순번}_B_REPORT.md`** 형식 준수 (예: `5_B_REPORT.md`). 순번 = 그 폴더 내 기존 `{N}_*` 최대 순번 + 1.
- 위치: instruction 의 `## 📂 본 사이클 작업 폴더` 섹션에 명시된 폴더 **직속**에 작성.
  - 형식: `ez2ai_document/outputs/{menu_code}/{순번}_B_REPORT.md` (하위 `{topic}/` 폴더·날짜·메뉴코드 접두 금지)
- 변경한 테이블·컬럼·API·화면과 정적 검증(문법/import) 결과를 구체 기록. 동작 확인이 필요하면 "사용자 재시작·로그 확인 요청" 으로 남긴다(§A — 서버 직접 실행 금지).

## F. 문서 작성 위치 (v8 — 절대 위반 금지)

- 모든 신규 markdown(보고서/노트/분석) 은 본 사이클 작업 폴더 안에 **`{순번}_B_{대문자_TYPE}.md`** 형식으로만 작성.
- `dev_plan/{NNN}/` 옛 경로는 폐기 — 절대 사용 금지.
- 다른 menu_code 폴더에 markdown 생성 금지.
- README.md 는 오케스트라가 자동 갱신 — claude 직접 작성/수정 금지.
- attachments/ 는 사용자/오케스트라 영역 — claude 쓰기 금지 (Read 가능).

위반 시 오케스트라 review 에서 사용자에게 경고가 발송됩니다.

## G. menu_code SSOT (Single Source of Truth — 절대 위반 금지)

**원칙**: `menu_code` 는 KIC 컨텍스트의 메뉴 리스트(`### Phase B 설계` / `### 메뉴
구성` 섹션 등) 또는 instruction 의 `## 📂 본 사이클 작업 폴더` 에 명시된 값에서만
가져온다. **임의 생성 / 자릿수 변형 절대 금지**.

### G.1 위반 사례 (실제 결함)

- `M00000002` 같은 8자리 임의 생성 — 빌더 자식 표준은 9자리 (`M000000002`).
- KIC 의 menus 에 없는 코드를 자체 추정해 `ez2ai_document/outputs/M00000099/...` 폴더 생성.
- 결과: 우측 [문서] 탭 트리에서 누락되어 사용자가 산출물을 찾지 못함.

### G.2 표준 자릿수

- **빌더 자식 표준**: `M` + 정확히 **9자리 숫자** (예: `M000000001`).
- `file_store.next_menu_code` 가 9자리만 발급하므로 menus.json 의 모든 코드가 9자리.
- 8자리 / 7자리 등 임의 자릿수 사용 시 후속 파이프라인이 폴더를 인식하지 못함.

### G.3 절차 — 코드 작업·문서 작성 전 menu_code 확정

1. instruction 의 `## 📂 본 사이클 작업 폴더` 섹션에서 menu_code 확인.
2. 명시 안 됐으면 KIC 의 `### Phase B 설계` / `### 메뉴 구성` 에서 매칭되는 항목 조회.
3. 매칭 안 되면 사용자에게 보고하고 작업 중단 (임의 생성 금지).
4. 공통 영역 보고서는 `M000000000` (공통문서 예약 코드) 사용.

### G.4 파일명도 표준 형식 강제 (§E 와 일치)

- 보고서: `ez2ai_report_step{N}.md` (예: `ez2ai_report_step1.md`).
- 첨부/노트: `NN_xxx.md` (NN = 두자리 0-padded, 시퀀스 번호).
- 위 형식을 따르지 않은 파일은 우측 [문서] 탭 정렬·미리보기 최적화가 적용되지 않음.

위반 시 오케스트라 review 에서 사용자에게 경고 + 폴더 자동 정정 요청이 발송됩니다.

## H. 공유 UI 컴포넌트 사용 — 강력 권장 (78 차 08~10)

> **적용 범위**: 본 §H 는 **모든 프로젝트 공통 권장**이다.
> shared/ 폴더는 child_template_patcher 가 모든 프로젝트에 install 하므로
> 본 §H 의 import 경로는 어느 프로젝트에서나 존재한다.

**원칙**: 일반 CRUD 목록+상세 화면은 자체 `<table>` / 페이지네이션 / 모달을 새로
작성하지 말고, 자식 프로젝트에 미리 설치된 공유 컴포넌트를 사용한다.

### H.1 위치

`web/src/M000000000/shared/` — force_write 로 본체가 항상 최신본을 동기화.
임의 수정 금지 (수정 사항이 다음 patch 에서 덮어쓰여진다).

### H.2 제공 컴포넌트

```tsx
import {
  Grid,           // 표준 목록 그리드 (헤더 sticky + body scroll, 페이지당 기본 10)
  DetailModal,    // 행 클릭 → view 모드 → '수정' 클릭 → edit 모드 전환
  ConfirmModal,   // 표준 확인 대화상자 (browser confirm() 금지 — CLAUDE.md §6.1)
  ExcelImporter,  // 표준 엑셀 업로드 (다운로드한 양식으로 일괄 등록)
  Pagination,     // 페이지 네비
  useToast,       // 상단 우측 토스트
  usePermission,  // 행 owner 또는 super admin 만 수정/삭제 가능 판별
  ToastStack,
  EMPTY_CONFIRM,
  type GridColumn,
  type DetailModalMode,
  type ConfirmState,
  type ExcelImportResult,
} from '../M000000000/shared'
```

### H.3 사용 패턴 (요지 — 상세 props·예시는 `shared/index.ts` 와 각 .tsx 를 Read)

- `<Grid>`: `columns`/`rows`/`rowKey` + `selectable`·`onRowClick`(→DetailModal)·`toolbarRight`(등록/삭제/엑셀)·`loading`. 페이징 기본 15.
- `<DetailModal>`: `mode`(view/edit/create) + `canEdit`/`canDelete`(=`usePermission().canEdit(owner)`) + `onModeChange`·`onSave`·`onDelete`.
- 엑셀: 다운로드 양식 헤더 ↔ `<ExcelImporter headerMap>` 키를 **1:1 동일**하게. `onImport(rows)` 에서 행별 POST(또는 bulk 엔드포인트로 일괄). 다중 row 는 한 번에 POST(트랜잭션 일관성).

### H.4 백엔드 권한 가드 (필수 — UI 만으로는 불충분)

서버 router 에서 update/delete 처리 전 다음을 강제:

```python
# SELECT register_id 후 비교
if not user.is_super_admin:
    if owner and owner != user.user_id:
        raise HTTPException(status_code=403, detail='본인이 등록한 항목만 수정/삭제할 수 있습니다.')
```

### H.5 자체 grid 가 허용되는 경우 (예외)

다음과 같은 특수 UI 는 자체 컴포넌트 작성 가능:
- 대시보드 / 시각화 / 캘린더 / 트리 그리드 / 가상 스크롤
- 인라인 셀 편집 (스프레드시트 패턴)
- 외부 라이브러리 그리드 사용 (ag-grid 등)

단, 디자인 토큰은 유지: primary `#003087`, 본문 폰트 `12.5~13px`, 카드 배경 `#fff`,
페이지 배경 `#f7f8fa`, 헤더 배경 `#eff3f8`, border `#e5e7eb`.

### H.6 위반 시

자체 `<table>` + 페이지네이션 + 모달을 새로 작성한 코드는 오케스트라 review 에서
"공유 컴포넌트 미사용" 경고로 표시되며, 사용자 검토 후 공유 컴포넌트로 교체될 수
있습니다. 처음부터 §H.3 패턴을 따르는 것을 권장합니다.

## I. 다크 모드 — 본체 테마 자동 동기화 (78 차 10)

> **적용 범위**: 본 §I 의 토큰 사용 권장은 **모든 프로젝트 공통**이다.
>
> **인프라는 모든 자식 공통**: 본체 → iframe `postMessage('ez2ai:host-theme')`,
> fragment `#theme=`, 자식 `<html>.dark` 토글, `shell/Layout.css` 의 `--ez-*`
> 토큰 정의는 모든 프로젝트에 force_write 되어 본체 토글이 자식 `<html>.dark`
> 까지 전달된다. 따라서 어느 프로젝트나 원하면 토큰을 활용할 수 있다 (강제 X).

**원칙**: 본체 우측 상단의 라이트/다크 토글이 자식 SPA 화면에도 즉시 반영되어야
한다. 페이지 CSS 에서 **hex 색상 직접 사용 금지**, 반드시 디자인 토큰 사용.

### I.1 인프라 (자동 동작 — 페이지 작성자 직접 처리 불필요)

- 본체 ExtensionFrame: 본체 `<html>.dark` 토글 감지 → iframe 에
  `postMessage('ez2ai:host-theme')`. iframe src fragment 에도 `#theme=` 포함.
- 자식 main.tsx: 메시지/fragment 수신 → 자식 `<html>.dark` 토글.
- shell/Layout.css: `:root { --ez-* }` 라이트 토큰 + `html.dark { --ez-* }` 다크
  override 정의. **본 파일이 토큰 정의의 SSOT.**

### I.2 페이지 CSS — 토큰만 사용 (필수)

`background:#fff`/`color:#1f2937` 같은 hex 직접 사용 금지 → `background:var(--ez-card)`/`color:var(--ez-text)`/`border:1px solid var(--ez-border)` 처럼 토큰만 사용(다크 자동 적용).

### I.3 자주 사용하는 토큰 (전체 정의는 `shell/Layout.css` 참조)

| 용도 | 토큰 | 라이트 → 다크 |
|---|---|---|
| 페이지 배경 | `--ez-bg-page` | `#f7f8fa` → `#0d1117` |
| 카드/모달 배경 | `--ez-card` | `#fff` → `#161b22` |
| 부드러운 카드 (검색바 등) | `--ez-card-soft` | `#f8fafc` → `#1c2128` |
| 본문 텍스트 | `--ez-text` | `#1f2937` → `#e6edf3` |
| 강조 텍스트 (제목) | `--ez-text-strong` | `#0f172a` → `#f0f6fc` |
| 흐린 텍스트 | `--ez-text-muted` | `#6b7280` → `#8b949e` |
| 더 흐린 텍스트 | `--ez-text-soft` | `#94a3b8` → `#6e7681` |
| 경계선 | `--ez-border` | `#e5e7eb` → `#30363d` |
| 주색상 (primary) | `--ez-primary` | `#003087` → `#58a6ff` |
| primary 위 텍스트 | `--ez-primary-text` | `#fff` → `#0d1117` |
| 행 호버 배경 | `--ez-row-hover` | `#f8fafc` → `#1f242c` |
| 행 선택 배경 | `--ez-row-selected` | `#eff6ff` → `#1f3a5f` |
| Grid 헤더 배경 | `--ez-primary-tint` | `#eff3f8` → `#1f3a5f` |
| 오버레이 (모달 backdrop) | `--ez-overlay` | rgba(0,0,0,0.45) → rgba(0,0,0,0.65) |
| 성공/경고/위험 | `--ez-success/--ez-warning/--ez-danger` | (자동) |

### I.4 위반 시

페이지 CSS 에 hex 색상 (`#fff`, `#000`, `#003087` 등) 이 발견되면 오케스트라
review 에서 "토큰 미사용" 경고가 표시됩니다. 라이트/다크 토글 시 해당 영역만
잘못 표시되어 사용자 경험이 저하됩니다.

**예외**: 토스트(`ez-tailwind.css` 의 토스트 클래스) 같이 의도적으로 짙은 단색 배경 + 흰 텍스트를
유지해야 하는 컴포넌트는 hex 사용 가능. 단 문서화 필수.

## J. import·참조한 파일은 반드시 실재해야 한다 (추측 코딩 금지 — 앱 미기동 방지)

코드가 `import` / 참조하는 파일(스타일 토큰 SSOT · 컴포넌트 · 모듈 · 설정)이 **없으면**,
"본체가 준다 / 런타임에 자동 생성된다 / 나중에 생기겠지" 라고 **가정하지 말 것.**
다음 중 하나로 **즉시** 처리한다:

1. 그 파일을 **직접 생성**한다(빈 파일이 아니라 실제 내용까지 채워서).
2. 부재 원인 · 생성 주체 · 정확한 경로를 **확인**한 뒤 올바른 경로로 참조한다.

- 특히 `main.tsx` 등 **가드레일이 import 하는 파일**(예: `web/src/styles/ez-tailwind.css`
  같은 토큰/스타일 SSOT)이 부재하면 **import 실패로 앱이 아예 뜨지 않는다.** (스타일 전무 + 화이트 스크린)
- **import 대상 파일 부재 = "완료" 보고 금지 사유.** "1차 완료" 를 보고하기 전에,
  새로 추가·수정한 **모든 import 경로가 실제 파일로 존재**하는지 확인한다(존재하지 않으면
  위 1)로 만들거나 2)로 경로를 바로잡는다). 백엔드만 검증하고 프런트 import 를 넘기지 말 것(§A).
