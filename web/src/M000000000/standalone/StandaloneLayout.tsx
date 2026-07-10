/**
 * StandaloneLayout — 좌측 사이드 + 상단 헤더 + 본문 (Outlet).
 *
 * ProtectedRoute 내부에서 사용되므로 인증된 상태에서만 마운트.
 * 프로토타입은 DB 연결 없이 동작 — scope/codes 등 외부 DB 의존 기능 미사용.
 */
import { Outlet } from 'react-router-dom'
import StandaloneSidebar from './StandaloneSidebar'
import StandaloneHeader from './StandaloneHeader'

export default function StandaloneLayout() {
  return (
    <div className="sa-shell">
      <StandaloneSidebar />
      <main className="sa-main">
        <StandaloneHeader />
        <div className="sa-body">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
