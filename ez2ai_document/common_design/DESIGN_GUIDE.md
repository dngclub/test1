# ez2AI 공통 디자인 가이드 (common_design)

> 본 문서는 **ez2AI 공통 디자인 시스템**의 단일 표준 가이드입니다.
> 디자인 템플릿을 등록하지 않은 모든 프로젝트는 본 디자인을 기본값으로 적용받습니다.
> 신규 화면을 개발하기 전에 **반드시 본 문서를 통독**하고, 아래 원칙·토큰·컴포넌트를
> 그대로 인용·조립하여 사용하세요.

---

## 0. 적용 대상과 사용 방식

- **적용 대상**: 모든 자식 프로젝트의 모든 화면(메뉴).
- **자산 위치**: 디자인 템플릿 적용 시 프로젝트 안에 복사됩니다.
  `document/M000000000/common_design/`
- **사용 방식**: 본 폴더의 HTML(`components/`·`samples/`)을 **React JSX 로 1:1 변환**하면
  실제 시스템과 동일한 화면이 즉시 나옵니다. **클래스명은 그대로 유지**합니다.
- **스타일 로딩**: 각 화면은 `tokens/tokens.css` + `core.css` 두 파일에 정의된
  토큰·클래스를 사용합니다. 페이지에서 색·간격·폰트를 직접 정의하지 않습니다.

---

## 1. 폴더 구조

```
common_design/
├── DESIGN_GUIDE.md      ← 본 문서 (디자인 원칙 + 컴포넌트 + 체크리스트)
├── index.html           ← 쇼케이스 진입점 (사이드바 + iframe 미리보기)
├── tokens/
│   └── tokens.css       ← 디자인 토큰 (--ez-* / 라이트 + html.dark 다크)
├── core.css             ← 공통 컴포넌트 CSS (eg-* 공유 / xx-* 페이지)
├── components/          ← 단위 컴포넌트 HTML 29종 (button, input, grid, modal, ...)
├── samples/             ← 실전 화면 패턴 HTML 9종 (list-crud, dashboard, ...)
├── pages/               ← 토큰·원칙·체크리스트 설명 문서 HTML
└── assets/              ← 쇼케이스 전용 스타일/스크립트 (showcase.css / showcase.js)
```

> `index.html` 을 브라우저로 열면 전체 컴포넌트·샘플을 한눈에 탐색할 수 있습니다.

---

## 2. 6대 디자인 원칙 (절대 준수)

### 원칙 1 · 토큰 우선 (Token-First)
색·폰트·간격·반경·그림자는 **반드시 `--ez-*` 토큰**으로만 사용합니다.
페이지 CSS 에 `#003087` 같은 hex 를 직접 쓰지 않습니다. 다크 모드가 토큰
override 한 번으로 해결되는 이유입니다.

```css
/* ❌ 잘못 */ .an-title { color: #1e3a8a; font-size: 14px; }
/* ✅ 올바름 */ .an-title { color: var(--ez-link); font-size: var(--ez-fs-base); }
```

### 원칙 2 · 페이지당 단일 prefix
한 페이지의 모든 페이지-전용 클래스는 동일한 2~3자 prefix 로 시작합니다
(공지 `an-`, 공통코드 `cc-`, 점검 `in-`, 작업오더 `wo-` 등). 전역 CSS 충돌을
차단하고 검색·디버깅을 쉽게 합니다. 단, **공통 컴포넌트 클래스(`eg-*`)는
prefix 없이 그대로** 사용합니다.

### 원칙 3 · 컨트롤 36px / 본문 14px
버튼·입력·셀렉트 높이는 모두 `--ez-ctl-h` (36px). 그리드 행은 `--ez-row-h`
(40px), 헤더는 `--ez-row-h-head` (42px). 본문 글자는 `--ez-fs-base` (14px).
**이 값은 사용자 컨펌이 끝난 값이므로 임의로 줄이지 마세요.**

### 원칙 4 · 행 클릭 → 수정 모달 / + 등록 → 신규 모달
모든 목록 화면이 따르는 일관 패턴입니다. 삭제는 ConfirmModal 확인 후 수행,
결과는 토스트로 알립니다. 모달 footer 의 **삭제 버튼은 좌측, 취소/저장은 우측**.

### 원칙 5 · 서버 한 번 + 클라이언트 페이지네이션
대부분의 목록은 검색 결과 전체를 한 번에 가져와 클라이언트에서 페이징
(`useMemo`). 행 수 옵션은 `20 / 30 / 50 / 100 / 500`.

### 원칙 6 · 외부 UI 라이브러리 금지
**AntD · MUI · shadcn · Bootstrap · Chakra 등 도입 절대 금지.** 일관된 룩앤필을
깨뜨립니다. 본 디자인 시스템의 자체 컴포넌트를 항상 재사용하세요. 차트만
예외이며, Recharts 도입 시 사용자 승인이 필요합니다.

