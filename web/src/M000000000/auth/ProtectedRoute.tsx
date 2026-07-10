import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { ReactNode } from 'react'

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth()
  // navigate() 직후 React 상태 배치 커밋 전에 렌더될 수 있으므로 localStorage도 함께 확인
  // isAuthenticated만 체크하면 login() 후 navigate() 시 /login으로 되돌아가는 race condition 발생
  const hasToken = isAuthenticated || !!localStorage.getItem('auth_token')
  if (!hasToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default ProtectedRoute
