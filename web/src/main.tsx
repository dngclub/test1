import React from 'react'
import ReactDOM from 'react-dom/client'
// 전역 디자인 토큰/셸 CSS (--ez-* 정의) — 단일 SSOT.
import './styles/ez-tailwind.css'
import App from './App'

// ⚠️ 본체 [열기] / 확장 기능 iframe 진입 시 URL fragment(#token=...&user=...) 를
// React 렌더 시작 **전** 에 동기적으로 localStorage 에 저장한다.
//
// 이유: AuthProvider 는 `useState(localStorage.getItem('auth_token'))` 로 초기화
// 되고, ProtectedRoute 는 첫 렌더에서 동기적으로 토큰 유무를 평가한다.
// fragment 처리를 useEffect 안에서 하면 ProtectedRoute 가 토큰 부재로 먼저
// `/login` redirect 를 발생시킨 뒤에야 useEffect 가 도착 → "최초 클릭 시 로그인
// 화면이 한 번 보이고, 두 번째 클릭부터 정상" 버그가 발생한다.
;(function applyFragmentTokenSync() {
  try {
    const hash = window.location.hash
    if (!hash || hash.length < 2) return
    const params = new URLSearchParams(hash.slice(1))
    const token = params.get('token')
    if (!token) return
    localStorage.setItem('auth_token', token)
    const userRaw = params.get('user')
    if (userRaw) {
      const user = JSON.parse(decodeURIComponent(userRaw))
      localStorage.setItem('user_info', JSON.stringify(user))
    }
    // 히스토리에 token 흔적 제거
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search,
    )
  } catch (e) {
    console.warn('[main] fragment token apply failed:', e)
  }
})()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
