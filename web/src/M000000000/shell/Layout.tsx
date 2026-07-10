import { Outlet } from 'react-router-dom'
import TabBar from './TabBar'
import { TabProvider } from './TabContext'
import { ScopeProvider, ScopeSelector } from '../scope'
import { CommonCodesProvider } from '../codes'
// 개별 Layout.css 폐지(ez-tailwind.css 단일화). 전역 디자인 로드는 프로젝트별 ez-tailwind 통합에 위임.

/**
 * Layout — 자식 SPA shell (78 차 06 → 88 차 2026-05-20 force_write 대상).
 *
 * 88 차 갱신:
 *   - ScopeProvider (tenant/bplc/bld) + CommonCodesProvider (co_common_code 캐싱)
 *     를 최상단에서 wrap → 모든 메뉴가 Context 로 useScope() / useCommonCodes() 사용.
 *   - 상단 topbar 행 (TabBar + ScopeSelector) 분리.
 *
 * ⚠ 본체 [확장 기능] iframe 안에서 동작하므로 **사이드메뉴는 본체가 담당**.
 *    자식은 상단 TabBar + Scope 선택기 + 본문 Outlet 만 가진다.
 *
 * 본체 사이드바에서 메뉴 클릭 시:
 *   - iframe src 가 `/extensions/{menu_code}` 로 변경됨
 *   - TabContext 가 URL 변화를 감지하여 해당 메뉴를 새 탭으로 추가/포커스
 *   - DashBoard 가 항상 첫 탭 (고정)
 */
export default function Layout() {
  return (
    <ScopeProvider>
      <CommonCodesProvider>
        <TabProvider>
          <div className="ez2ai-shell">
            <main className="ez2ai-main">
              <div className="ez2ai-topbar">
                <div className="ez2ai-topbar-tabs"><TabBar /></div>
                <div className="ez2ai-topbar-scope"><ScopeSelector /></div>
              </div>
              <div className="ez2ai-tab-body">
                <Outlet />
              </div>
            </main>
          </div>
        </TabProvider>
      </CommonCodesProvider>
    </ScopeProvider>
  )
}
