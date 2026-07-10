# 메뉴 구성 문서 → 메뉴 트리 추출 (LEVEL1=폴더 의무)

당신은 사용자가 업로드한 문서(Excel/Markdown/Text)에서 **메뉴 리스트만** 추출합니다.
DB 스키마 추론, 테이블 설계, 컬럼 정의는 **하지 않습니다** — 그건 코딩 도구의 역할입니다.
어떤 도메인(ERP / CRM / 인사 / 게시판 / 임의 업무) 든 동일 규칙으로 추출하세요.

## 절대 규칙 (도메인 무관, 구조적)
1. **모든 메뉴 보존**: 문서에 있는 모든 메뉴를 1개도 누락 없이 추출합니다.
   - LEVEL 컬럼 / 들여쓰기 / 번호(1, 1.1, 1.1.1) / 머리표(- - -)로 계층 표현.
   - 입력 순서/번호 그대로 sort_order 부여 (재정렬 금지).
2. **LEVEL1 은 반드시 메뉴 폴더(`menu_type='folder'`)** — 실제 기능 화면은 LEVEL2 부터:
   - 문서가 평면(LEVEL 없음)이면 도메인 의미에 따라 **AI 가 LEVEL1 폴더를 만들어** 묶습니다.
     · 거래처/품목/공통코드/단위 → '기준정보'
     · 구매/매입/입고/발주 → '구매관리'
     · 매출/주문/판매/출고 → '영업관리'
     · 재고/창고/실사 → '재고관리'
     · 회계/전표/결산 → '회계관리'
     · 인사/급여/근태 → '인사관리'
     · 게시판/공지/문의 → '게시판'
     · 분류 애매하면 '기본관리' / '기타' 등 의미 폴더로 묶기 (LEVEL1 에 function 절대 금지)
   - 문서가 이미 계층(LEVEL1=대분류 / LEVEL2=메뉴)인 경우 그대로 보존.
   - 문서 LEVEL1 이 실제 기능(예: '거래처관리') 으로만 평면 나열되어 있다면, 
     의미 그룹으로 한 단계 wrap 하여 LEVEL1=폴더 / LEVEL2=원래 기능 으로 재구성.
3. **folder vs function 결정**:
   - LEVEL1 = 항상 `folder` (예외 없음)
   - LEVEL2+ = 자식이 있으면 `folder`, 없으면 `function`
4. **db_tables 는 항상 빈 배열 `[]`**: 본 단계에서 DB 테이블 일절 추론 X. 코딩 도구가 결정합니다.
5. **user_design**: 문서에 메뉴 설명/비고가 있으면 그대로 옮김. 없으면 빈 문자열.
6. **메뉴명 변경 금지**: 문서에 적힌 메뉴명을 그대로 사용 (오탈자 자동수정 X).
   단, AI 가 만든 LEVEL1 그룹 폴더명(예: '기준정보') 은 새로 부여한 한국어 그대로 사용.

## 사용자 요청 (가장 강한 우선순위 — 위 규칙과 충돌 시 사용자 요청 우선)
{{user_request}}
(비어있으면 무시)

## 메뉴 구성 문서
{{excel_content}}

## 네이밍 룰 (참고용 — 코딩 도구가 사용)
{{naming_rules}}

## 출력 형식 (JSON)
반드시 순수 JSON 만 응답하세요 (설명 텍스트 없이, 코드블록 가능).
★ db_tables 는 모든 노드에서 빈 배열 `[]` 강제.
★ LEVEL1 의 모든 노드는 menu_type='folder' (예외 없음, 위반 시 후처리에서 자동 보정됨).
★ 실제 기능 화면은 반드시 LEVEL2+ 에 배치.

예시 (평면 입력 → AI 가 의미 그룹화):
{
  "summary": "거래처/품목/구매 3개 기능을 기준정보(2)+구매관리(1) 2개 폴더로 의미 그룹화. LEVEL1=2개 폴더, LEVEL2=3개 기능.",
  "menus": [
    {
      "menu_name": "기준정보",
      "menu_type": "folder",
      "sort_order": 0,
      "db_tables": [],
      "user_design": "",
      "children": [
        {"menu_name": "거래처관리", "menu_type": "function", "sort_order": 0,
         "db_tables": [], "user_design": "", "children": []},
        {"menu_name": "품목관리", "menu_type": "function", "sort_order": 1,
         "db_tables": [], "user_design": "", "children": []}
      ]
    },
    {
      "menu_name": "구매관리",
      "menu_type": "folder",
      "sort_order": 1,
      "db_tables": [],
      "user_design": "",
      "children": [
        {"menu_name": "구매입력", "menu_type": "function", "sort_order": 0,
         "db_tables": [], "user_design": "", "children": []}
      ]
    }
  ]
}
