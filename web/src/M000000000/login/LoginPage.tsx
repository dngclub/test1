import { useEffect, useState } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [tenantCode, setTenantCode] = useState(() => localStorage.getItem('last_tenant_code') || '')
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // ez2AI 빌더 [보기] 버튼 자동 로그인 — 본체 페이지에서 발급한 auth_token 을 URL 쿼리로
  // 전달받아 localStorage 에 저장하고 즉시 / 로 이동. dev 환경(localhost) 한정 정책.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const autoToken = params.get('auto_token')
    if (!autoToken) return
    let cancelled = false
    void (async () => {
      try {
        // 본체·자식 동일 백엔드 — /api/users/me 로 토큰 유효성 + 사용자 정보 조회
        const res = await axios.get('/api/users/me', {
          headers: { Authorization: `Bearer ${autoToken}` },
        })
        if (cancelled) return
        login(autoToken, res.data || {})
        navigate('/home', { replace: true })
      } catch {
        // 토큰 만료/무효 — 일반 로그인 흐름으로 폴백 (URL 쿼리만 제거)
        if (!cancelled) {
          window.history.replaceState({}, '', window.location.pathname)
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantCode || !userId || !password) {
      setError('모든 항목을 입력해주세요.')
      return
    }
    setIsLoading(true)
    setError('')

    try {
      const res = await axios.post('/api/auth/login', {
        tenant_code: tenantCode,
        user_id: userId,
        password,
      })
      // 서버가 HTTP 200 + success:false 로 실패를 반환하는 경우 처리
      if (!res.data.success || !res.data.token) {
        setError(res.data.message || '로그인에 실패했습니다.')
        return
      }
      localStorage.setItem('last_tenant_code', tenantCode)
      // login()을 통해 localStorage + React state + axios 헤더를 동시에 설정 (직접 localStorage 설정 금지)
      login(res.data.token, res.data.user || {})
      navigate('/home', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || '로그인에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="ez2ai-login-bg">
      <div className="ez2ai-login-card">
        <div className="ez2ai-login-left">
          <div className="ez2ai-login-brand">
            <span className="ez2ai-login-brand-badge">AI</span>
            ez2AI Builder
          </div>
          <div>
            <h2 className="ez2ai-login-headline">프로젝트<br />워크스페이스</h2>
            <p className="ez2ai-login-tagline">
              메뉴 · 화면 · 데이터를 한 곳에서. 로그인하여 워크스페이스를 시작하세요.
            </p>
          </div>
          <span className="ez2ai-login-foot">© ez2AI</span>
        </div>
        <div className="ez2ai-login-right">
          <form onSubmit={handleLogin} className="ez2ai-login-form">
            <h1 className="ez2ai-login-form-title">로그인</h1>
            <p className="ez2ai-login-form-sub">계정 정보를 입력하세요.</p>
            <div className="ez2ai-login-field">
              <label className="ez2ai-login-label">테넌트 코드</label>
              <input
                className="ez2ai-login-input"
                type="text"
                value={tenantCode}
                onChange={(e) => setTenantCode(e.target.value)}
                placeholder="테넌트 코드 입력"
                autoComplete="organization"
              />
            </div>
            <div className="ez2ai-login-field">
              <label className="ez2ai-login-label">아이디</label>
              <input
                className="ez2ai-login-input"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="아이디 입력"
                autoComplete="username"
              />
            </div>
            <div className="ez2ai-login-field">
              <label className="ez2ai-login-label">비밀번호</label>
              <input
                className="ez2ai-login-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                autoComplete="current-password"
              />
            </div>
            {error && <p className="ez2ai-login-error">{error}</p>}
            <button type="submit" className="ez2ai-login-btn" disabled={isLoading}>
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
