import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface UserInfo {
  user_id: string
  user_name: string
  is_super_admin: boolean
}

const HomePage = () => {
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    try {
      const info = localStorage.getItem('user_info')
      if (info) setUserInfo(JSON.parse(info))
    } catch {
      // ignore
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_info')
    navigate('/login', { replace: true })
  }

  return (
    <div className="home-container">
      <header className="home-header">
        <h1 className="home-title">ez2AI Builder</h1>
        <div className="home-user">
          <span>{userInfo?.user_name ?? '사용자'}</span>
          <button onClick={handleLogout} className="logout-button">로그아웃</button>
        </div>
      </header>
      <main className="home-main">
        <div className="home-welcome">
          <h2>환영합니다!</h2>
          <p>ez2AI Builder 커스텀 애플리케이션이 준비되었습니다.</p>
          <p>메뉴를 추가하고 기능을 개발하세요.</p>
        </div>
      </main>
    </div>
  )
}

export default HomePage
