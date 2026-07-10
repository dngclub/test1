/**
 * StandaloneSidebar — 좌측 메뉴 트리.
 *
 * CHAT.md 2026-05-20 Q5: menus.json 직접 import (별도 API 없음, 번들에 포함).
 * 폴더/leaf 구분, 펼침/접힘, 검색 기능 포함.
 */
import { useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
// @ts-ignore — vite 가 JSON import 지원
import menusData from '../../../../menus.json'

interface MenuNode {
  id: string
  menu_code: string
  parent_id: string | null
  menu_name: string
  menu_type: 'folder' | 'function'
  sort_order: number
}

interface TreeNode extends MenuNode {
  children: TreeNode[]
}

function buildTree(menus: MenuNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  menus.forEach((m) => map.set(m.id, { ...m, children: [] }))
  const roots: TreeNode[] = []
  menus.forEach((m) => {
    const node = map.get(m.id)!
    if (m.parent_id && map.has(m.parent_id)) {
      map.get(m.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  // 정렬
  const sortRecursive = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
    nodes.forEach((n) => sortRecursive(n.children))
  }
  sortRecursive(roots)
  return roots
}

function CaretIcon({ open }: { open: boolean }) {
  return (
    <svg className={`sa-side-caret ${open ? 'is-open' : ''}`}
         width="10" height="10" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" strokeWidth="3"
         strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function MenuRow({ node, depth, activeCode, onClick, search }: {
  node: TreeNode
  depth: number
  activeCode: string | null
  onClick: (n: TreeNode) => void
  search: string
}) {
  const [open, setOpen] = useState<boolean>(depth < 1 || !!search.trim())
  const matched = !search.trim() || node.menu_name.toLowerCase().includes(search.toLowerCase())
  const hasMatchingChild = node.children.some(function check(c): boolean {
    if (!search.trim()) return true
    if (c.menu_name.toLowerCase().includes(search.toLowerCase())) return true
    return c.children.some(check)
  })
  if (search.trim() && !matched && !hasMatchingChild) return null

  const isFolder = node.menu_type === 'folder'
  const isActive = node.menu_code === activeCode
  const indentStyle = { paddingLeft: 12 + depth * 14 }

  return (
    <>
      <div
        className={`sa-side-row ${isFolder ? 'is-folder' : 'is-leaf'} ${isActive ? 'is-active' : ''}`}
        style={indentStyle}
        onClick={() => {
          if (isFolder) setOpen((v) => !v)
          else onClick(node)
        }}
        title={node.menu_name}
      >
        {isFolder
          ? <CaretIcon open={open} />
          : <span className="sa-side-dot" />}
        <span className="sa-side-name">{node.menu_name}</span>
        {isFolder && node.children.length > 0 &&
          <span className="sa-side-count">{node.children.length}</span>}
      </div>
      {isFolder && open && node.children.map((c) => (
        <MenuRow key={c.id} node={c} depth={depth + 1}
                 activeCode={activeCode} onClick={onClick} search={search} />
      ))}
    </>
  )
}

export default function StandaloneSidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth() as any
  const [search, setSearch] = useState<string>('')

  const userName = user?.user_name || user?.user_id || '사용자'
  const isSuper = user?.system_yn === 'Y' || user?.is_super_admin
  const role = isSuper ? '시스템관리자' : (user?.tenant_yn === 'Y' ? '관리자' : '일반')

  // 현재 활성 메뉴 코드 — URL 의 /extensions/{code} 에서 추출
  const activeCode = useMemo(() => {
    const m = location.pathname.match(/\/extensions\/(M\d+)/)
    return m ? m[1] : null
  }, [location.pathname])

  const tree = useMemo(() => {
    const raw = (menusData as any).menus || menusData
    return buildTree(raw as MenuNode[])
  }, [])

  function handleClick(node: TreeNode) {
    navigate(`/extensions/${node.menu_code}`)
  }

  return (
    <aside className="sa-side">
      <div className="sa-side-head">
        <div className="sa-side-brand">
          <span className="sa-side-brand-logo">ez2AI</span>
          <span className="sa-side-brand-text">워크스페이스</span>
        </div>
      </div>
      <div className="sa-side-search">
        <input
          type="search"
          placeholder="메뉴 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div
        className={`sa-side-row sa-side-dashboard ${location.pathname === '/dashboard' ? 'is-active' : ''}`}
        onClick={() => navigate('/dashboard')}
      >
        <span className="sa-side-dot" />
        <span className="sa-side-name">📊 대시보드</span>
      </div>
      <nav className="sa-side-nav">
        {tree.map((n) => (
          <MenuRow key={n.id} node={n} depth={0}
                   activeCode={activeCode} onClick={handleClick} search={search} />
        ))}
      </nav>
      <div className="sa-side-user">
        <span className="sa-side-user-avatar">{userName.slice(0, 1).toUpperCase()}</span>
        <span className="sa-side-user-meta">
          <span className="sa-side-user-name">{userName}</span>
          <span className="sa-side-user-role">{role}</span>
        </span>
      </div>
    </aside>
  )
}
