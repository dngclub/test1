# ez2AI Builder SHARED GUIDE

> **이 파일은 ez2ai_builder 개발 전 반드시 읽어야 할 공통 기준서입니다.**
> 마지막 업데이트: 2026-05-19

## ★ 언어 (필수)

모든 답변·설명·코드 주석·문서·커밋 메시지는 **반드시 한국어로 작성**한다.
Always respond in Korean. (코드 식별자·API·라이브러리명 등 고유명사는 원문 유지)

---

## 0.0. AI 코딩 도구 호환 (Claude / Codex / Qwen / Gemini)

본 프로젝트의 진입 가이드(`CLAUDE.md` / `AGENTS.md` / `QWEN.md` / `GEMINI.md`)는
동일 본문 4 alias 로 저장되어 어떤 도구든 자기 표준 진입 파일을 자동 인식합니다.

| 본문 어휘 | Claude Code | OpenAI Codex CLI | Qwen Code | Gemini CLI |
|----------|-------------|------------------|-----------|------------|
| 파일 읽기 | `Read` | `read_file` | `read_file` | `read_file` |
| 파일 편집 | `Edit` / `Write` | `apply_patch` | `write_file` | `replace` / `write_file` |
| 셸 실행 | `Bash` / `PowerShell` | `shell` | `run_shell_command` | `run_shell_command` |
| 코드 검색 | `Grep` | `ripgrep` | `search_file_content` | `search_file_content` |
| 파일 검색 | `Glob` | `find` / `fd` | `glob` | `glob` |

문서가 "파일 읽기" 라고 지시하면 사용 중인 도구의 해당 동작을 호출하세요.

규칙:
- **단일 SSOT**: 가이드를 수정해야 하면 본체(ez2ai_server) 의 자동 생성 템플릿을
  고치세요. 자식 프로젝트의 4 alias 를 직접 편집하면 다음 저장 시 덮어쓰입니다.
- **도구별 명령 이름 metadata 금지**: 본문에 "`Bash` 로 실행" 처럼 도구 한정
  표현을 새로 추가하지 말 것. "셸 실행" 같은 중립 어휘 사용.
- **체크리스트는 도구 비종속**: "Read 도구 호출 여부" 가 아니라 "파일을 실제로
  읽었는지" 로 자기 검증.

---

## 0. ⛔ AI 개발 가드레일 — 절대 수정 금지 / 표준 절차

### 0.1 절대 수정 금지 파일 (수정 시 인증·라우팅·인증 race condition 재발)

| 파일 | 역할 | 수정 시 발생하는 결함 |
|------|------|---------------------|
| `web/src/main.tsx` | 본체 → iframe 진입 시 URL fragment(`#token=...`) 를 React 렌더 **전** 동기적으로 localStorage 에 적용 | "최초 클릭 시 로그인 페이지 깜빡임" race condition 재발 |
| `web/src/M000000000/auth/AuthProvider.tsx` | axios 인터셉터 + useState 초기값으로 localStorage 토큰 즉시 반영 | 401 / 인증 헤더 누락 |
| `web/src/M000000000/auth/ProtectedRoute.tsx` | `isAuthenticated || localStorage` 이중 체크 (login → navigate race condition 방어) | 로그인 직후 자기 자신으로 무한 redirect |
| `server/routers/__init__.py` | `*.py` 디렉토리 자동 디스커버리 + `sys.modules` 등록 | Pydantic `is not fully defined` / 라우터 미마운트 |
| `web/vite.config.ts` | `server/routers/*.py` 디렉토리 자동 스캔 → proxy 자동 분기 | 자식 backend 404 |

위 5개 파일은 표준 패턴이 정확히 설계되어 있습니다. **단순화·리팩토링·주석
정리도 금지.** 변경이 꼭 필요하면 그 사유와 영향 범위를 사람에게 먼저 확인.

### 0.2 신규 메뉴 추가 표준 4단계 (이 순서·범위만 작업)

| # | 파일 | 작업 |
|---|------|------|
| 1 | 업무 DB 접근 | `from server._ez2ai_db import get_psycopg2_conn` + raw SQL (§11/§13). **`server/models.py`(ORM)·async `get_db` 생성/사용 금지** — ImportError·오연결 유발. |
| 2 | `server/routers/{prefix}.py` | `APIRouter(prefix='/api/{prefix}', ...)` — 파일명 ↔ prefix 일치(`/api/v1/` 금지). 보호 엔드포인트 `Depends(verify_with_host)`. Pydantic 참조 모델을 사용처보다 위에. |
| 3 | `web/src/lib/api.ts` | 없으면 표준 패턴(아래 0.4 참조)으로 한 번만 생성. 이후 모든 페이지가 이 wrapper 사용 |
| 4 | `web/src/M0000000XX/{Domain}Page.tsx` | 페이지 컴포넌트. **`api` import 사용** (직접 `axios` 인스턴스 금지) |

→ `web/src/App.tsx` 는 **본체 patch 대상 — 수정 금지**. `MenuPage` 가 `import.meta.glob('../../M*/*.tsx')` 로 자식 폴더를 자동 디스커버리하여 mount 한다. **메뉴 폴더만 만들면 라우트/사이드바 자동 노출.**
→ `server/routers/__init__.py` 와 `vite.config.ts` 도 **자동 디스커버리** 이므로 절대 수정 불필요.
→ 작업 후: **자식 backend + frontend 재시작** (자동 디스커버리는 시작 시 1회).

### 0.3 인증 흐름 — race condition 방지 (반드시 이해)

```
[본체 SPA]  localStorage(3000) ← 로그인 토큰
   │  사용자가 확장 메뉴 클릭
   ▼
[본체 ExtensionFrame]  iframe src = http://localhost:13001/extensions/...#token=X&user=Y
   │  cross-origin → 자식 SPA 시작
   ▼
[자식 main.tsx]  ← ① 동기적으로 fragment → localStorage(13001) 저장 + replaceState
   │   (절대 useEffect 안에서 처리 금지 — ProtectedRoute race condition)
   ▼
[자식 AuthProvider]  useState(localStorage.getItem('auth_token')) → 첫 렌더부터 인증 상태
   ▼
[자식 ProtectedRoute]  isAuthenticated || localStorage 이중 체크 → 통과
   ▼
[자식 페이지 렌더]
```

