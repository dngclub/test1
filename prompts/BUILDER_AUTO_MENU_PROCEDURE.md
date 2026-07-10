# ⚡ 메뉴 자동 생성 절차 (84차 v8)

사용자가 우측 패널의 ⚡ 모달에서 매뉴얼·메뉴리스트·table 설계서를 첨부하고
"코딩 도구에 전달"을 눌렀습니다. 첨부 파일은 메시지 본문에 절대 경로로 명시됩니다.

> **핵심 — 추출은 코어 도구가, 판단은 당신(코딩 도구)이 합니다.**
> 첨부 자료는 양식이 지정되어 있지 않습니다. 코어 도구로 원본을 추출만 하고,
> 메뉴 구조·사용자 설계·이미지/테이블 매핑은 **당신이 자료를 조합해 판단**하세요.

> Bash / Read / Write 도구만 사용합니다. 본체 API / curl / 토큰 일체 사용 X.

## 0. 코어 도구 위치

빌더가 관리·배포하는 결정론적 도구 4종 (서버가 시작 시 자동 배포):
`{BUILDER_BASE}/_shared/scripts/auto_menu/`

- `pdf_extract.py`   — PDF → 텍스트·TOC·페이지 이미지
- `xlsx_extract.py`  — Excel → 원본 셀 덤프
- `db_introspect.py` — 실제 DB 접속 → 테이블·컬럼·코멘트
- `apply_design.py`  — 판단 결과 → menus/menu/images/db_design 정규 기록

`BUILDER_BASE` 환경변수가 없으면 절대 경로 `D:/APP/Project/python/ez2ai_builder`
를 사용하세요. 작업 디렉토리(cwd)는 자식 프로젝트 루트입니다.

## 1. 준비 — 메뉴 0건 분기

```bash
python -c "import json,pathlib; p=pathlib.Path('menus.json'); print(len(json.loads(p.read_text(encoding='utf-8')).get('menus',[])) if p.exists() else 0)"
```

- 0 이면: 첨부에서 메뉴 트리를 처음부터 생성.
- 1 이상: 기존 메뉴 보존 + 신규만 추가 (apply_design.py 가 자동 처리).

## 2. 원본 추출 (코어 도구)

작업 임시 폴더: `.dev_context/auto_menu_tmp/` (없으면 생성).

### 2.1 PDF 매뉴얼

```bash
python "$BUILDER_BASE/_shared/scripts/auto_menu/pdf_extract.py" --input <pdf 절대경로> --output .dev_context/auto_menu_tmp/pdf_1.json --images-dir .dev_context/auto_menu_tmp/images --min-dim 400 --dpi 150
```

출력 JSON: `{toc, pages:[{page,text,images:[{file,w,h,kind}]}]}` + PNG 파일.

### 2.2 Excel (메뉴리스트 / table 설계서가 .xlsx 일 때)

```bash
python "$BUILDER_BASE/_shared/scripts/auto_menu/xlsx_extract.py" --input <xlsx 절대경로> --output .dev_context/auto_menu_tmp/xlsx_1.json
```

출력 JSON: `{sheets:[{name,rows:[[...]]}]}`.

### 2.3 md / txt

코어 도구 불필요 — Read 도구로 직접 읽으세요.

### 2.4 DB 스키마 (연관 테이블 등록용)

```bash
python "$BUILDER_BASE/_shared/scripts/auto_menu/db_introspect.py" --project-root . --output .dev_context/auto_menu_tmp/db.json
```

출력 JSON: `{connections:[{id,name,db_type,database,ok,tables:[{name,comment,columns:[{name,type,nullable,key,default,comment}]}]}]}`.
DB 연결이 미설정이면 `connections:[]` — DB 설계는 건너뛰고 사용자에게 안내.

## 3. 판단 (당신의 핵심 작업)

추출된 JSON + md/txt 를 모두 Read 로 읽고 **조합·판단**하세요:

1. **메뉴 트리** — 메뉴리스트 + 매뉴얼 TOC 를 종합하여 folder/function 계층 결정.
2. **사용자 설계(user_design)** — 각 메뉴마다 매뉴얼 본문에서 해당 기능 설명
   (검색조건·버튼·프로세스·비즈니스 규칙 등)을 정리하여 본문 작성.
3. **메뉴별 참고 이미지** — PDF 페이지 이미지 중 해당 메뉴를 설명하는 페이지를
   골라 매핑. **PDF 매뉴얼의 이미지는 반드시 관련 메뉴의 참고 이미지로 등록**합니다.
4. **연관 테이블** — `db_introspect` 결과에서 각 메뉴가 사용하는 테이블을 골라
   컬럼·코멘트와 함께 매핑.

## 4. combined.json 작성

판단 결과를 `.dev_context/auto_menu_tmp/combined.json` 으로 작성:

```json
{
  "menus": [
    {
      "menu_name": "공지사항",
      "menu_type": "function",
      "parent_menu_name": "사용자메뉴",
      "sort_order": 1,
      "user_design": "## 공지사항\n검색조건: 제목, 등록일 ...",
      "images": ["manual_p012.png", "manual_p013.png"],
      "db_tables": [
        {
          "table_name": "co_notice",
          "table_comment": "공지사항",
          "db_schema_name": "tsopdev",
          "connection_id": 132,
          "columns": [
            {"name": "notice_id", "data_type": "varchar(50)", "nullable": false, "key": "PRI", "comment": "공지ID"}
          ]
        }
      ]
    }
  ]
}
```

- `menu_code` 생략 시 신규 채번. 기존 메뉴 갱신 시에만 `menu_code` 명시.
- 부모는 `parent_menu_name` 또는 `parent_menu_code` 로 지정. 최상위는 생략.
- `menu_type` 은 `folder` 또는 `function`.
- `images` 는 `--images-dir` 폴더 안의 파일명.
- `db_tables[].columns` 는 db_introspect 결과의 `columns` 를 사용 (`type` → `data_type`).
- `images` / `db_tables` 가 없는 메뉴는 해당 키를 생략해도 됩니다.

## 5. 등록 (apply_design.py)

```bash
python "$BUILDER_BASE/_shared/scripts/auto_menu/apply_design.py" --project-root . --design .dev_context/auto_menu_tmp/combined.json --images-dir .dev_context/auto_menu_tmp/images
```

스크립트가 자동 수행: `menus.json` 병합(신규 채번·기존 보존) / 메뉴별
`menu.json`(user_design)·`images.json`·`db_design.json` 기록 / 이미지 복사 /
`.dev_context/auto_menu_backup_<ts>/` 백업 / 오류 시 복원.

## 6. 결과 보고

`apply_design.py` 의 마지막 stdout 줄을 사용자에게 그대로 보고:

```
메뉴 N건 / 이미지 M건(P개 메뉴) / db_design K건 — 백업 ...
```

## 7. 가드레일

- 본체 폴더(`/ez2ai_server/server/`) 수정 X
- 자식 가드레일 5종 파일 수정 X
- 기존 `menus.json` 항목 수정/삭제 X — apply_design.py 가 append 처리
- 본체 API 호출 X — 모든 변경은 자식 폴더 파일
- 추출 메뉴 0건 + 자식 메뉴도 0건 → 사용자에게 안내 후 작업 중단
- `.dev_context/auto_menu_tmp/` 임시 파일은 작업 후 남겨두기 (디버깅용)
