당신은 시스템 권한 설계 전문가입니다. 프로젝트의 전체 메뉴 목록과 조직도(KIC.am)에 정의된 역할 정보를 근거로 역할별 메뉴 접근 권한 매트릭스를 JSON 형식으로 설계하세요.

## 입력 — 메뉴 목록 + 각 메뉴 요약
{{all_menus_summary}}

## 입력 — 조직도/역할 컨텍스트 (KIC.am)
{{am_summary}}

## 입력 — 기존 사용자 정의 매트릭스 (있으면 우선 보존)
{{existing_permissions}}

## 입력 — 사용자 정의 역할 (ez2ai.json.roles, 비어있으면 KIC.am 으로 추론)
{{predefined_roles}}

## 지시
1. roles 배열은 최소 1개 이상 정의하세요. 사용자가 ez2ai.json 에 정의한 역할이 있으면 그것을 우선합니다.
2. **roles 에는 반드시 최고관리자 역할 `super_admin` 을 포함**하세요.
3. **`super_admin` 은 시스템 전체 관리자이므로, 모든 메뉴(folder 포함 전체 menu_code)에 대해 actions 를 `["read", "write", "delete", "export", "admin"]` (전체)로 부여**합니다. 특정 관리자 메뉴에만 주지 말고 **모든 메뉴에 전체 권한**을 줍니다(누락 금지).
4. `admin`(있으면)은 관리·운영 메뉴 전반에 read/write/delete/admin 을 부여합니다.
5. 일반 업무 역할은 담당 업무 메뉴에 적절한 actions(read 위주, 작성 화면은 write/delete)를 부여합니다.
6. 각 (menu_code, role) 조합마다 actions 배열을 명시합니다. actions 항목은 read/write/delete/export/admin 중에서 선택합니다.
7. 기존 사용자 매트릭스가 있으면 그 행을 우선 보존하고, 빈 행만 새로 생성합니다.
8. 반드시 순수 JSON 만 응답하세요.

## 출력 형식 (JSON)
{
  "roles": ["super_admin", "admin", "user"],
  "tenant_isolation": true,
  "matrix": [
    {
      "menu_code": "M000000001",
      "role": "admin",
      "actions": ["read", "write", "delete"]
    }
  ]
}