`main.tsx` 의 **동기 fragment 처리** 가 빠지면 자식 useState 초기값이 null →
ProtectedRoute 가 `/login` redirect → 사용자가 보는 "최초 클릭 시 로그인 화면" 버그.

### 0.4 `web/src/lib/api.ts` 표준 패턴 (신규 페이지 axios wrapper)

신규 페이지에서 직접 `axios` 를 import 하지 말고 항상 이 wrapper 를 사용하세요.

```typescript
import axios from 'axios'

// 자식 backend (BACKEND_PORT) — vite proxy 가 /api/{자식 prefix} 를 forward.
// 본체 공통 API (/api/auth 등) 는 /api fallback 으로 본체 8000 으로 감.
//
// 84 차 (2026-05-19) — 본체 단일 진입 시 vite `base` (`/_child/{code}/`) 가
// path prefix 로 적용된다. baseURL 을 `import.meta.env.BASE_URL` 로 설정하여
// 자식 SPA 코드가 변경 없이 `/api/...` 호출 시 자동으로 prefix 결합.
//   dev (base='/'): baseURL='' → /api/...
//   본체 단일 진입 (base='/_child/P00000/'): baseURL='/_child/P00000' → /_child/P00000/api/...
const api = axios.create({
  baseURL: (import.meta.env.BASE_URL || '/').replace(/\/$/, ''),
  timeout: 30000,
})

// 요청 인터셉터 — 최신 토큰을 헤더에 주입 (axios v1.x AxiosHeaders .set() 필수)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token && token !== 'null' && token !== 'undefined') {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

// 응답 인터셉터 — 401(토큰 만료/무효) 시 세션 정리 후 /login 자동 유도 (무한 루프 방지).
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_info')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

export default api
```

페이지에서:
```typescript
import api from '../lib/api'
// ...
const res = await api.get('/api/customers', { params: { page, size } })
```

### 0.5 `App.tsx` 라우트 추가 패턴 (신규 메뉴 진입점)

```typescript
// 본체 사이드바 "확장 기능" → 자식 iframe 진입 경로
<Route
  path="/extensions/M0000000XX"
  element={
    <ProtectedRoute>
      <Layout><{Domain}Page /></Layout>
    </ProtectedRoute>
  }
/>
```

- 반드시 `<ProtectedRoute>` 로 감싸기 (인증 미적용 시 토큰 없이 진입 가능)
- 반드시 `<Layout>` 으로 감싸기 (사이드바·헤더 유지)
- 경로는 `/extensions/{메뉴_코드}` 와 정확히 일치 (본체 메뉴 트리의 `href` 와 매칭)

---

## 1. 시스템 아키텍처 개요

```
[브라우저]
    │  http://localhost:{FRONTEND_PORT}            (env_manager 가 동적 할당)
    ▼
ez2ai_builder web  (Vite, FRONTEND_PORT)            ← 이 프로젝트 frontend
    │  vite proxy 분기:
    │   ├ /api/{자식 prefix} → 자식 backend
    │   └ /api/{공통 ez2AI} → 본체 ez2AI backend
    ▼                              ▼
자식 backend           본체 ez2ai_server (FastAPI, 8000)
(FastAPI, BACKEND_PORT)  ├ /api/auth, /api/license, /api/users 등 공통 API
├ /api/customers          └ JWTAuthMiddleware: 모든 /api/* 인증 검사
├ /api/items
└ /api/purchases ...        모두 공유 PostgreSQL (포트 5432)
                              ├── public 스키마          (ez2ai 사용자·테넌트)
                              └── simbizlocal 스키마     (자식 앱 테이블 — 직접 설계)
```

- 자식 비즈니스 API (`/api/customers`, `/api/items`, `/api/purchases` 등) → 자식 backend (BACKEND_PORT)
- 본체 공통 API (`/api/auth/*`, `/api/license/*`, `/api/users` 등) → 본체 ez2ai_server (8000)
- 브라우저는 vite (FRONTEND_PORT) 하나에만 접속하므로 CORS 문제 없음

---

## 2. 개발환경 설정

### vite.config.ts 프록시 — 자동 디스커버리

`web/vite.config.ts` 는 시작 시 `server/routers/*.py` 디렉토리를 스캔해서
자식 backend 로 forward 할 prefix 를 **자동 추출** 합니다. 따라서 새 자식
API 추가 시 vite.config.ts 는 건드릴 필요가 없습니다.

```
[브라우저]  /api/{prefix}  →  vite proxy 분기:
                              ├ prefix ∈ {server/routers/*.py 의 파일명} → 자식 backend (BACKEND_PORT)
                              └ 나머지                                    → 본체 ez2AI backend (8000)
```

환경변수 override:
- `CHILD_API_PREFIXES=orders,invoices,...` (콤마구분) — 자동 스캔 무시하고 명시 지정
  (파일명과 router prefix 가 다른 예외 케이스용)

### 자식 라우터 추가 — 한 곳만 수정 (자동 디스커버리)

새 자식 API `/api/orders` 추가 시 **`server/routers/orders.py` 파일 하나만** 생성하면 됩니다.

- `server/routers/__init__.py` 가 디렉토리 전체를 자동 import + mount
- `web/vite.config.ts` 가 디렉토리를 자동 스캔해 proxy 분기

**컨벤션**: 파일명(`orders.py`) ↔ router prefix(`/api/orders`) 일치 필수.
일치시킬 수 없는 경우만 `CHILD_API_PREFIXES` 환경변수로 override.

> 자동 디스커버리는 vite/uvicorn 시작 시 1회 실행 → 새 라우터 파일 추가 시 **자식 backend + frontend 재시작 필요**.

