/**
 * StandaloneApp — 독립 실행 모드 (ba.bat) 의 App 진입점.
 *
 * App.tsx 가 VITE_RUN_MODE='standalone' 일 때 본 컴포넌트 렌더.
 *
 * 트리:
 *   AuthProvider (절대 수정 금지 — localStorage.auth_token 관리)
 *     Router (basename=BASE_URL)
 *       /login → StandaloneLoginPage (인증 불요)
 *       /     → ProtectedRoute → StandaloneLayout (프로토타입: scope/codes 미사용)
 *                 /dashboard, /extensions/:menuCode, ...
 */
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import ProtectedRoute from '../auth/ProtectedRoute'
import StandaloneLayout from './StandaloneLayout'
import StandaloneLoginPage from './StandaloneLoginPage'
import DashboardPage from '../dashboard/DashboardPage'
import MenuPage from '../menu/MenuPage'

const ROUTER_BASENAME = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')

export default function StandaloneApp() {
  return (
    <AuthProvider>
      <Router basename={ROUTER_BASENAME}>
        <Routes>
          <Route path="/login" element={<StandaloneLoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <StandaloneLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="menu/:menuCode" element={<MenuPage />} />
            <Route path="extensions/:menuCode" element={<MenuPage />} />
            <Route path="home" element={<Navigate to="/dashboard" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}
