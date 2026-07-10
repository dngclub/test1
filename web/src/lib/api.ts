import axios from 'axios'

// 공통 axios wrapper — 신규 페이지는 직접 axios 대신 이 wrapper 를 사용한다.
// baseURL 은 vite base(standalone='/') 기준. /api/... 호출 시 자동 결합.
const api = axios.create({
  baseURL: (import.meta.env.BASE_URL || '/').replace(/\/$/, ''),
  timeout: 30000,
})

// 요청 인터셉터 — 최신 토큰 주입 (axios v1.x AxiosHeaders .set() 필수)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token && token !== 'null' && token !== 'undefined') {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

// 응답 인터셉터 — 401(토큰 만료/무효) 시 세션 정리 후 로그인 화면으로 자동 유도.
// 세션 만료를 사용자가 "기능 고장" 으로 오인하지 않도록(재로그인 안내). 무한 루프 방지로
// 이미 /login 이면 리다이렉트 생략.
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
