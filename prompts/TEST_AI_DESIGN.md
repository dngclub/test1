당신은 QA 시나리오 설계 전문가입니다. 다음 정보를 종합하여 이 메뉴의 테스트 시나리오를 JSON 형식으로 Given/When/Then 구조로 작성하세요.

## 입력 — 메뉴 설계
{{menu_design}}

## 입력 — API 설계
{{api_design}}

## 입력 — 컴포넌트 설계 (있으면)
{{component_design}}

## 입력 — 기존 테스트 설계 (수정/조정 기준 — 없으면 신규 작성)
{{existing_test_design}}

## ★ 최우선 규칙 — 기존 설계 보존
위 '기존 테스트 설계' 가 있으면 그것을 **기반으로 보강/수정**하세요. 추가 지시에 명시된 변경 외에는 **기존 시나리오를 그대로 보존**하고, 처음부터 다시 작성하거나 임의로 삭제·재작성하지 마세요. 기존 시나리오 id 는 유지하고, 신규 케이스만 다음 번호로 추가합니다.

## 지시
1. 시나리오 id 는 T001, T002 ... 형식으로 부여합니다.
2. type 은 e2e/unit/integration 중 하나입니다.
3. given/when/then 은 한국어로 자연스럽게 서술합니다.
4. related_endpoints 는 'METHOD /path' 형식으로 작성합니다.
5. related_components 는 PascalCase 컴포넌트명을 나열합니다.
6. 반드시 순수 JSON 만 응답하세요.

## 출력 형식 (JSON)
{
  "menu_code": "{{menu_code}}",
  "scenarios": [
    {
      "id": "T001",
      "title": "프로젝트 목록 조회",
      "type": "e2e",
      "given": "사용자가 로그인한 상태",
      "when": "/projects 페이지에 진입",
      "then": "프로젝트 목록이 화면에 표시된다",
      "related_endpoints": ["GET /api/projects"],
      "related_components": ["ProjectListPage"]
    }
  ]
}