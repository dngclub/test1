당신은 소프트웨어 아키텍처 전문가이자 시니어 UI/UX 디자이너입니다.
아래 **4가지 입력 (프로젝트명 + 공통 화면 이미지 + 프로젝트 설명 + 관련 문서)** 을 종합 분석하여 M000000000 공통 개발 설계서(DEV_PLAN.md)를 작성합니다.

## 입력 1 — 프로젝트 정보 (프로젝트명/설명 포함)
- 프로젝트명: {{project_name}}
- 사이트명: {{site_name}}
- 메인 색상: {{primary_color}}
- 로고/브랜딩 안내: {{logo_info}}
- 프로젝트 설명: {{project_description}}

## 입력 2 — 공통 화면 이미지 목록 (id / 파일명 / 사용자 설명 / 정렬순서)
> 첨부된 이미지 바이너리도 함께 분석하세요.
{{image_list}}

## 입력 3 — 관련 문서 (네이밍룰 / 용어 정의 / 참조 문서 종합)
> 각 문서의 사용자 설명(description) + 마크다운 본문이 함께 제공됩니다. 모두 준수하세요.
{{naming_rules}}

## 입력 4 — 기존 개발계획 (수정/조정 기준 — 없으면 신규 작성)
{{existing_dev_plan}}

## ★ 최우선 규칙 — 기존 개발계획 보존 + 지시 실질 개정
위 '기존 개발계획' 이 있으면 그것을 **기반으로 보강/수정**하세요. 처음부터 다시 작성하거나 기존 내용을 임의로 삭제하지 말고, 기존 문서의 구조·섹션·결정 사항을 유지합니다. 기존 개발계획이 비어있을 때만 신규로 전체 작성합니다.

**단, 맨 아래 '추가 지시사항' 에 해당하는 부분은 반드시 실질적으로 개정하세요.** 기존 값을 그대로 복제하지 말고 지시 방향으로 **구체적이고 눈에 띄게** 바꿉니다. 보존은 '지시와 무관한 부분' 에만 적용합니다.
- 예) 지시가 "디자인 고급화" 면 → Part 2 의 색상 팔레트/그림자(shadow-lg·xl)/둥글기(rounded-xl·2xl)/간격/타이포 위계/그라데이션(Tailwind 표준 from-·via-·to-)/호버·상태 전환을 **구체적으로 상향** (단, arbitrary values 금지·shadcn 표준 규칙 준수).
- 변경한 섹션은 기존 대비 실제로 달라져야 하며, 같은 값을 반복하면 안 됩니다.

첨부된 이미지를 분석하여 다음 항목을 **모두** 포함한 DEV_PLAN.md를 작성하세요:

# Part 1: 프로젝트 개발 가이드

1. 프로젝트 개요 및 목적
2. 기술 스택 (프레임워크, 라이브러리, DB 등)
3. 라우팅 구조 및 페이지 계층
4. 인증/권한 처리 방식
5. 개발 시작 가이드 (첫 번째 할 일)

# Part 2: UI 디자인 스펙

첨부된 이미지를 정밀 분석하여, 코딩 에이전트가 이미지와 **동일한 UI**를 구현할 수 있도록 아래 항목을 상세히 기술하세요.

## 디자인 스펙 작성 규칙
- UI 컴포넌트는 **shadcn/ui** 표준 컴포넌트명을 사용 (Button, Card, Input, Select, Dialog, Sheet, Table, Tabs, Checkbox, RadioGroup, Switch, Badge, Avatar, DropdownMenu, NavigationMenu, Sidebar, Separator, ScrollArea, Tooltip)
- 스타일링은 Tailwind CSS 표준 유틸리티 클래스만 사용
  - 허용: p-1 ~ p-12, m-1 ~ m-12, gap-1 ~ gap-8, w-full, w-1/2, h-screen, max-w-sm ~ max-w-7xl
  - **금지**: arbitrary values (p-[17px], w-[320px], text-[14px] 등)
- 색상은 CSS 변수 사용: --primary, --secondary, --accent, --background, --foreground, --muted, --border
- 메인 색상(--primary)은 위 '메인 색상' 값에 매핑
- 로고 이미지가 없으면 사이트명을 텍스트 로고로 표시

## 디자인 스펙 필수 섹션

### 6. 레이아웃 구조
- 레이아웃 타입: split(좌우분할) / centered(중앙) / dashboard(헤더+사이드바+컨텐츠) / sidebar
- 각 영역의 비율 (예: 좌 40% / 우 60%)
- 반응형 브레이크포인트 동작

### 7. 화면별 컴포넌트 구성
각 이미지(로그인, 메인, 레이아웃)별로:
- 사용할 shadcn/ui 컴포넌트 목록
- 컴포넌트 배치 순서와 중첩 구조
- 각 컴포넌트의 props/variant (예: Button variant="outline")

### 8. 색상 및 스타일 가이드
- Primary / Secondary / Accent / Background / Foreground 색상 (HEX)
- 이미지에서 추출한 색상 팔레트
- 폰트 크기 체계 (text-sm, text-base, text-lg 등 Tailwind 표준만)
- 둥글기(rounded-md, rounded-lg 등), 그림자(shadow-sm, shadow-md 등)

### 9. 로고 및 브랜딩
- 로고 배치 위치 (로그인 화면, 네비게이션 바 등)
- 로고 크기 및 여백

### 10. 공통 UI 패턴
- 폼 레이아웃 패턴 (라벨 위치, 간격, 에러 표시)
- 버튼 스타일 체계 (primary, secondary, outline, ghost)
- 네비게이션 패턴 (사이드바 메뉴 구조, 활성 상태)

### 11. 구현 우선순위
1. 프로젝트 초기 세팅 (shadcn/ui init, Tailwind, CSS 변수)
2. 공통 레이아웃 컴포넌트
3. 로그인 화면
4. 메인 대시보드 화면

### 12. 절대 수정 금지 가드레일 (자동 생성된 SHARED_GUIDE 0.1 / CLAUDE.md 1.5 참조)
다음 5개 파일은 자식 프로젝트의 인증·라우팅 안정성을 보장하므로 본 설계서에서 구조 변경을 명시하지 마세요 (folder_initializer 가 자동 관리):
- `web/src/main.tsx` (URL fragment 동기 처리 — 최초 진입 인증 race condition 방지)
- `web/src/M000000000/auth/AuthProvider.tsx` (인증 컨텍스트)
- `web/src/M000000000/auth/ProtectedRoute.tsx` (보호 라우트)
- `server/routers/__init__.py` (라우터 자동 디스커버리)
- `web/vite.config.ts` (자식 backend proxy 자동 디스커버리)

신규 메뉴 추가 시 `server/routers/{prefix}.py` + 페이지 컴포넌트 + `App.tsx` 라우트만 작성하면 됩니다 (SHARED_GUIDE 0.2 의 5단계 표준 흐름).