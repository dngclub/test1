/**
 * ScopeSelector — 테넌트 / 권역 / 빌딩 3단 콤보 (헤더 우측 배치용).
 *
 * CHAT.md 2 — "우측 상단에 tenant_id(테넌트), bplc_id(권역), bld_id(빌딩)을
 * 선택하는 콤보박스가 있어야 합니다. 해당되는 것을 선택하면 해당 내역만 조회"
 *
 * 변경 시 ScopeContext 가 window.location.reload (Q7=C) → 모든 페이지 재조회.
 */
import { useScope } from './ScopeContext'

export default function ScopeSelector() {
  const {
    tenant_id, bplc_id, bld_id,
    tenants, bplcs, bldgs,
    loading,
    setTenant, setBplc, setBldg,
  } = useScope()

  return (
    <div className="scope-selector" role="toolbar" aria-label="범위 선택">
      <div className="scope-field">
        <label htmlFor="scope-tenant">테넌트</label>
        <select
          id="scope-tenant"
          value={tenant_id || ''}
          disabled={loading || tenants.length === 0}
          onChange={(e) => setTenant(e.target.value || null)}
        >
          {tenants.length === 0 && <option value="">(없음)</option>}
          {tenants.map((t) => (
            <option key={t.tenant_id} value={t.tenant_id}>
              {t.tenant_name}
            </option>
          ))}
        </select>
      </div>

      <div className="scope-field">
        <label htmlFor="scope-bplc">권역</label>
        <select
          id="scope-bplc"
          value={bplc_id || ''}
          disabled={loading || !tenant_id || bplcs.length === 0}
          onChange={(e) => setBplc(e.target.value || null)}
        >
          <option value="">전체</option>
          {bplcs.map((b) => (
            <option key={b.bplc_id} value={b.bplc_id}>
              {b.bplc_name}
            </option>
          ))}
        </select>
      </div>

      <div className="scope-field">
        <label htmlFor="scope-bld">빌딩</label>
        <select
          id="scope-bld"
          value={bld_id || ''}
          disabled={loading || !tenant_id || bldgs.length === 0}
          onChange={(e) => setBldg(e.target.value || null)}
        >
          <option value="">전체</option>
          {bldgs.map((b) => (
            <option key={b.bld_id} value={b.bld_id}>
              {b.bld_name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