### ⚠️ 변경 후 재시작 체크리스트

| 변경 파일 | 필요 조치 |
|-----------|----------|
| `server/routers/*.py` | **자식 backend 재시작 필요** (uvicorn --reload 적용 안 되는 일부 변경) |
| `server/routers/__init__.py` | **자식 backend 재시작 필요** |
| `web/src/**/*.tsx`, `*.ts`, `*.css` | Vite HMR 자동 적용 (실패 시 브라우저 Ctrl+Shift+R) |
| `.env` (자식) | **자식 backend 재시작 필요** |

> 자식 backend 는 본체와 별도 프로세스로 동작합니다 (port: BACKEND_PORT 환경변수).
> 본체 ez2ai_server (port 8000) 는 자식 backend 를 import 하지 않으므로,
> 자식 코드 변경은 본체 재시작 없이 자식만 재시작하면 됩니다.

---

## 3. ⚠️ [CRITICAL] API 인증 — 401 Unauthorized 방지 필수 규칙

**이 규칙을 어기면 모든 API 요청이 아래와 같이 401로 실패합니다:**
```
GET  /api/customers  → 401 Unauthorized
POST /api/orders     → 401 Unauthorized
```

### 규칙 1: App.tsx 최상위를 반드시 AuthProvider로 감싸세요
```typescript
// ✅ 올바른 App.tsx
import { AuthProvider } from './M000000000/auth/AuthProvider'

function App() {
  return (
    <AuthProvider>       {/* ← 없으면 토큰이 axios에 설정되지 않음 */}
      <BrowserRouter>
        <Routes>...</Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

// ❌ 잘못된 예 — AuthProvider 없음 → 모든 API 401
function App() {
  return (
    <BrowserRouter><Routes>...</Routes></BrowserRouter>
  )
}
```

### 규칙 2: 모든 메뉴 컴포넌트의 표준 useEffect + API 호출 패턴

> ⚠️ **axios v1.x 주의**: `axios.defaults.headers.common` 설정만으로는 부족할 수 있습니다.
> 각 axios 호출마다 명시적으로 `headers: { Authorization: \`Bearer ${token}\` }` 를 전달하세요.

```typescript
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const MyPage = () => {
  const navigate = useNavigate()

  // ✅ 올바른 fetchData — 매 호출마다 localStorage에서 토큰을 읽어 명시적으로 전달
  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('auth_token')
    if (!token || token === 'null') { navigate('/login', { replace: true }); return }
    try {
      const res = await axios.get('/api/my_items', {
        params: { ... },
        headers: { Authorization: `Bearer ${token}` },  // ← 명시적 헤더 (필수)
      })
    } catch (err: any) {
      if (err.response?.status === 401) { navigate('/login', { replace: true }); return }
      showToast('error', '목록을 불러오는 데 실패했습니다.')
    }
  }, [navigate, showToast])

  // ✅ 올바른 useEffect — defaults도 설정하고 fetchData 호출
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) { navigate('/login', { replace: true }); return }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`  // defaults 보조 설정
    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

// ❌ 절대 금지 ① — 토큰 확인 없이 바로 API 호출
useEffect(() => {
  axios.get('/api/customers')  // → Authorization 헤더 없음 → 401
}, [])

// ❌ 절대 금지 ② — defaults만 설정하고 명시적 헤더 없이 호출 (axios v1.x에서 불안정)
useEffect(() => {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  axios.get('/api/customers')  // 인터셉터 미동작 시 401 가능
}, [])
```

### 규칙 3: 모든 API catch 블록에서 401을 처리하세요
```typescript
// ✅ 올바른 catch 패턴 — 401이면 로그인 페이지로
try {
  const res = await axios.get('/api/customers')
} catch (err: any) {
  if (err.response?.status === 401) { navigate('/login', { replace: true }); return }
  if (err.response?.status === 403) { showToast('error', '권한이 없습니다.'); return }
  showToast('error', err.response?.data?.detail || '오류가 발생했습니다.')
}

