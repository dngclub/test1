/**
 * ScopeContext — tenant / bplc(권역) / bld(빌딩) 3단 선택값 전역 상태.
 *
 * CHAT.md (2026-05-19) Q3=B / Q4=A / Q5=B / Q6=권장 / Q7=C / Q13=독립 동작
 * - 저장: React Context + localStorage 동기
 * - 전파: axios 인터셉터 (lib/api.ts) 에 X-Tenant-Id / X-Bplc-Id / X-Bld-Id 자동 헤더
 * - 변경 시: window.location.reload() 로 화면 라우터 리셋 (Q7=C)
 *
 * 본체 tenant 와는 무관하게 동작 (Q13). 후속으로 본체↔자식 tenant 매핑 예정.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import api from '../../lib/api'

// ── 타입 ──────────────────────────────────────────────
export interface ScopeOptionTenant {
  tenant_id: string
  tenant_name: string
  company_cd?: string | null
}
export interface ScopeOptionBplc {
  bplc_id: string
  bplc_name: string
  tenant_id?: string
}
export interface ScopeOptionBldg {
  bld_id: string
  bld_name: string
  bld_abbr_name?: string | null
  bplc_id?: string
  tenant_id?: string
}

export interface ScopeValue {
  tenant_id: string | null
  bplc_id: string | null
  bld_id: string | null
}

export interface ScopeContextType extends ScopeValue {
  tenants: ScopeOptionTenant[]
  bplcs: ScopeOptionBplc[]
  bldgs: ScopeOptionBldg[]
  loading: boolean
  /** 단일 선택 변경 — 변경 후 window.location.reload (Q7=C). */
  setTenant: (tenantId: string | null) => void
  setBplc: (bplcId: string | null) => void
  setBldg: (bldId: string | null) => void
  /** 옵션 다시 로드 (테넌트가 바뀐 후 cascading 갱신용 — 내부 자동 호출). */
  refresh: () => Promise<void>
}

// ── 상수 ──────────────────────────────────────────────
const LS_KEYS = {
  tenant: 'ez2ai_scope_tenant_id',
  bplc: 'ez2ai_scope_bplc_id',
  bldg: 'ez2ai_scope_bld_id',
}

// ── Context ───────────────────────────────────────────
const ScopeContext = createContext<ScopeContextType | null>(null)

function readLS(key: string): string | null {
  try {
    const v = localStorage.getItem(key)
    return v && v !== 'null' && v !== 'undefined' ? v : null
  } catch {
    return null
  }
}
function writeLS(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    /* noop */
  }
}

export function ScopeProvider({ children }: { children: ReactNode }) {
  const [tenant_id, setTenantState] = useState<string | null>(() => readLS(LS_KEYS.tenant))
  const [bplc_id, setBplcState] = useState<string | null>(() => readLS(LS_KEYS.bplc))
  const [bld_id, setBldgState] = useState<string | null>(() => readLS(LS_KEYS.bldg))
  const [tenants, setTenants] = useState<ScopeOptionTenant[]>([])
  const [bplcs, setBplcs] = useState<ScopeOptionBplc[]>([])
  const [bldgs, setBldgs] = useState<ScopeOptionBldg[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // 옵션 fetch — tenant_id, bplc_id 에 따라 cascading
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/scope/options', {
        params: {
          tenant_id: tenant_id || undefined,
          bplc_id: bplc_id || undefined,
        },
      })
      setTenants(res.data.tenants || [])
      setBplcs(res.data.bplcs || [])
      setBldgs(res.data.bldgs || [])

      // 첫 진입 (LocalStorage 비어있음) 시 첫 옵션 자동 선택
      if (!tenant_id && (res.data.tenants?.length || 0) > 0) {
        const first = res.data.tenants[0].tenant_id as string
        writeLS(LS_KEYS.tenant, first)
        setTenantState(first)
      }
    } catch (err) {
      // 401 은 ProtectedRoute 가 처리. 그 외 조용히 패스.
      // eslint-disable-next-line no-console
      console.warn('[scope] options 조회 실패', err)
    } finally {
      setLoading(false)
    }
  }, [tenant_id, bplc_id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // 변경 핸들러 (Q7=C: 변경 시 화면 reload)
  const setTenant = useCallback((next: string | null) => {
    writeLS(LS_KEYS.tenant, next)
    // tenant 바꾸면 하위(bplc, bldg) 도 초기화
    writeLS(LS_KEYS.bplc, null)
    writeLS(LS_KEYS.bldg, null)
    window.location.reload()
  }, [])

  const setBplc = useCallback((next: string | null) => {
    writeLS(LS_KEYS.bplc, next)
    writeLS(LS_KEYS.bldg, null)
    window.location.reload()
  }, [])

  const setBldg = useCallback((next: string | null) => {
    writeLS(LS_KEYS.bldg, next)
    window.location.reload()
  }, [])

  const value = useMemo<ScopeContextType>(
    () => ({
      tenant_id,
      bplc_id,
      bld_id,
      tenants,
      bplcs,
      bldgs,
      loading,
      setTenant,
      setBplc,
      setBldg,
      refresh,
    }),
    [tenant_id, bplc_id, bld_id, tenants, bplcs, bldgs, loading, setTenant, setBplc, setBldg, refresh],
  )

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>
}

export function useScope(): ScopeContextType {
  const ctx = useContext(ScopeContext)
  if (!ctx) throw new Error('useScope must be used within <ScopeProvider>')
  return ctx
}

/**
 * 인터셉터·테스트용 직접 읽기 헬퍼 — React 트리 밖에서 사용.
 * 항상 최신 localStorage 값을 반환.
 */
export function readScopeFromStorage(): ScopeValue {
  return {
    tenant_id: readLS(LS_KEYS.tenant),
    bplc_id: readLS(LS_KEYS.bplc),
    bld_id: readLS(LS_KEYS.bldg),
  }
}
