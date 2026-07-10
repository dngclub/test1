/**
 * StandaloneHeader — ez2AI 메인화면 .main_top 패턴.
 *
 * 구조 (좌→우):
 *   [ez2AI 로고] [카테고리 배지 "안전"] [오늘 날짜]
 *   ............................................
 *   [결재할 문서 카운트] [알람] [사용자 드롭다운]
 *
 * 사용자 드롭다운: 이름 + 역할 표기 + 메뉴(비밀번호 변경/로그아웃)
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import StandalonePasswordChangeModal from './StandalonePasswordChangeModal'

function todayKr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const wk = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${y}-${m}-${day}(${wk})`
}

export default function StandaloneHeader() {
  const navigate = useNavigate()
  const { user, logout } = useAuth() as any
  const [menuOpen, setMenuOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [now, setNow] = useState(() => todayKr())

  // 자정 넘어가도 갱신
  useEffect(() => {
    const t = setInterval(() => setNow(todayKr()), 60_000)
    return () => clearInterval(t)
  }, [])

  const userName = user?.user_name || user?.user_id || '사용자'
  const isSuper = user?.system_yn === 'Y' || user?.is_super_admin
  const isTenantAdmin = user?.tenant_yn === 'Y'
  const role = useMemo(
    () => (isSuper ? '시스템관리자' : isTenantAdmin ? '테넌트관리자' : '일반'),
    [isSuper, isTenantAdmin],
  )

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sa-top">
      {/* ── 좌측: 로고 + 카테고리 + 날짜 ── */}
      <div className="sa-top-left">
        <a className="sa-top-logo" href="/" onClick={(e) => { e.preventDefault(); navigate('/dashboard') }}>
          ez2AI
        </a>
        <span className="sa-top-date">{now}</span>
      </div>

      {/* ── 우측: 결재카운트 + 알림 + 사용자 ── */}
      <div className="sa-top-right">
        <button type="button" className="sa-top-btn sa-doc-btn" title="결재할 문서">
          <span className="sa-doc-label">결재할 문서</span>
          <span className="sa-doc-count">0</span>
        </button>
        <button type="button" className="sa-top-icon-btn" title="알림" aria-label="알림">
          <span className="sa-icon-bell" />
        </button>
        <div className="sa-user-wrap">
          <button
            type="button"
            className="sa-user-btn"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="sa-user-avatar">{userName.slice(0, 1)}</span>
            <span className="sa-user-meta">
              <span className="sa-user-name">{userName}</span>
              <span className="sa-user-role">{role}</span>
            </span>
            <span className="sa-user-caret">▾</span>
          </button>
          {menuOpen && (
            <>
              <div className="sa-user-overlay" onClick={() => setMenuOpen(false)} />
              <div className="sa-user-menu">
                <div className="sa-user-menu-info">
                  <div><b>{userName}</b> <span className="sa-user-menu-id">({user?.user_id})</span></div>
                  <div className="sa-user-menu-sub">{role}</div>
                </div>
                <div className="sa-user-menu-sep" />
                <button
                  type="button"
                  className="sa-user-menu-item"
                  onClick={() => { setMenuOpen(false); setPwOpen(true) }}
                >
                  <span className="sa-mi-icon sa-mi-key" /> 비밀번호 변경
                </button>
                <button
                  type="button"
                  className="sa-user-menu-item sa-user-menu-danger"
                  onClick={handleLogout}
                >
                  <span className="sa-mi-icon sa-mi-logout" /> 로그아웃
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {pwOpen && (
        <StandalonePasswordChangeModal
          onSuccess={() => setPwOpen(false)}
          onClose={() => setPwOpen(false)}
        />
      )}
    </header>
  )
}
