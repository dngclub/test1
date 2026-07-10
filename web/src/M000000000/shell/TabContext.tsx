/**
 * TabContext — 자식 SPA 탭 시스템 (78 차 06, 2026-05-17 force_write 대상).
 *
 * 동작:
 *  - 첫 탭은 'DASHBOARD' 로 고정(pinned), 닫기 X
 *  - **본체 [확장 기능] 사이드바에서 메뉴 클릭 시**:
 *    iframe src 가 `/extensions/{menu_code}` 로 변경 → URL 감지 → 자동 탭 추가/포커스
 *  - 영속화 없음: 새로고침 / iframe 재마운트 시 항상 [DashBoard] 만으로 시작 (78 차 06.5)
 *  - menu_code → menu_name 룩업은 본체 menu API 1회 fetch (탭 label 보정)
 *  - close(menuCode) — 'DASHBOARD' 는 무시. active 탭을 닫으면 직전 탭으로 navigate.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'

export interface Tab {
  menuCode: string  // 'DASHBOARD' = 고정 첫 탭
  label: string
  path: string
  pinned?: boolean
}

const DASHBOARD_TAB: Tab = {
  menuCode: 'DASHBOARD',
  label: 'DashBoard',
  path: '/dashboard',
  pinned: true,
}

// 78 차 06.1 (2026-05-17) — menu 룩업은 본체 internal-menus 엔드포인트 사용.
// 옛 super_admin 가드 엔드포인트는 자식 SPA 컨텍스트에서 403 발생했음.
// internal-menus 는 tenant_scope 검사만 수행 (자식 호출 OK).
//
// 78 차 06.5 — 탭 영속화 제거.
//   - 브라우저 새로고침 / iframe 재마운트 시 항상 [DashBoard] 만으로 시작
//   - 본체 URL 의 menu_code 가 있으면 useEffect 가 그 메뉴만 탭에 자동 추가
//   - 사용자 요구: "새로고침하면 모두 닫히고 대시보드", "확장 기능 재진입도 동일"

// 78 차 06.4 — 자식 → 본체 URL 동기화 메시지 type.
// 본체 ExtensionFrame 의 message listener 가 받아 router.navigate 수행.
// 본체 사이드바는 currentPath === node.href 로 active 표시 → URL 만 동기화하면 OK.
const HOST_NAV_MESSAGE = 'ez2ai:navigate'

// 78 차 06.6 — 본체 → 자식 URL navigation 메시지 type.
// 본체 사이드바에서 메뉴 클릭 시 iframe reload 없이 자식 router 만 navigate.
const FROM_HOST_NAV_MESSAGE = 'ez2ai:host-nav'

function _notifyHostNavigate(childPath: string): void {
  // child path → host path 매핑:
  //  - '/dashboard'             → '/extensions/_dashboard' (sentinel, 사이드바 active X)
  //  - '/extensions/{code}'     → '/extensions/{code}'
  //  - 기타 (login 등)           → 알림 보내지 않음 (본체 라우트와 무관)
  let hostPath: string | null = null
  if (childPath === '/dashboard') {
    hostPath = '/extensions/_dashboard'
  } else if (childPath.startsWith('/extensions/')) {
    hostPath = childPath
  }
  if (!hostPath) return
  if (typeof window === 'undefined') return
  // iframe 안에서만 의미 있음 — parent === window 면 본체 직접 렌더 (no-op)
  if (window.parent === window) return
  try {
    window.parent.postMessage(
      { type: HOST_NAV_MESSAGE, path: hostPath },
      '*',  // 본체 origin 은 dev/prod 가 다양하므로 wildcard. 본체가 origin 검사.
    )
  } catch {
    /* postMessage 실패는 graceful — 자식 화면은 정상 동작 */
  }
}

interface TabContextValue {
  tabs: Tab[]
  active: string
  open: (tab: Omit<Tab, 'pinned'>) => void
  close: (menuCode: string) => void
}

const TabCtx = createContext<TabContextValue | null>(null)

