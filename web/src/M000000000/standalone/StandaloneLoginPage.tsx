/**
 * StandaloneLoginPage — standalone(프로토타입) 로그인.
 *
 * 원칙:
 * - 최초 프로젝트는 DB 연결 없이 동작. 테넌트 선택 없음.
 * - 기본 계정 admin / admin 으로 즉시 로그인 (server/_auth_local.py).
 * - 고유명(제품/회사/시스템명) 하드코딩 금지 — 브랜드는 ez2AI 중립 표기.
 *
 * 동작:
 * - POST /api/auth/login { user_id, password } → AuthProvider.login(token, user)
 * - password_change_required=true → StandalonePasswordChangeModal 강제
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import { useAuth } from '../auth/AuthProvider'
import StandalonePasswordChangeModal from './StandalonePasswordChangeModal'

export default function StandaloneLoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [userId, setUserId] = useState<string>('admin')
  const [password, setPassword] = useState<string>('')
  const [showPw, setShowPw] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [showPwChange, setShowPwChange] = useState<boolean>(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId || !password) {
      setError('아이디와 비밀번호를 입력하세요.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/auth/login', {
        user_id: userId,
        password,
      })
      const { token, user, password_change_required } = res.data
      login(token, user)
      if (password_change_required) {
        setShowPwChange(true)
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function handlePwChangeSuccess() {
    setShowPwChange(false)
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="sa-login-bg">
      <div className="sa-login-outline">
        {/* ── 좌측: 다크 브랜드 패널 ───────────────────── */}
        <aside className="sa-login-left">
          <div className="sa-login-left-inner">
            <div className="sa-login-logo">ez2AI</div>
            <h1 className="sa-login-headline">
              프로젝트<br />워크스페이스
            </h1>
            <p className="sa-login-tagline">
              AI 와 함께 설계하고 개발하는 업무 플랫폼.<br />
              로그인하여 작업을 시작하세요.
            </p>
          </div>
          <div className="sa-login-copyright">
            © ez2AI. ALL RIGHTS RESERVED.
          </div>
        </aside>

        {/* ── 우측: 폼 영역 ───────────────────────────── */}
        <form className="sa-login-right" onSubmit={handleSubmit}>
          <div className="sa-login-form">
            <h2 className="sa-login-title">로그인</h2>
            <p className="sa-login-subtitle">계정 정보를 입력하세요.</p>

            <div className="sa-login-hint">
              기본 계정 — 아이디 <b>admin</b> / 비밀번호 <b>admin</b>
            </div>

            <div className="sa-login-field">
              <label htmlFor="sa-userid">아이디</label>
              <div className="sa-input-wrap sa-input-wrap-icon">
                <span className="sa-input-icon sa-icon-user" aria-hidden />
                <input
                  id="sa-userid"
                  type="text"
                  placeholder="아이디 입력"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="sa-login-field">
              <label htmlFor="sa-pw">비밀번호</label>
              <div className="sa-input-wrap sa-input-wrap-icon sa-input-wrap-trail">
                <span className="sa-input-icon sa-icon-lock" aria-hidden />
                <input
                  id="sa-pw"
                  type={showPw ? 'text' : 'password'}
                  placeholder="비밀번호 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  maxLength={64}
                  required
                />
                <button
                  type="button"
                  className={`sa-input-toggle ${showPw ? 'is-on' : ''}`}
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                  tabIndex={-1}
                >
                  {showPw ? '숨김' : '표시'}
                </button>
              </div>
            </div>

            {error && (
              <div className="sa-login-error" role="alert">{error}</div>
            )}

            <button
              type="submit"
              className="sa-login-btn"
              disabled={loading || !userId || !password}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>

            <div className="sa-login-links">
              <span className="sa-login-version">Standalone · Prototype</span>
            </div>
          </div>
        </form>
      </div>

      {showPwChange && (
        <StandalonePasswordChangeModal
          currentPassword={password}
          onSuccess={handlePwChangeSuccess}
          forceChange
        />
      )}
    </div>
  )
}