// ❌ 잘못된 예 — 401을 그냥 토스트만 표시 (만료 토큰으로 무한 오류)
} catch {
  showToast('error', '목록을 불러오는 데 실패했습니다.')
}
```

### 규칙 4: localStorage 키 이름을 반드시 준수하세요
- 인증 토큰: `localStorage.getItem('auth_token')` ← 이 키 고정 (변경 금지)
- 사용자 정보: `localStorage.getItem('user_info')`
- 마지막 테넌트: `localStorage.getItem('last_tenant_code')`

### 401 오류 시 진단 체크리스트
1. App.tsx에 `<AuthProvider>` 감싸기 여부 확인
2. 각 axios 호출에 `headers: { Authorization: \`Bearer ${token}\` }` 명시 여부 확인
3. localStorage에 `auth_token` 키로 올바른 JWT가 저장되어 있는지 확인
   - `localStorage.getItem('auth_token')` 값이 `null`, `"null"`, `"undefined"` 가 아닌지 확인
4. **ez2ai_server가 재시작되었는지 확인** (라우터 변경 후 재시작 필수)
5. 토큰 만료 여부 확인 (만료 시 재로그인 필요)
6. **AuthProvider.tsx 인터셉터가 `config.headers.set()` API를 사용하는지 확인**
   - `config.headers['Authorization'] = ...` 방식 → axios v1.x에서 미동작 가능 → **반드시 `config.headers.set()`으로 수정**
7. **simbizlocal 스키마에 ez2ai 사용자 권한이 있는지 확인** (섹션 11 참조)
   - 권한 없으면 API 호출 시 500 오류 (401이 먼저 해결되면 다음으로 나타남)

---

## 4. 인증 - 로그인 표준 패턴

### 로그인 API
- POST `/api/auth/login`
- Body: `{ tenant_code, user_id, password }`
- Response: `{ success, token, session_id, user }` ← **필드명 주의: `token` (access_token ❌), `user` (user_info ❌)**

### ✅ LoginPage 표준 구현 패턴
```typescript
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import axios from 'axios'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()             // ← useAuth().login() 반드시 사용

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await axios.post('/api/auth/login', {
        tenant_code: tenantCode,
        user_id: userId,
        password,
      })
      localStorage.setItem('last_tenant_code', tenantCode)  // 자동완성용
      login(res.data.token, res.data.user || {}) // ← 필드명: token / user (access_token / user_info 아님!)
      navigate('/home', { replace: true })  // replace:true → 뒤로가기로 로그인 화면 못 돌아감
    } catch (err: any) {
      setError(err.response?.data?.detail || '로그인에 실패했습니다.')
    }
  }
}
```

### ❌ 금지 패턴 — localStorage 직접 설정
```typescript
// ❌ 절대 금지 — login() 함수를 거치지 않으면 axios 헤더가 설정되지 않음
localStorage.setItem('auth_token', res.data.token)
navigate('/home')
// → ProtectedRoute에서 isAuthenticated가 false(React 상태 미업데이트) → /login으로 되돌아감
```

---

## 5. JWT 토큰 구조 & localStorage 항목

| 키 | 설명 | 필수 여부 |
|----|------|-----------|
| `auth_token` | JWT Bearer 토큰 (HS256, 24시간 만료) | 필수 |
| `user_info` | JSON: `{ user_id, user_name, is_super_admin, tenant_id, group_id }` | 필수 |
| `last_tenant_code` | 마지막 로그인 테넌트 코드 (자동완성용) | 선택 |

---

## 6. AuthProvider / ProtectedRoute 동작 원리

### AuthProvider (`web/src/M000000000/auth/AuthProvider.tsx`)

**AuthProvider가 하는 일:**
1. **모듈 로드 시 즉시** (컴포넌트 마운트 전) — localStorage의 토큰으로 axios 기본 헤더 설정
2. **axios request interceptor 등록** — 모든 요청 직전에 localStorage에서 최신 토큰 자동 주입
3. `login(token, userInfo)` — localStorage + React state + axios defaults 동시 설정
4. `logout()` — localStorage 삭제 + React state 초기화 + axios 헤더 삭제

```typescript
// login() 함수가 처리하는 것들:
const login = (newToken: string, newUserInfo: any) => {
  localStorage.setItem('auth_token', newToken)           // 1. localStorage 저장
  localStorage.setItem('user_info', JSON.stringify(...)) // 2. user_info 저장
  setToken(newToken)                                     // 3. React 상태 업데이트
  setUserInfo(newUserInfo)
  axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}` // 4. axios 헤더 설정
}

// ✅ 올바른 인터셉터 — axios v1.x AxiosHeaders 호환 (config.headers.set() 사용)
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token && token !== 'null' && token !== 'undefined') {
    config.headers.set('Authorization', `Bearer ${token}`)  // ← .set() 필수 (axios v1.x)
  }
  return config
})

// ❌ 잘못된 인터셉터 — axios v1.x AxiosHeaders에서 미동작 가능 → 401 발생
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers = config.headers ?? {}
    config.headers['Authorization'] = `Bearer ${token}`  // ← bracket notation 불안정
  }
  return config
})
```

> ⚠️ **axios v1.x 변경사항**: v1.0부터 `config.headers`는 `AxiosHeaders` 인스턴스입니다.
> 브래킷 표기법(`config.headers['Authorization'] = ...`)은 일부 환경에서 헤더가 실제 요청에
> 포함되지 않는 문제가 있습니다. **반드시 `config.headers.set('Authorization', ...)` 를 사용하세요.**

### ProtectedRoute (`web/src/M000000000/auth/ProtectedRoute.tsx`)

**이중 체크 패턴 (React 상태 배치 race condition 해결):**
```typescript
// login() 호출 후 navigate() 실행 시 React 상태가 아직 커밋되지 않을 수 있음
// → isAuthenticated만 체크하면 /login으로 되돌아가는 버그 발생
const hasToken = isAuthenticated || !!localStorage.getItem('auth_token')
//               ↑ React 상태     ↑ 동기적 localStorage (항상 최신)
if (!hasToken) return <Navigate to="/login" replace />
```

> ⚠️ **주의:** ProtectedRoute는 토큰의 **존재 여부**만 확인합니다 (만료 여부 미확인).
> 만료된 토큰으로 API 호출 시 서버에서 401이 반환되므로, 반드시 catch 블록에서 401 처리하세요.

---

## 7. 현재 사용자 정보 조회
```typescript
// 저장된 user_info 사용 (추가 API 호출 불필요)
const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}')

