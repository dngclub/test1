/**
 * shared 컴포넌트 barrel — 78 차 08.
 *
 * 사용 예:
 * ```tsx
 * import { Grid, DetailModal, ConfirmModal, useToast, usePermission } from '@/M000000000/shared'
 * ```
 *
 * 본 폴더는 force_write 대상 — 코딩 도구가 임의 수정하지 않는다.
 * 신규 표준 컴포넌트는 본 폴더에 추가하고 본 파일에 export 한다.
 */
export { default as Grid } from './Grid'
export type { GridColumn, GridProps } from './Grid'

export { default as DetailModal } from './DetailModal'
export type { DetailModalMode, DetailModalProps } from './DetailModal'

export { default as ConfirmModal, EMPTY_CONFIRM } from './ConfirmModal'
export type { ConfirmState, ConfirmModalProps } from './ConfirmModal'

export { default as Pagination } from './Pagination'
export type { PaginationProps } from './Pagination'

export { useToast, ToastStack } from './useToast'
export type { Toast, ToastType } from './useToast'

export { usePermission } from './usePermission'
export type { PermissionContext } from './usePermission'

export { default as ExcelImporter } from './ExcelImporter'
export type { ExcelImporterProps, ExcelImportResult } from './ExcelImporter'