export function TabProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  // 78 차 06.5 — 영속화 제거. 새로고침 / iframe 재마운트 시 항상 [DashBoard] 만으로 시작.
  const [tabs, setTabs] = useState<Tab[]>([DASHBOARD_TAB])
  const [menuIndex, setMenuIndex] = useState<Record<string, string>>({})

  // 본체 internal-menus API 1회 fetch — menu_code → menu_name 룩업.
  // 응답: InternalMenuItem[] (평면 array, depth/href 포함). tenant_scope 검사만 수행.
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    axios
      .get('/api/builder/internal-menus', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      .then((res) => {
        const raw = res.data
        const list = (Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.menus)
            ? raw.menus
            : []) as Array<{ menu_code?: string; menu_name?: string }>
        const map: Record<string, string> = {}
        for (const m of list) {
          if (m.menu_code) map[m.menu_code] = m.menu_name || m.menu_code
        }
        setMenuIndex(map)
      })
      .catch(() => {
        /* ignore — label fallback = menu_code */
      })
  }, [])

  // menuIndex 가 로드되면 기존 탭 label 보정
  useEffect(() => {
    if (Object.keys(menuIndex).length === 0) return
    setTabs((cur) =>
      cur.map((t) => {
        if (t.pinned) return t
        const name = menuIndex[t.menuCode]
        if (name && t.label !== name) return { ...t, label: name }
        return t
      }),
    )
  }, [menuIndex])

  // URL `/extensions/{code}` 진입 감지.
  //  - sentinel '_dashboard' / 'DASHBOARD' → /dashboard 로 redirect (탭 추가 X)
  //  - 그 외 → 자동 탭 추가/포커스
  useEffect(() => {
    const match = location.pathname.match(/^\/extensions\/(.+)$/)
    if (!match) return
    const code = decodeURIComponent(match[1])
    if (!code || code === '_dashboard' || code === 'DASHBOARD') {
      navigate('/dashboard', { replace: true })
      return
    }
    setTabs((cur) => {
      if (cur.some((t) => t.menuCode === code)) return cur
      return [
        ...cur,
        {
          menuCode: code,
          label: menuIndex[code] || code,
          path: location.pathname,
        },
      ]
    })
  }, [location.pathname, menuIndex, navigate])

  // 78 차 06.4 — 자식 location 변경 시마다 본체에 URL 동기화 알림.
  // 본체 ExtensionFrame 이 받아 router.navigate → 본체 사이드바 active 자동 갱신.
  useEffect(() => {
    _notifyHostNavigate(location.pathname)
  }, [location.pathname])

  // 78 차 06.6 — 본체 사이드바 메뉴 클릭 → ExtensionFrame 이 postMessage 로 자식에 navigate 요청.
  // iframe reload 가 일어나지 않으므로 자식 SPA 의 모든 state (탭 list, 페이지 컴포넌트 state) 가 유지된다.
  useEffect(() => {
    function onHostNav(ev: MessageEvent) {
      const data = ev.data
      if (!data || typeof data !== 'object') return
      if (data.type !== FROM_HOST_NAV_MESSAGE) return
      const path = typeof data.path === 'string' ? data.path : ''
      if (!path.startsWith('/extensions/')) return
      // 자식 SPA 내부 path 매핑:
      //   '/extensions/_dashboard'  → '/dashboard' (sentinel)
      //   '/extensions/{code}'       → 그대로
      const m = path.match(/^\/extensions\/(.+)$/)
      if (!m) return
      const code = decodeURIComponent(m[1])
      const target =
        code === '_dashboard' || code === 'DASHBOARD' || !code
          ? '/dashboard'
          : `/extensions/${code}`
      if (location.pathname === target) return
      navigate(target)
    }
    window.addEventListener('message', onHostNav)
    return () => window.removeEventListener('message', onHostNav)
  }, [location.pathname, navigate])

  const active = useMemo(() => {
    const found = tabs.find((t) => t.path === location.pathname)
    return found?.menuCode ?? 'DASHBOARD'
  }, [tabs, location.pathname])

  const open = useCallback(
    (tab: Omit<Tab, 'pinned'>) => {
      setTabs((cur) => {
        if (cur.some((t) => t.menuCode === tab.menuCode)) return cur
        return [...cur, { ...tab }]
      })
      navigate(tab.path)
    },
    [navigate],
  )

  const close = useCallback(
    (menuCode: string) => {
      if (menuCode === 'DASHBOARD') return
      setTabs((cur) => {
        const idx = cur.findIndex((t) => t.menuCode === menuCode)
        if (idx < 0) return cur
        const next = cur.filter((t) => t.menuCode !== menuCode)
        const target = cur[idx]
        if (target && target.menuCode === active) {
          const fallback = next[Math.max(0, idx - 1)]
          if (fallback) navigate(fallback.path)
        }
        return next
      })
    },
    [active, navigate],
  )

  const value = useMemo(
    () => ({ tabs, active, open, close }),
    [tabs, active, open, close],
  )
  return <TabCtx.Provider value={value}>{children}</TabCtx.Provider>
}

export function useTabs(): TabContextValue {
  const ctx = useContext(TabCtx)
  if (!ctx) throw new Error('useTabs must be inside TabProvider')
  return ctx
}
