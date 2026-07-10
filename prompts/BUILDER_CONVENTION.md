## 회사 컨벤션 (자식 프로젝트 가드레일)

- 본체 폴더 (`/ez2ai_server/server/`) 직접 수정 금지
- 자식 프로젝트 내 가드레일 5종 파일 수정 금지: `main.tsx`, `AuthProvider.tsx`, `ProtectedRoute.tsx`, `server/routers/__init__.py`, `vite.config.ts`
- 새 라우터는 `server/routers/{prefix}.py` 단일 파일 (자동 디스커버리)
- 새 페이지는 `web/src/M0000000XX/{Domain}Page.tsx`