// 또는 서버에서 최신 정보 조회
// GET /api/users/me  (Authorization: Bearer {token})
```

---

## 8. 사용자 관리 API
- `GET    /api/users`              — 사용자 목록
- `POST   /api/users`              — 사용자 생성
- `PUT    /api/users/{id}`         — 사용자 수정
- `POST   /api/users/{id}/change-password` — 비밀번호 변경

---

## 9. 파일 업로드
- `POST /api/upload/files` (multipart/form-data)

---

## 10. ez2ai_builder 권한 구현 패턴
- `simbizlocal.ez_menus`: 메뉴 카탈로그 (ez2AI Builder 자동 생성)
- `simbizlocal.ez_roles`: 권한 그룹 (직접 구현)
- `simbizlocal.ez_menu_permissions`: 메뉴-권한 매핑 (직접 구현)
- `simbizlocal.ez_user_roles`: 사용자-권한 매핑 (직접 구현)

---

## 11. DB - simbizlocal 스키마 테이블 생성 패턴

> ✅ **업무 라우터는 동기 psycopg2 + 등록 DB 헬퍼(`get_psycopg2_conn`)로 통일한다.**
> ⚠️ **라우터에서 asyncpg / async SQLAlchemy(`get_db`) 를 쓰지 말 것** — 업무 DB 접근은 sync psycopg2 하나로만 (async 는 자체 auth DB·alembic 전용). 라우터가 async 경로를 섞으면 이벤트루프 충돌·미마운트로 이어진다.

### 스키마 권한 부족 시 (수동 GRANT·비밀번호 하드코딩 금지)

업무 DB 의 자격증명·`search_path` 는 본체 등록 DB 정보로 **헬퍼(`get_psycopg2_conn`)가 자동 처리**한다.
코드에 비밀번호를 하드코딩하거나 `postgres` 마스터 계정으로 수동 `GRANT` 하지 말 것(CORE §0.1 위반).
등록 DB 계정에 스키마 생성 권한이 없어 `CREATE TABLE ... simbizlocal.xxx` 가 거부되면,
**본체 [개발 환경설정 > 데이터베이스]에서 권한 있는 계정으로 등록/수정하도록 사용자에게 보고**한다.

### 표준 라우터 파일 패턴 (`server/routers/my_module.py`)

```python
"""
my_module API — simbizlocal.my_table
GET    /api/my_items              목록 조회
POST   /api/my_items/bulk-delete  다중 삭제  ← POST /{id} 보다 반드시 앞에 등록
POST   /api/my_items              신규 등록
PUT    /api/my_items/{id}         수정
DELETE /api/my_items/{id}         삭제
"""
import psycopg2
import psycopg2.extras
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from server._ez2ai_db import get_psycopg2_conn          # 업무 DB 는 반드시 빌더 등록 헬퍼 사용(하드코딩 금지)
from server.host_auth import HostUser, verify_with_host  # 보호 엔드포인트 인증(embedded/standalone 자동 분기)

router = APIRouter()

# ── Pydantic 모델 ──────────────────────────────────────
class ItemIn(BaseModel):
    name: str
    description: Optional[str] = None

class BulkDeleteRequest(BaseModel):
    ids: List[int]

# ── DB 유틸 ───────────────────────────────────────────
def _conn():
    """업무 DB 연결 — 빌더 등록 DB 헬퍼(자동 복호화·search_path). CORE §0.1 / 아래 §13 참조."""
    return get_psycopg2_conn()

def _ensure_table(cur):
    """테이블이 없으면 생성 — GET/POST 엔드포인트 첫 진입 시 호출"""
    cur.execute("""
        CREATE TABLE IF NOT EXISTS simbizlocal.my_table (
            id          SERIAL       PRIMARY KEY,
            name        VARCHAR(255) NOT NULL,
            description VARCHAR(500)
        )
    """)

# ── 엔드포인트 ────────────────────────────────────────

@router.get("/api/my_items")
def list_items(
    keyword: str = Query(default=""),
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    user: HostUser = Depends(verify_with_host),  # 보호 엔드포인트 — 인증 강제(embedded/standalone 자동)
):
    # ← async def 아닌 def 사용 (psycopg2는 동기 라이브러리)
    conn = _conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            _ensure_table(cur)
            conn.commit()  # DDL 커밋 후 DML 진행
            offset = (page - 1) * size
            if keyword:
                like = f"%{keyword}%"
                cur.execute("SELECT COUNT(*) FROM simbizlocal.my_table WHERE name ILIKE %s", (like,))
                total = cur.fetchone()[0]
                cur.execute("SELECT * FROM simbizlocal.my_table WHERE name ILIKE %s ORDER BY id LIMIT %s OFFSET %s",
                            (like, size, offset))
            else:
                cur.execute("SELECT COUNT(*) FROM simbizlocal.my_table")
                total = cur.fetchone()[0]
                cur.execute("SELECT * FROM simbizlocal.my_table ORDER BY id LIMIT %s OFFSET %s",
                            (size, offset))
            rows = cur.fetchall()
        return {"total": total, "page": page, "size": size,
                "items": [{"id": r["id"], "name": r["name"], "description": r["description"]} for r in rows]}
    finally:
        conn.close()


@router.post("/api/my_items/bulk-delete")
# ⚠️ 반드시 POST /api/my_items 보다 먼저 등록 (경로 충돌 방지)
def bulk_delete_items(body: BulkDeleteRequest, user: HostUser = Depends(verify_with_host)):
    if not body.ids:
        raise HTTPException(status_code=400, detail="삭제할 항목을 선택해주세요.")
    conn = _conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM simbizlocal.my_table WHERE id = ANY(%s)", (body.ids,))
        conn.commit()
        return {"message": f"{len(body.ids)}건이 삭제되었습니다."}
    finally:
        conn.close()


@router.post("/api/my_items", status_code=201)
def create_item(body: ItemIn, user: HostUser = Depends(verify_with_host)):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="이름은 필수 입력입니다.")
    conn = _conn()
    try:
        with conn.cursor() as cur:
            _ensure_table(cur)
            cur.execute(
                "INSERT INTO simbizlocal.my_table (name, description) VALUES (%s, %s) RETURNING id",
                (body.name.strip(), body.description),
            )
            new_id = cur.fetchone()[0]
        conn.commit()
        return {"id": new_id, "name": body.name, "description": body.description}
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail="이미 존재합니다.")
    finally:
        conn.close()


@router.put("/api/my_items/{item_id}")
def update_item(item_id: int, body: ItemIn, user: HostUser = Depends(verify_with_host)):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="이름은 필수 입력입니다.")
    conn = _conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE simbizlocal.my_table SET name=%s, description=%s WHERE id=%s",
                (body.name.strip(), body.description, item_id),
            )
            if cur.rowcount == 0:  # ← 수정된 행이 없으면 404
                raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")
        conn.commit()
        return {"id": item_id, "name": body.name, "description": body.description}
    finally:
        conn.close()


@router.delete("/api/my_items/{item_id}")
def delete_item(item_id: int, user: HostUser = Depends(verify_with_host)):
    conn = _conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM simbizlocal.my_table WHERE id=%s", (item_id,))
            if cur.rowcount == 0:  # ← 삭제된 행이 없으면 404
                raise HTTPException(status_code=404, detail="항목을 찾을 수 없습니다.")
        conn.commit()
        return {"message": "삭제되었습니다."}
    finally:
        conn.close()
