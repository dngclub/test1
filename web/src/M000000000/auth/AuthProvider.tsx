import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

interface AuthContextType {
  token: string | null
  userInfo: any | null
  login: (token: string, userInfo: any) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// 앱 시작 시 즉시 토큰 적용 (컴포넌트 마운트 전에도 동작)
const _initialToken = localStorage.getItem('auth_token')
if (_initialToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${_initialToken}`
}

// 요청 인터셉터 — 항상 최신 토큰을 헤더에 주입 (axios v1.x AxiosHeaders 호환)
// ⚠️ config.headers['Authorization'] = ... 은 axios v1.x에서 미동작 가능 → 반드시 .set() 사용
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token && token !== 'null' && token !== 'undefined') {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'))
  const [userInfo, setUserInfo] = useState<any | null>(() => {
    const info = localStorage.getItem('user_info')
    return info ? JSON.parse(info) : null
  })

  const login = (newToken: string, newUserInfo: any) => {
    localStorage.setItem('auth_token', newToken)
    localStorage.setItem('user_info', JSON.stringify(newUserInfo))
    setToken(newToken)
    setUserInfo(newUserInfo)
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_info')
    setToken(null)
    setUserInfo(null)
    delete axios.defaults.headers.common['Authorization']
  }

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [token])

  return (
    <AuthContext.Provider value={{ token, userInfo, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
