/**
 * CommonCodesContext — co_common_code 전체를 앱 시작 시 1 회 로드해서 캐싱.
 *
 * CHAT.md (2026-05-19) Q14=B
 *   "앱 시작 시 모든 공통코드 한 번에 로드 → React Context 에 저장 → 모든
 *    페이지가 Context 에서 꺼내씀 (권장)"
 *
 * 사용:
 *   const { byId, label, options } = useCommonCodes()
 *   options('COMMON', 'work_status_cd')                       → [{cd, label}, ...]
 *   label('COMMON', 'work_status_cd', '3')                    → '작업시작'
 *
 * 데이터 모델:
 *   byId['{group}.{id}'] = [{ common_cd, common_cd_name, ...}, ...]
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

export interface CommonCodeItem {
  common_cd: string
  common_cd_name: string | null
  common_cd_val?: string | null
  common_cd_sort?: number | null
  super_common_cd?: string | null
  super_common_cd_val?: string | null
  memo?: string | null
}

export interface CommonCodesContextType {
  byId: Record<string, CommonCodeItem[]>
  loading: boolean
  refresh: () => Promise<void>
  /** 코드그룹·ID 에 해당하는 항목 목록 (정렬된 상태). */
  items: (group: string, id: string) => CommonCodeItem[]
  /**
   * &lt;select&gt; 용 옵션 배열 — {cd, label}.
   *
   * DB 에 해당 group.id 가 비어 있으면 fallback 배열을 그대로 반환 (페이지가 안전하게
   * 동작하도록). fallback 항목은 `{cd, label}` 형식의 객체 배열 또는 문자열 배열
   * (label 과 cd 모두 같은 값으로 자동 매핑) 둘 다 지원.
   */
  options: (
    group: string,
    id: string,
    fallback?: Array<{ cd: string; label: string }> | string[],
  ) => Array<{ cd: string; label: string }>
  /** 코드 → 라벨 변환. 못 찾으면 fallback (기본 '-'). */
  label: (group: string, id: string, code: string | null | undefined, fallback?: string) => string
}

const CommonCodesContext = createContext<CommonCodesContextType | null>(null)

export function CommonCodesProvider({ children }: { children: ReactNode }) {
  const [byId, setById] = useState<Record<string, CommonCodeItem[]>>({})
  const [loading, setLoading] = useState<boolean>(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/common_codes/all')
      setById(res.data?.by_id || {})
    } catch (err) {
      // 401 은 ProtectedRoute 가 처리. 그 외 조용히 패스 (재시도는 사용자 액션으로).
      // eslint-disable-next-line no-console
      console.warn('[common-codes] 일괄 조회 실패', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const items = useCallback(
    (group: string, id: string) => byId[`${group}.${id}`] || [],
    [byId],
  )
  const options = useCallback(
    (
      group: string,
      id: string,
      fallback?: Array<{ cd: string; label: string }> | string[],
    ) => {
      const found = items(group, id)
      if (found.length > 0) {
        return found.map((i) => ({
          cd: i.common_cd,
          label: i.common_cd_name || i.common_cd_val || i.common_cd,
        }))
      }
      if (!fallback || fallback.length === 0) return []
      // string[] -> [{cd, label}]
      if (typeof fallback[0] === 'string') {
        return (fallback as string[]).map((s) => ({ cd: s, label: s }))
      }
      return fallback as Array<{ cd: string; label: string }>
    },
    [items],
  )
  const label = useCallback(
    (group: string, id: string, code: string | null | undefined, fallback = '-') => {
      if (!code) return fallback
      const found = items(group, id).find((i) => i.common_cd === code)
      return found?.common_cd_name || found?.common_cd_val || code || fallback
    },
    [items],
  )

  const value = useMemo<CommonCodesContextType>(
    () => ({ byId, loading, refresh, items, options, label }),
    [byId, loading, refresh, items, options, label],
  )
  return <CommonCodesContext.Provider value={value}>{children}</CommonCodesContext.Provider>
}

export function useCommonCodes(): CommonCodesContextType {
  const ctx = useContext(CommonCodesContext)
  if (!ctx) throw new Error('useCommonCodes must be used within <CommonCodesProvider>')
  return ctx
}