```

> **psycopg2 핵심 주의사항:**
> - SQL 파라미터: `$1, $2` (asyncpg) → **`%s, %s`** (psycopg2)
> - `DictCursor`는 컬럼명을 **소문자**로 반환 (`r["custcd"]`, `r["custnm"]` 등)
> - `INSERT/UPDATE/DELETE` 후 반드시 `conn.commit()` 호출 (빠뜨리면 변경사항 유실)
> - `UniqueViolation` 예외 시 `conn.rollback()` 필수 후 re-raise
> - 항상 `finally: conn.close()`로 연결 반환
> - `_ensure_table`은 GET/POST 엔드포인트에서만 호출, PUT/DELETE는 테이블 존재를 전제

### server/routers/__init__.py — 자동 디스커버리 (수정 금지)

기본 생성된 `__init__.py` 가 동일 디렉토리의 모든 `*.py` (단, `__init__.py`
및 `_` 로 시작하는 파일 제외) 를 자동 import 하고, 모듈에 `router: APIRouter`
가 있으면 메인 라우터에 mount 합니다.

> AI 가 새 자식 API 를 추가할 때는 `server/routers/{prefix}.py` 파일 하나만
> 만들면 됩니다. `__init__.py` 는 절대 수정하지 마세요.
>
> ⚠️ 동적 importlib 로더는 `sys.modules` 등록 + Pydantic forward-ref 호환을
> 위한 표준 패턴으로 구현되어 있습니다. 임의로 단순화하면 `is not fully
> defined` PydanticUserError 가 다시 발생합니다.

### 업무 라우터 표준 = 위 "표준 라우터 파일 패턴" (헬퍼 + raw psycopg2)

업무(빌더 등록 DB) 라우터는 **위 패턴(`get_psycopg2_conn` + raw SQL + `verify_with_host`)** 을 그대로 따른다. 다른 방식으로 우회하지 말 것:

- **`server/models.py`(SQLAlchemy ORM)를 만들지 말 것.** 기본 골조는 이 파일을 생성하지 않으며, `from server.models import ...` 는 ImportError 로 라우터가 mount 되지 않는다. 업무 DB 는 ORM 이 아니라 **헬퍼 + raw SQL** 을 쓴다.
- **`server/database.py`(async `get_db`)는 자식 자체 auth DB 전용**이다. 업무 DB 조회에 쓰지 말 것(위 헬퍼 사용).
- 라우터 **파일명(`{prefix}.py`)과 엔드포인트 경로(`/api/{prefix}/...`)를 일치**시켜야 vite 자동 디스커버리에 잡힌다. 예: `orders.py` → `@router.get("/api/orders")`. `/api/v1/...` 같은 임의 prefix 는 embedded 프록시가 자식으로 못 보내 404.

### Pydantic 2.x 모델 작성 규칙 ⚠️ 자주 발생하는 함정

자식 라우터는 `from __future__ import annotations` 가 켜져 있어 어노테이션이
문자열로 평가됩니다. 중첩 generic (`list[XxxOut]`) 을 쓰는 모델은 다음을 지키세요:

1. **참조 대상 모델을 사용처보다 먼저 정의** — `XxxOut` 을 `XxxListResp` 위에.
2. **`server/routers/__init__.py` 의 자동 디스커버리는 수정하지 말 것** — `sys.modules` 등록이 빠지면 forward-ref resolve 실패.
3. **그래도 `is not fully defined` 가 나오면** → 모듈 마지막에 `XxxListResp.model_rebuild()` 한 줄 추가.

---

## 12. 메뉴 페이지 표준 개발 패턴

새 메뉴 페이지를 개발할 때 아래 **4단계**를 모두 완료해야 합니다.

### Step 1 — 파일 생성
```
web/src/M000000XXX/
├── MyPage.tsx    ← 메인 컴포넌트
└── MyPage.css    ← 스타일
```

### Step 2 — MyPage.tsx 표준 뼈대

```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import AppLayout from '../M000000000/home/AppLayout'
import './MyPage.css'

// ── 타입 ──────────────────────────────────────────────
interface MyItem {
  id: number
  name: string
  description: string | null
}

// ── 토스트 훅 ─────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState<{id: number; type: string; message: string}[]>([])
  const idRef = useRef(0)
  const show = useCallback((type: string, message: string) => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }, [])
  return { toasts, show }
}