---

## 3. 디자인 토큰 (`--ez-*`)

전체 정의는 `tokens/tokens.css` 참조. 핵심 토큰:

### 색상 (라이트 / `html.dark` 자동 전환)
| 토큰 | 용도 |
|---|---|
| `--ez-bg` / `--ez-bg-page` | 페이지 배경 |
| `--ez-card` / `--ez-card-soft` | 카드·표면 / 보조 표면 |
| `--ez-text` / `--ez-text-strong` / `--ez-text-muted` / `--ez-text-soft` | 본문 / 강조 / 흐림 / 더 흐림 |
| `--ez-border` / `--ez-border-soft` / `--ez-border-strong` | 경계선 |
| `--ez-primary` (#2267b6) / `--ez-primary-hover` / `--ez-primary-tint` | 주색상 / 호버 / 옅은 배경 |
| `--ez-success` / `--ez-warning` / `--ez-danger` / `--ez-info` | 상태색 (+ `-bg` / `-border` / `-text` 변형) |
| `--ez-row-hover` / `--ez-row-selected` | 그리드 행 호버 / 선택 |

### 타이포그래피
| 토큰 | 값 |
|---|---|
| `--ez-font` / `--ez-font-sans` | Pretendard 스택 |
| `--ez-font-mono` | 고정폭(코드용) |
| `--ez-fs-xs / sm / base / md / lg / xl / 2xl` | 12 / 13 / 14 / 14 / 16 / 18 / 21 px |
| `--ez-fw-medium / semibold / bold` | 500 / 600 / 700 |

### 규격
| 토큰 | 값 | 용도 |
|---|---|---|
| `--ez-ctl-h` / `--ez-ctl-h-sm` | 36px / 30px | 컨트롤 높이 |
| `--ez-ctl-px` / `--ez-ctl-radius` | 10px / 4px | 컨트롤 좌우 패딩 / 반경 |
| `--ez-row-h` / `--ez-row-h-head` | 40px / 42px | 그리드 행 / 헤더 행 |
| `--ez-radius-sm / radius / md / lg` | 3 / 4 / 8 / 10 px | 모서리 반경 |
| `--ez-shadow-sm / md / lg` | — | 그림자 |

---

## 4. 공통 컴포넌트 클래스

`core.css` 의 클래스는 두 종류입니다.

### 4.1 공유 컴포넌트 (`eg-*`) — 그대로 사용, prefix 금지
실제 시스템의 공유 모듈(Grid / DetailModal / ConfirmModal / Pagination /
useToast)과 1:1 동일한 클래스입니다. **이름을 바꾸지 말고 그대로** 사용합니다.

| 클래스 | 컴포넌트 |
|---|---|
| `eg-btn` + `eg-btn-{primary\|default\|outline\|danger\|success\|warning\|ghost\|link}` | 버튼. 크기 변형 `eg-btn-sm`, `eg-btn-icon`, `eg-btn-block` |
| `eg-grid-wrap` / `eg-grid-head` / `eg-grid-scroll` / `eg-grid` | 그리드(표). `thead th` 헤더, `tbody tr.clickable` 행 클릭, `tr.sel` 선택 |
| `eg-page-size` | 행 수 셀렉트 |
| `eg-pager` | 페이지네이션 (`button.active` 현재 쪽) |
| `eg-modal-backdrop` / `eg-modal` (`size-sm\|lg\|xl`) / `eg-modal-header` / `eg-modal-body` / `eg-modal-footer` | 상세·편집 모달. footer `.left` = 좌측 정렬(삭제 버튼) |
| `eg-confirm-backdrop` / `eg-confirm` / `eg-confirm-body` / `eg-confirm-footer` | 확인 대화상자 |
| `eg-form-row` (+ `> label .req`) / `eg-form-control` / `eg-form-view` | 모달 폼 한 줄 (라벨 + 입력). 필수 표시 `.req` |
| `eg-toast-stack` / `eg-toast` (`eg-toast-{success\|error\|info\|warning}`) | 토스트 알림 |

### 4.2 페이지 컴포넌트 (`xx-*`) — 페이지 prefix 로 복제
`core.css` 에서 대표 prefix `xx-` 로 정의된 패턴입니다. 신규 페이지는 자신의
prefix(`an-`, `wo-` 등)로 **동일 구조를 1:1 복제**하여 사용합니다.

| 클래스(대표) | 패턴 |
|---|---|
| `xx-page` / `xx-header` / `xx-header-actions` | 페이지 컨테이너 + 상단 제목·액션. `h1` 은 좌측 primary 바 |
| `xx-search` / `xx-field` / `xx-search-actions` | 검색 영역 (라벨 + 입력 묶음) |
| `xx-input` / `xx-select` / `xx-textarea` | 단독 입력 컨트롤 |
| `xx-yn` / `xx-switch` | 체크박스·라디오 / 스위치 |
| `xx-pill` (`is-primary\|success\|warning\|danger\|muted\|info`) / `xx-badge` / `xx-dot` | 상태 칩 / 카운트 배지 / 상태 점 |
| `xx-tabs` / `xx-tab` (`is-active`) | 탭 |
| `xx-crumb` | 브레드크럼 |
| `xx-split` / `xx-pane` / `xx-pane-head` | Master-Detail 2분할 |
| `xx-summary-row` / `xx-summary-card` / `xx-chart-card` / `xx-bar-*` | 대시보드 카드·차트 |
| `xx-tree` / `xx-kanban` / `xx-menu` / `xx-tip` / `xx-empty-card` / `xx-spinner` / `xx-progress` / `xx-attach-*` / `xx-sign-pad` | 트리 / 칸반 / 드롭다운 / 툴팁 / 빈 상태 / 스피너 / 진행바 / 첨부 / 서명 |

---

## 5. 화면 패턴 (`samples/`)

만들 화면 유형에 맞는 샘플 HTML 을 먼저 읽고 그 구조를 따르세요.

| 파일 | 화면 유형 |
|---|---|
| `samples/layout-shell.html` | 레이아웃 셸 (사이드 + 탭 + 본문) |
| `samples/login-page.html` | 로그인 |
| `samples/list-crud.html` | 목록 + 검색 + CRUD (가장 흔한 패턴) |
| `samples/master-detail.html` | 좌측 목록 ↔ 우측 상세 2분할 |
| `samples/dashboard.html` | 통계 카드 + 차트 대시보드 |
| `samples/form-edit.html` | 상세/편집 모달 폼 |
| `samples/approval-flow.html` | 결재 진행 흐름 |
| `samples/kanban-board.html` | 칸반 보드 |
| `samples/mobile-inspection.html` | 모바일 점검 화면 |

**목록 화면 표준 구조** (`list-crud.html`):
```
xx-page
├── xx-header            (h1 제목 + xx-header-actions: 새로고침/엑셀/+등록 버튼)
├── xx-search            (xx-field 검색 조건들 + xx-search-actions: 검색/초기화)
└── eg-grid-wrap
    ├── eg-grid-head     (좌: 건수 요약 / 우: eg-page-size 행 수)
    ├── eg-grid-scroll > table.eg-grid   (행 tr.clickable, 상태는 xx-pill)
    └── eg-pager
```

---

## 6. 컴포넌트 카탈로그 (`components/`)

단위 컴포넌트 29종. 사용할 컴포넌트의 HTML 을 읽고 스니펫을 JSX 로 변환합니다.

- **기본 입력**: `button` `input` `select` `textarea` `date` `checkbox` `switch` `picker`
- **표시**: `badge` `tag` `tabs` `breadcrumb` `tooltip` `spinner` `empty-state`
- **데이터**: `grid` `pagination` `search-bar` `tree`
- **오버레이**: `modal` `confirm` `toast` `dropdown` `notification`
- **도메인 특화**: `file-upload` `signature-pad` `kanban-card` `approval-step` `risk-matrix`

---

## 7. 신규 페이지 개발 체크리스트

1. [ ] `document/M000000000/common_design/` 폴더 존재 확인 (없으면 사용자에게
       "프로젝트 관리 → 디자인 템플릿 적용 필요" 안내)
2. [ ] 본 `DESIGN_GUIDE.md` 통독 — 6대 원칙 숙지
3. [ ] 만들 화면 유형의 `samples/` 패턴 1~2개 파일 읽기
4. [ ] 사용할 `components/*.html` 스니펫을 React JSX 로 변환 (**클래스명 유지**)
5. [ ] 페이지 prefix 결정 (예: 거래처 `cu-`, 품목 `it-`, 작업오더 `wo-`)
6. [ ] 색·간격·폰트는 모두 `--ez-*` 토큰 사용 — hex 직접 사용 0건
7. [ ] 공유 컴포넌트(`eg-*`)는 그대로, 페이지 클래스는 prefix 로 복제
8. [ ] 컨트롤 36px / 본문 14px / 그리드 행 40px 준수
9. [ ] 라이트·다크 모드 모두 확인 (`html.dark` 토큰 자동 전환)

---

## 8. 금지 사항

- ⛔ `tokens/tokens.css` · `core.css` **직접 수정 금지** — 다음 적용 시 덮어쓰기됩니다.
- ⛔ 외부 UI 라이브러리(AntD/MUI/shadcn/Bootstrap/Chakra) 도입 금지.
- ⛔ 페이지 CSS 에 hex 색상·고정 px 폰트 직접 작성 금지 — 토큰만 사용.
- ⛔ 공유 컴포넌트 클래스(`eg-*`) 이름 변경·재정의 금지.
- ⛔ 컨트롤·행 높이를 사용자 컨펌 값보다 임의로 축소 금지.
