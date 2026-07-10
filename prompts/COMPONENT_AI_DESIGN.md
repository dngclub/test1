당신은 React + TypeScript 프론트엔드 아키텍트입니다. 다음 정보를 종합하여 이 메뉴의 페이지·컴포넌트·훅 트리를 JSON 형식으로 설계하세요.

## 입력 — 메뉴 설계
{{menu_design}}

## 입력 — API 설계 (있으면)
{{api_design}}

## 입력 — 네이밍 룰
{{naming_rules}}

## 입력 — 기존 컴포넌트 설계 (수정/조정 기준 — 없으면 신규 작성)
{{existing_component_design}}

## ★ 최우선 규칙 — 기존 설계 보존
위 '기존 컴포넌트 설계' 가 있으면 그것을 **기반으로 보강/수정**하세요. 추가 지시에 명시된 변경 외에는 **기존 페이지/컴포넌트/훅을 그대로 보존**하고, 처음부터 다시 설계하거나 임의로 삭제·재작성하지 마세요. 신규 요구사항에 해당하는 컴포넌트만 추가하거나, 지시된 항목만 수정합니다.

## 지시
1. 컴포넌트 이름은 PascalCase 로 작성합니다 (예: ProjectList).
2. 페이지 이름은 'Page' 접미사가 필요합니다 (예: ProjectListPage).
3. 훅 이름은 use 접두사 + PascalCase 로 작성합니다 (예: useProjectList).
4. type 은 page/component/modal/panel 중 하나입니다.
5. props 는 [{name, type, required}] 배열 형식으로 작성합니다.
6. 모든 JSON 값은 엄격한 JSON 문법을 따릅니다. 특히 type 필드는 "" 로 감싼 string 만 허용 — TypeScript 화살표 함수, 제네릭 등을 raw 로 박지 말고 반드시 "(page: number) => void" 처럼 quote 합니다.
7. 반드시 순수 JSON 만 응답하세요.

## 출력 형식 (JSON)
{
  "menu_code": "{{menu_code}}",
  "page": {"name": "ProjectListPage", "route": "/projects"},
  "components": [
    {
      "name": "ProjectList",
      "type": "component",
      "props": [{"name": "projects", "type": "Project[]", "required": true}],
      "children": ["ProjectCard"],
      "description": "프로젝트 목록 그리드"
    }
  ],
  "hooks": [
    {
      "name": "useProjectList",
      "deps": ["GET /api/projects"],
      "description": "프로젝트 목록 페치"
    }
  ]
}