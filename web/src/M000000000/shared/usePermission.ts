/**
 * usePermission — 행 단위 수정/삭제 권한 판별 훅.
 *
 * 정책 (78 차 08):
 *   - 최고관리자(is_super_admin=true) 는 모든 행 수정/삭제 가능
 *   - 그 외 사용자는 본인이 등록한 행만 수정/삭제 가능 (register_id === user_id)
 *
 * 본 훅은 **방어 1차** (UI 가드) — 백엔드에서도 동일 검증을 강제해야 한다.
 * 백엔드 가드가 단일 SSOT 이며, 본 훅은 UX (버튼 회색 처리) 목적.
 */
import { useMemo } from 'react'
import { useAuth } from '../auth/useAuth'

export interface PermissionContext {
  userId: string
  isSuperAdmin: boolean
  /** ownerId 가 null/undefined 이면 (소유자 미상) false 반환. super admin 만 true. */
  canEdit: (ownerId: string | null | undefined) => boolean
}

export function usePermission(): PermissionContext {
  const { userInfo } = useAuth()
  return useMemo(() => {
    const userId: string = userInfo?.user_id || ''
    const isSuperAdmin: boolean = Boolean(userInfo?.is_super_admin)
    const canEdit = (ownerId: string | null | undefined): boolean => {
      if (isSuperAdmin) return true
      if (!ownerId) return false
      return ownerId === userId
    }
    return { userId, isSuperAdmin, canEdit }
  }, [userInfo])
}
