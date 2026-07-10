# 🎨 디자인 템플릿 자동 완성 절차 (91차)

운영자가 빌더 "디자인 관리"에서 톤·업종·참고 자료를 입력해 새 디자인 템플릿
생성을 요청했습니다. 작업 디렉토리(cwd)는 이미 새 템플릿 폴더
`design/template/{code}/` 이며, `common_design` 골격이 복제되어 있습니다.

> **핵심 — 당신은 `tokens/tokens.css` 를 재정의하여 톤을 입힙니다.**
> 골격(구조·컴포넌트·클래스)은 보존하고, 색·타이포·간격 토큰만 톤에 맞춰
> 재정의합니다. 구조 파일(`core.css`, `components/*.html`)은 수정하지 마세요.

> Bash / Read / Write 도구만 사용합니다. 본체 API / curl / 토큰 일체 사용 X.

## 0. 코어 도구·레퍼런스 위치

서버가 시작 시 자동 배포하는 자산:

- `{BUILDER_BASE}/_shared/scripts/design_gen/design_validate.py` — 구조 검증 + 디자인 린트
- `{BUILDER_BASE}/_shared/scripts/design_gen/palette_extract.py` — 이미지 → OKLCH 팔레트
- `{BUILDER_BASE}/_shared/design_refs/` — 업종별 톤 레퍼런스 DESIGN.md ~12종

`BUILDER_BASE` 환경변수가 없으면 cwd 에서 `../../_shared/` 로 거슬러 올라가세요.

## 1. 입력 파악

작업 폴더의 `.design_gen_input/` 에 운영자 입력이 있습니다:

```bash
ls -la .design_gen_input/ .design_gen_input/refs/ 2>/dev/null
cat .design_gen_input/brief.json 2>/dev/null
```

- `brief.json` — 이름·설명·톤(tone)·업종(industry) 디스커버리
- 이미지 파일 — 로고/캡쳐 (팔레트 추출 대상)
- `refs/` — 참고 URL 에서 받아온 HTML/CSS

## 2. 레퍼런스 선택

`_shared/design_refs/` 에서 입력 톤·업종에 가장 가까운 DESIGN.md 를 1~2개
골라 Read 합니다. 9섹션(Color·Typography·Spacing·Layout·Components·Motion·
Voice·Brand·Anti-patterns)을 참고하되 그대로 복사하지 말고 입력에 맞게 해석합니다.

## 3. 팔레트 추출 (이미지가 있을 때)

```bash
python "$BUILDER_BASE/_shared/scripts/design_gen/palette_extract.py" \
  --input .design_gen_input/<이미지> --output .design_gen_input/palette.json
cat .design_gen_input/palette.json
```

추출된 hex/oklch 를 primary·표면·텍스트 색의 출발점으로 삼습니다.

## 4. tokens/tokens.css 재정의

`tokens/tokens.css` 를 Read 하여 정의된 `--ez-*` 토큰 목록을 파악한 뒤,
색·타이포·간격 토큰을 톤에 맞춰 Write 합니다.

- **모든 `--ez-*` 토큰을 빠짐없이 유지** — `core.css` 가 참조하는 토큰이
  누락되면 `TOKEN_UNDEFINED` 오류로 등록이 차단됩니다.
- 색: primary·표면·텍스트·경계·상태색(success/warning/danger/info)
- 타이포: `--ez-fs-*` 는 단조 증가, `--ez-fs-base` 는 14px 이상
- 명암비: 본문 텍스트 4.5:1, 큰 텍스트·UI 3:1 이상 (WCAG 2.2 AA)
- 토큰 구조는 **단일 `tokens/tokens.css`** — 분리 파일(colors-light.css 등)을
  새로 만들지 마세요.

## 5. 5차원 자가 점검

Write 전후로 다음 5차원을 스스로 점검하고, 미흡한 차원을 보완합니다:

1. **철학** — 입력 톤·업종의 본질이 색·타이포에 드러나는가?
2. **위계** — primary/표면/텍스트 단계가 명확히 구분되는가?
3. **디테일** — 상태색·경계·hover 까지 일관되게 정의했는가?
4. **기능** — 모든 `--ez-*` 토큰이 유지되어 컴포넌트가 정상 렌더되는가?
5. **혁신** — 흔한 기본값이 아닌, 업종에 어울리는 고유한 톤인가?

## 6. 검증

```bash
python "$BUILDER_BASE/_shared/scripts/design_gen/design_validate.py" \
  --template-dir . --output .design_gen_input/validate.json
cat .design_gen_input/validate.json
```

- `errors` 가 있으면 원인(누락 토큰·클래스·중괄호)을 수정하고 재검증합니다.
- `warnings` 는 가능한 한 해소하되 디자인 의도상 불가피하면 남겨둡니다.
- `errors` 0건이 되어야 운영자가 승인할 수 있습니다.

## 7. 마무리

`DESIGN_GUIDE.md` 의 색·톤 설명을 새 톤에 맞게 갱신합니다. 작업이 끝나면
운영자가 검토 화면에서 미리보기를 확인하고 승인/반려합니다.

## 절대 금지

- 본체 폴더(`/ez2ai_server/server/`) 수정 X
- `core.css` · `components/*.html` 구조 파일 수정 X (토큰 재정의만)
- `--ez-*` 토큰 삭제 X — 모두 유지하며 값만 변경
- 분리 토큰 파일 신규 생성 X — `tokens/tokens.css` 단일 유지
- 본체 API 호출 X — 모든 변경은 작업 폴더 파일
