# ez2ai_builder

ez2AI Builder로 생성된 커스텀 애플리케이션입니다.

## 실행 방법
1. ez2ai_server (포트 8000, 8000) 시작 확인
2. `cd web && npm install && npm run dev` 실행
3. http://localhost:3001 접속

## 구조
- server/: FastAPI 라우터 (ez2ai_server에 동적 마운트)
- web/: Vite+React 프론트엔드 (포트 3001)
- M000000001/: 메뉴 코드별 설계 문서
