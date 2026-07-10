/**
 * TabBar — 탭 list + 닫기 버튼 (78 차 force_write 대상).
 *
 * DashBoard 탭(pinned)은 닫기 버튼 미노출.
 * 자식 package.json 의존을 최소화하기 위해 아이콘은 inline SVG 사용.
 */
import { useNavigate } from 'react-router-dom'
import { useTabs } from './TabContext'

function CloseIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

export default function TabBar() {
  const { tabs, active, close } = useTabs()
  const navigate = useNavigate()
  return (
    <div className="ez2ai-tabs" role="tablist">
      {tabs.map((t) => {
        const isActive = t.menuCode === active
        const cls =
          'ez2ai-tab' +
          (isActive ? ' is-active' : '') +
          (t.pinned ? ' is-pinned' : '')
        return (
          <button
            key={t.menuCode}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cls}
            onClick={() => navigate(t.path)}
          >
            <span className="ez2ai-tab-label">{t.label}</span>
            {!t.pinned && (
              <span
                className="ez2ai-tab-close"
                role="button"
                aria-label="탭 닫기"
                onClick={(e) => {
                  e.stopPropagation()
                  close(t.menuCode)
                }}
              >
                <CloseIcon size={12} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
