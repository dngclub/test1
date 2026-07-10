// === ez2ai child shell routes v4 (88th iteration, 2026-05-20) ===
// 본체 [확장 기능] 진입 시 menu_code 별 화면 표시 + TabContext 자동 탭 추가.
// 84 차 — 본체 단일 진입 정책: 자식 SPA 가 본체 도메인의 path prefix
// (`/_child/{code}/`) 아래에서 서빙될 때 BrowserRouter basename 을
// `import.meta.env.BASE_URL` (vite `base`) 와 동기화.
// 88 차 — RUN_MODE 분기 추가. standalone 모드 (VITE_RUN_MODE='standalone') 진입 시
// 본체 없이 자식 단독 라우터 트리(StandaloneApp) 사용.
// 라우트 구조 (embedded):
//   /login                       → LoginPage (no shell)
//   /                            → Layout (shell) → Outlet
//     index                      → redirect /dashboard
//     /dashboard                 → DashboardPage (고정 첫 탭)
//     /menu/:menuCode            → MenuPage
//     /extensions/:menuCode      → MenuPage (본체 사이드바 진입 path. sentinel
//                                   '_dashboard' 는 TabContext 가 /dashboard 로 redirect)
//     /home                      → redirect /dashboard (legacy)
// ChildTemplatePatcher 는 marker `ez2ai child shell routes v4` 로 patch.
// 옛 marker (v2, v2.1, v2.2, v3, 또는 77 차 이전 home 페이지 본문) 는 자동 갱신 대상.
import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './M000000000/auth/AuthProvider'
import ProtectedRoute from './M000000000/auth/ProtectedRoute'
import LoginPage from './M000000000/login/LoginPage'
import Layout from './M000000000/shell/Layout'
import DashboardPage from './M000000000/dashboard/DashboardPage'
import MenuPage from './M000000000/menu/MenuPage'
// 88 차 — standalone 모드 (ba.bat) 진입점. VITE_RUN_MODE='standalone' 일 때만 사용.
import { StandaloneApp } from './M000000000/standalone'

/**
 * URL fragment 의 token / user 자동 처리 (모드 A — 본체에서 [열기] 진입)
 *
 * 본체 EnvironmentDashboard 의 [열기] 버튼이 #token=...&user=... 형태로 진입시키면
 * 본 컴포넌트가 fragment 를 감지하여 즉시 login() 호출하고
 * history.replaceState 로 fragment 를 제거 (히스토리에 토큰 흔적 0).
 *
 * fragment 가 없거나 잘못된 형식이면 무시하고 기존 흐름 (LoginPage) 진행.
 */
function FragmentTokenHandler() {
  const { login } = useAuth()
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || hash.length < 2) return
    const params = new URLSearchParams(hash.slice(1))
    const token = params.get('token')
    const userRaw = params.get('user')
    if (!token) return
    try {
      const user = userRaw ? JSON.parse(decodeURIComponent(userRaw)) : {}
      login(token, user)
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search,
      )
    } catch {
      // 잘못된 fragment 는 무시 — 기존 흐름 진행
    }
  }, [login])
  return null
}

// 84 차 — vite `base` (`import.meta.env.BASE_URL`) 와 BrowserRouter basename 동기화.
// dev (base='/') → basename='', 본체 단일 진입 (base='/_child/P00000/') → basename='/_child/P00000'.
const ROUTER_BASENAME = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')

// 88 차 — RUN_MODE 분기. standalone 은 별도 라우터 트리 (StandaloneApp).
const RUN_MODE = (import.meta.env.VITE_RUN_MODE || 'embedded').toLowerCase()

function App() {
  if (RUN_MODE === 'standalone') {
    return <StandaloneApp />
  }
  return (
    <AuthProvider>
      <Router basename={ROUTER_BASENAME}>
        <FragmentTokenHandler />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="menu/:menuCode" element={<MenuPage />} />
            {/* 본체 [확장 기능] 사이드바 진입 path — 메뉴별 화면 표시 + TabContext 가 자동 탭 추가 */}
            <Route path="extensions/:menuCode" element={<MenuPage />} />
            <Route path="home" element={<Navigate to="/dashboard" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
