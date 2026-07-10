/**
 * DashboardPage — 자식 SPA 첫 화면 (dev_plan/172 프리미엄 스타터 대시보드).
 *
 * ⚠ 신규 프로젝트 생성 시 1회만 생성됩니다(write_tracked — 재초기화로 덮어쓰지 않음).
 *    아래 KPI/차트/시작가이드는 ez2AI 기본 템플릿의 "샘플" UI 이며, 실데이터·위젯으로
 *    자유롭게 교체하세요. 전역 스타일은 web/src/styles/ez-tailwind.css 의 .ez2ai-dash-* 토큰 기반.
 */
import { useState } from 'react'

interface Kpi {
  key: string
  label: string
  value: string
  delta: string
  up: boolean
  icon: string
  variant: 'primary' | 'success' | 'warning' | 'danger'
}

const KPIS: Kpi[] = [
  { key: 'total', label: '전체 항목', value: '1,248', delta: '8.2%', up: true, icon: '📦', variant: 'primary' },
  { key: 'active', label: '진행 중', value: '312', delta: '3.1%', up: true, icon: '⚡', variant: 'warning' },
  { key: 'done', label: '완료', value: '904', delta: '12.4%', up: true, icon: '✅', variant: 'success' },
  { key: 'overdue', label: '지연', value: '32', delta: '1.5%', up: false, icon: '⏰', variant: 'danger' },
]

const BARS = [
  { label: '월', value: 62 },
  { label: '화', value: 78 },
  { label: '수', value: 54 },
  { label: '목', value: 88 },
  { label: '금', value: 71 },
]

const STEPS = [
  { title: '메뉴 추가', desc: '빌더에서 메뉴를 추가하면 좌측 사이드바에 자동 반영됩니다.' },
  { title: '화면 개발', desc: 'AI 코딩 도구로 각 메뉴 화면을 생성하세요 — web/src/{메뉴코드}/Page.tsx' },
  { title: '데이터 연결', desc: 'DB 링크를 연결하고 이 대시보드의 샘플 값을 실데이터로 교체하세요.' },
]

export default function DashboardPage() {
  const [, refresh] = useState(0)
  const now = new Date()
  const week = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()]
  const today = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()} (${week})`

  return (
    <div className="ez2ai-dash">
      <header className="ez2ai-dash-head">
        <div>
          <h1 className="ez2ai-dash-title">워크스페이스 대시보드</h1>
          <p className="ez2ai-dash-subtitle">
            ez2AI 기본 템플릿 · 화면을 추가해 나만의 대시보드를 완성하세요
          </p>
        </div>
        <div className="ez2ai-dash-head-actions">
          <span className="ez2ai-dash-date">{today}</span>
          <button type="button" className="ez2ai-dash-btn" onClick={() => refresh((n) => n + 1)}>
            새로고침
          </button>
        </div>
      </header>

      <section className="ez2ai-dash-kpis">
        {KPIS.map((k) => (
          <div key={k.key} className={`ez2ai-dash-kpi is-${k.variant}`}>
            <span className="ez2ai-dash-sample">샘플</span>
            <div className="ez2ai-dash-kpi-icon">{k.icon}</div>
            <div className="ez2ai-dash-kpi-label">{k.label}</div>
            <div className="ez2ai-dash-kpi-value">{k.value}</div>
            <div className={`ez2ai-dash-kpi-delta ${k.up ? 'is-up' : 'is-down'}`}>
              {k.up ? '▲' : '▼'} {k.delta}
            </div>
          </div>
        ))}
      </section>

      <div className="ez2ai-dash-grid">
        <section className="ez2ai-dash-card ez2ai-dash-chart">
          <div className="ez2ai-dash-card-head">
            <h2 className="ez2ai-dash-card-title">주간 활동</h2>
            <span className="ez2ai-dash-sample">샘플</span>
          </div>
          {BARS.map((b) => (
            <div key={b.label} className="ez2ai-dash-bar-row">
              <span className="ez2ai-dash-bar-label">{b.label}요일</span>
              <span className="ez2ai-dash-bar-track">
                <span className="ez2ai-dash-bar-fill" style={{ width: `${b.value}%` }} />
              </span>
              <span className="ez2ai-dash-bar-value">{b.value}</span>
            </div>
          ))}
        </section>

        <section className="ez2ai-dash-card ez2ai-dash-guide">
          <div className="ez2ai-dash-card-head">
            <h2 className="ez2ai-dash-card-title">시작하기</h2>
          </div>
          {STEPS.map((s, i) => (
            <div key={s.title} className="ez2ai-dash-step">
              <div className="ez2ai-dash-step-num">{i + 1}</div>
              <div>
                <p className="ez2ai-dash-step-title">{s.title}</p>
                <p className="ez2ai-dash-step-desc">{s.desc}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