// ── 메인 컴포넌트 ──────────────────────────────────────
const MyPage = () => {
  const navigate = useNavigate()
  const [items, setItems] = useState<MyItem[]>([])
  const [total, setTotal] = useState(0)
  const { toasts, show: showToast } = useToast()

  // ── 데이터 로드 ────────────────────────────────────
  // fetchList를 useEffect보다 먼저 선언 (참조 전 선언 규칙)
  // ⚠️ 매 호출마다 localStorage에서 토큰을 읽어 명시적 헤더로 전달 (axios v1.x 호환 필수)
  const fetchList = useCallback(async (page = 1, keyword = '') => {
    const token = localStorage.getItem('auth_token')
    if (!token || token === 'null') { navigate('/login', { replace: true }); return }
    try {
      const res = await axios.get('/api/my_items', {
        params: { page, keyword },
        headers: { Authorization: `Bearer ${token}` },  // ← 명시적 헤더 필수
      })
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch (err: any) {
      if (err.response?.status === 401) { navigate('/login', { replace: true }); return }
      showToast('error', '목록을 불러오는 데 실패했습니다.')
    }
  }, [navigate, showToast])

  // ── 마운트 시 인증 확인 + 초기 로드 ────────────────
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) { navigate('/login', { replace: true }); return }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`  // defaults 보조 설정
    fetchList()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 렌더 ─────────────────────────────────────────
  return (
    <AppLayout>
      <div className="mp-page">
        {/* 페이지 내용 */}
      </div>
    </AppLayout>
  )
}

export default MyPage
```

### Step 3 — App.tsx에 라우트 등록

```typescript
// web/src/App.tsx 에 추가
import MyPage from './M000000XXX/MyPage'

// <Routes> 내에 추가:
<Route path="/M000000XXX" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
```

### Step 4 — AppLayout.tsx의 MENU_GROUPS에 메뉴 항목 등록

`web/src/M000000000/home/AppLayout.tsx` 파일의 `MENU_GROUPS` 상수에 새 메뉴를 추가합니다.
**이 단계를 빠뜨리면 사이드바에 메뉴가 표시되지 않습니다.**

```typescript
// AppLayout.tsx의 MENU_GROUPS (예: 기준정보 모듈에 추가)
const MENU_GROUPS: Record<string, MenuItem[]> = {
  기준정보: [
    {
      icon: '📋', label: '기준정보', children: [
        { label: '거래처 관리', path: '/M000000002' },
        { label: '품목 관리',   path: '/M000000003' },
        { label: '새 메뉴명',   path: '/M000000XXX' },  // ← 여기에 추가
      ],
    },
  ],
  // ERP, MES, 설비 모듈도 동일 구조
}
```

**모듈별 메뉴 경로 현황:**
| 모듈 | 메뉴 | 경로 |
|------|------|------|
| 기준정보 | 거래처 관리 | `/M000000002` |
| 기준정보 | 품목 관리 | `/M000000003` |
| 기준정보 | 원자재 관리 | `/M000000004` |
| 기준정보 | 제품 관리 | `/M000000005` |
| ERP | BOM 관리 | `/M000000007` |
| ERP | 재고 현황 | `/M000000008` |
| ERP | 판매 주문 | `/M000000009` |
| ERP | 구매 관리 | `/M000000010` |
| MES | 설비 관리 | `/M000000012` |
| MES | 공정 관리 | `/M000000013` |
| MES | 재공품(WIP) | `/M000000014` |
| MES | 작업 지시 | `/M000000015` |
| 설비 | 설비 관리 | `/M000000017` |
| 설비 | 설비 모니터링 | `/M000000018` |

---

## 13. 공통 레이아웃 AppLayout 사용법

모든 메뉴 페이지는 `<AppLayout>`으로 감싸야 헤더와 사이드바가 표시됩니다.

```typescript
import AppLayout from '../M000000000/home/AppLayout'

// 사용법 — props 없이 children만 전달
return (
  <AppLayout>
    <div className="my-page">
      {/* 페이지 고유 콘텐츠 */}
    </div>
  </AppLayout>
)
```

**AppLayout 특징:**
- `location.pathname`으로 현재 경로를 감지하여 사이드바 메뉴 **자동** 하이라이트
- 헤더: 뒤로/앞으로 버튼, 로고, 날짜, 테넌트 드롭다운, 설정 버튼
- 사이드바: 모듈탭 (기준정보/ERP/MES/설비), 아바타+사용자명, 검색, 접이식 메뉴 목록, 로그아웃
- CSS 변수 접두사: `--al-*`, 브랜드색: `--al-brand: #003087`

---

## 14. 백엔드 JWT 인증 미들웨어 동작 원리

ez2ai_server의 `JWTAuthMiddleware`는 **모든 HTTP 요청**에 대해 다음 순서로 동작합니다:

```
요청 도착
   │
   ├─ PUBLIC_ENDPOINTS? (/api/auth/login 등) → 인증 없이 통과
   ├─ PUBLIC_PREFIXES? (/api/upload/ 등)     → 인증 없이 통과
   ├─ SPA 라우트? (/ /home 등 /api 아닌 경로) → 인증 없이 통과
   │
   └─ 그 외 모든 /api/* 경로 → JWT 검증
         │
         ├─ Authorization 헤더 없음 → 401 "인증이 필요합니다"
         ├─ 토큰 만료/유효하지 않음 → 401 "토큰이 유효하지 않거나 만료되었습니다"
         └─ 유효한 토큰 → 다음 처리로 전달
```

**PUBLIC_ENDPOINTS (인증 불필요 경로):**
```
/api/auth/login, /api/auth/logout, /api/auth/refresh ...
/api/registration/*, /api/sso/*, /api/license/*
/health, /docs, /redoc, /openapi.json
```

> ⚠️ **ez2ai_builder의 커스텀 API (`/api/customers` 등)는 PUBLIC_ENDPOINTS가 아닙니다.**
> → 반드시 `Authorization: Bearer {token}` 헤더를 포함해야 합니다.
> → 라우터가 마운트되지 않은 경우에도 미들웨어가 먼저 실행되어 401을 반환합니다.
> → 라우터 임포트 오류(asyncpg 등) 발생 시 라우터 미마운트 → 유효한 토큰이 있어도 404

---

## 15. HTTP 에러 코드 처리

| 코드 | 원인 | 프론트엔드 처리 |
|------|------|----------------|
| 401 | 토큰 없음 / 만료 / 미전송 | `navigate('/login', { replace: true })` |
| 403 | 권한 없음 | 접근 거부 안내 메시지 표시 |
| 404 | 리소스 없음 | 데이터 없음 안내 |
| 409 | 중복 데이터 | 중복 안내 메시지 |
| 500 | 서버 내부 오류 | "서버 오류" 안내, 콘솔 및 ez2ai_server 로그 확인 |

```typescript
// 표준 에러 처리 패턴
} catch (err: any) {
  if (err.response?.status === 401) { navigate('/login', { replace: true }); return }
  if (err.response?.status === 403) { showToast('error', '권한이 없습니다.'); return }
  showToast('error', err.response?.data?.detail || '오류가 발생했습니다.')
}
```

---

## 16. 테넌트 시스템
- `tenant_code`: 고객사 식별 코드 (로그인 시 필수 입력)
- 모든 API 요청에 JWT 토큰 포함 (테넌트 정보 내포)
- `localStorage.getItem('last_tenant_code')`: 마지막 테넌트 코드 자동 저장 (로그인 화면 자동완성용)

---

## 17. ez2ai 시스템 DB 직접 조회 패턴

psycopg2를 사용하여 `public` 스키마(ez2ai 기본 테이블)도 직접 조회 가능합니다.

```python
# psycopg2 사용 — %s 파라미터 (asyncpg의 $1 아님)
def get_users_by_tenant(tenant_id: str):
    conn = _conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("SELECT * FROM public.users WHERE tenant_id = %s", (tenant_id,))
            return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()

# 조회 가능한 공용 테이블:
# public.users, public.tenants, public.groups, public.common_codes 등
```

---

## 13. 빌더 등록 업무 DB — 헬퍼 사용 (필독)

> 본체 화면 [개발 환경설정 > 프로젝트 폴더 > 편집] 에서 등록한 DB 들은 자동으로
> 자식 폴더 `.dev_context/databases.json` 에 컴파일됩니다 (password 는 자식 키로 재암호화).
> **직접 비밀번호를 코드에 작성하지 마세요. 반드시 헬퍼만 사용.**

### 13.1 사용법

```python
# 동기 (psycopg2) — postgresql 전용
from server._ez2ai_db import get_psycopg2_conn

conn = get_psycopg2_conn()                # 첫 번째 등록 DB
# 또는 이름 지정
conn = get_psycopg2_conn(name='ez2ai.simbizlocal')

with conn.cursor() as cur:
    cur.execute('SELECT * FROM simbizlocal.custmaster')
    rows = cur.fetchall()
```

```python
# 메타 + DSN 만 필요한 경우
from server._ez2ai_db import get_database, get_databases

db = get_database()                        # dict (password 평문 복호화됨)
print(db['connection_string_async'])       # postgresql+asyncpg://...
print(db['connection_string_sync'])        # postgresql://...

for d in get_databases():
    print(d['name'], d['host'], d['port'])
```

### 13.2 등록 / 변경

- 화면: 본체 [개발 환경설정 > 프로젝트 폴더] → 해당 프로젝트 → [편집] → DB 정보
- API: `POST /api/builder/projects/{P}/databases`
- 변경 시 자식 산출물 (`databases.json` + helper) 즉시 갱신됨

### 13.3 자식 backend 자체 DB (혼동 주의)

- `.env` 의 `DATABASE_URL` 은 자식 backend 의 user/auth 저장용 (별개)
- **업무 DB** (custmaster, polist 등) 는 위 헬퍼 사용

---

## 14. ★ 서버 시작·재시작·로그 확인은 사용자 담당 — 코딩 도구 직접 실행 금지

> 서버(백엔드/프론트) 시작·재시작·종료는 **사용자가 직접** 수행한다.
> 코딩 도구는 서버를 띄우거나 죽이지 않는다. (포트 검사·PID kill 도 금지)

### 14.1 금지 (코딩 도구가 하지 말 것)

- `uvicorn` / `npm run dev` / `start /B` 로 **서버 자체 기동 금지**
- `netstat` 포트 점유 검사 / `taskkill` PID 종료 **금지**
- `.dev_context/logs/dev.log` 등 **로그 직접 tail 금지**

### 14.2 대신 — 사용자에게 요청

- 코드 변경 후 동작 확인이 필요하면 **사용자에게 1줄로 요청**한다:
  `[서버 재시작 요청] 백엔드/프론트 재시작 후 동작·콘솔 로그 확인 부탁드립니다.`
- **로그 확인도 사용자에게 요청**하고, 사용자가 붙여준 로그/오류 메시지로 진단한다.

### 14.3 코딩 도구가 할 수 있는 검증 (서버 실행 없이)

- **정적 검증만**: 문법 / `import` / 타입 점검 수준까지.
- 서버 기동·E2E 등 **실행 검증은 사용자에게 위임**한다. 보고서에는 "사용자 실행 검증 요청" 으로 명시.

⚠ 코딩 도구가 별도 포트로 자체 기동하면 사용자 서버와 충돌·혼선이 생긴다. 서버 운영은 전적으로 사용자 몫이다.

## 15. 보안 체크리스트 (운영 배포 전 필수)

신규 프로젝트는 즉시 개발 가능하도록 기본값으로 시작합니다. **운영(프로덕션) 배포 전 아래를 반드시 점검**하세요.

### 15.1 계정 / 인증
- [ ] **기본 계정 `admin/admin` 변경 또는 비활성화** — 초기 개발 편의용입니다. 운영 전 강력한 비밀번호로 교체하거나 제거하세요. (env `EZ2AI_ADMIN_ID`/`EZ2AI_ADMIN_PW` 또는 정식 사용자 테이블 전환)
- [ ] 비밀번호 해시 저장(평문 금지), 로그인 실패 제한/잠금 고려.
- [ ] 토큰 만료·갱신 정책 확인. 토큰은 표준 AuthProvider 경유로만 저장.
- [ ] 모든 보호 API 에 인증 가드(`Authorization: Bearer`) 적용. ProtectedRoute 우회 경로 없는지 확인.

### 15.2 입력 / 데이터
- [ ] 모든 입력값 서버 측 검증(길이/형식/권한). SQL 은 파라미터 바인딩(문자열 결합 금지).
- [ ] 민감정보(비밀번호/키)는 로그·응답에 노출 금지.
- [ ] 외부 DB 는 읽기 권한 최소화. 운영 자격증명은 env/시크릿으로 관리(소스 하드코딩 금지).

### 15.3 네트워크 / 배포
- [ ] CORS 허용 출처를 운영 도메인으로 제한(와일드카드 금지).
- [ ] HTTPS 적용, 보안 헤더(CSP 등) 설정 검토.
- [ ] 디버그 모드/상세 오류 노출 비활성화.

> 위 항목은 코딩 도구가 각 화면(특히 로그인) 구현 시 함께 반영해야 합니다. 신경망 관계분석/KIC 의 관계 정보를 따르되, 권한·검증은 본 체크리스트를 우선합니다.
