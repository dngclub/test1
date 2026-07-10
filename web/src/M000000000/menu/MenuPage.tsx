// === ez2ai menu page v4 (78th iteration 06.6, 2026-05-17) ===
/**
 * MenuPage — 본체 메뉴 클릭 시 매칭되는 라우트 + keepalive 캐시.
 *
 * 동작:
 *   1. URL `/extensions/{menu_code}` 또는 `/menu/{menu_code}` 진입
 *   2. `web/src/{menu_code}/` 폴더 안의 .tsx 를 동적 import:
 *      - 우선순위 1: `Page.tsx` 가 아닌 `{Anything}Page.tsx` (빌더 AI 생성 실제 페이지)
 *      - 우선순위 2: `Page.tsx` (auto-stub fallback)
 *   3. 폴더 자체가 없거나 .tsx 가 하나도 없으면 안내 카드
 *
 * Keepalive (78 차 06.6):
 *   한 번 mount 된 메뉴 컴포넌트는 unmount 하지 않고 display 토글로 숨김.
 *   → 다른 탭 → 원래 탭 으로 돌아와도 검색 조건/scroll 위치 등 state 유지.
 *   → 새 마운트가 아니므로 useEffect 도 재실행되지 않음.
 */
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType, ReactElement } from 'react'
import { useParams } from 'react-router-dom'

const pageModules = import.meta.glob('../../M*/*.tsx')

type Loader = () => Promise<{ default: ComponentType }>

function _findPageLoader(menuCode: string): Loader | null {
  const folderPrefix = `../../${menuCode}/`
  for (const [path, loader] of Object.entries(pageModules)) {
    if (!path.startsWith(folderPrefix)) continue
    if (path.endsWith('/Page.tsx')) continue
    return loader as Loader
  }
  const fallback = pageModules[`${folderPrefix}Page.tsx`]
  return (fallback as Loader | undefined) ?? null
}

function NotImplementedCard({ menuCode }: { menuCode: string }) {
  const expectedPath = `web/src/${menuCode}/`
  return (
    <div className="ez2ai-menu-empty">
      <div className="ez2ai-menu-empty-card">
        <div className="ez2ai-menu-empty-icon">📄</div>
        <h2 className="ez2ai-menu-empty-title">메뉴 페이지가 아직 없습니다</h2>
        <p className="ez2ai-menu-empty-desc">
          본체에 등록된 메뉴 <code>{menuCode}</code> 의 화면을 작성하세요.
        </p>
        <code className="ez2ai-menu-empty-hint">{expectedPath}*.tsx</code>
        <p className="ez2ai-menu-empty-tip">
          파일 생성 즉시 vite HMR 이 반영합니다.
        </p>
      </div>
    </div>
  )
}

export default function MenuPage() {
  const { menuCode } = useParams<{ menuCode: string }>()
  const code = menuCode || ''

  // 마운트된 메뉴 컴포넌트 캐시 — 같은 MenuPage instance 안에서 유지.
  // 다른 탭을 봤다가 돌아와도 같은 element 가 재사용되어 state 보존.
  const cacheRef = useRef<Map<string, ReactElement>>(new Map())
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    if (!code) return
    if (cacheRef.current.has(code)) return
    const loader = _findPageLoader(code)
    if (!loader) return
    const LazyComp = lazy(loader)
    cacheRef.current.set(code, <LazyComp key={code} />)
    // 새 컴포넌트가 캐시에 추가됐으니 리렌더
    forceUpdate((n) => n + 1)
  }, [code])

  if (!code) return <NotImplementedCard menuCode="(unknown)" />

  const cached = Array.from(cacheRef.current.entries())
  const hasCurrent = cacheRef.current.has(code)

  return (
    <Suspense fallback={<div className="ez2ai-menu-loading">로딩...</div>}>
      {/* 캐시된 모든 메뉴를 mount 유지, 활성 한 개만 display:block */}
      {cached.map(([key, el]) => (
        <div
          key={key}
          style={{
            display: key === code ? 'block' : 'none',
            height: '100%',
          }}
        >
          {el}
        </div>
      ))}
      {/* 캐시에 없고 _findPageLoader 도 못 찾는 메뉴는 안내 카드 */}
      {!hasCurrent && <NotImplementedCard menuCode={code} />}
    </Suspense>
  )
}
