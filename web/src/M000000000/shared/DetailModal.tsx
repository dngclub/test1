/**
 * DetailModal — 표준 상세/편집 모달 (78 차 08, 2026-05-17).
 *
 * Grid 행 클릭 시 열리는 상세 모달. 3가지 모드:
 *   - 'view'  : 읽기 전용, 수정/삭제 버튼 (권한 시)
 *   - 'edit'  : 편집 모드, 저장/취소
 *   - 'create': 신규 등록, 저장/취소
 *
 * 본 컴포넌트는 모달 프레임(header/footer/mode 전환) 만 제공하고
 * 폼 내용은 children 으로 받는다. 페이지가 mode 에 따라 다른 layout 을
 * 렌더할 수 있고, 모달 안의 입력 컴포넌트는 페이지가 책임진다.
 *
 * 사용 예:
 * ```tsx
 * const [mode, setMode] = useState<'view'|'edit'|'create'>('view')
 * const [data, setData] = useState<Row | null>(null)
 *
 * <DetailModal
 *   open={!!data || mode === 'create'}
 *   title={mode === 'create' ? '신규 등록' : data?.title || '상세'}
 *   mode={mode}
 *   canEdit={canEdit(data?.register_id)}
 *   canDelete={canEdit(data?.register_id)}
 *   onClose={() => { setData(null); setMode('view') }}
 *   onModeChange={setMode}
 *   onSave={handleSave}
 *   onDelete={handleDelete}
 *   saving={saving}
 * >
 *   {mode === 'view' ? <ViewLayout data={data} /> : <EditLayout form={form} setForm={setForm} />}
 * </DetailModal>
 * ```
 */
import { useEffect, type ReactNode } from 'react'

export type DetailModalMode = 'view' | 'edit' | 'create'

export interface DetailModalProps {
  open: boolean
  title: string
  mode: DetailModalMode
  /** 수정 버튼 노출 여부 (권한이 없으면 false). 'create' 모드와 무관. */
  canEdit?: boolean
  /** 삭제 버튼 노출 여부 (권한이 없으면 false). */
  canDelete?: boolean
  /** 저장/삭제 진행 중 여부 — 버튼 disabled + 텍스트 변경. */
  saving?: boolean
  /** 모달 사이즈. 기본 'md' (560px). */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** 닫기 (X 또는 outside click 또는 취소). */
  onClose: () => void
  /** view ↔ edit 전환. 'create' 는 외부에서만 진입. */
  onModeChange?: (next: 'view' | 'edit') => void
  /** edit/create 모드의 저장. 미지정 시 저장 버튼 숨김. */
  onSave?: () => Promise<void> | void
  /** view 모드의 삭제. canDelete=true 일 때만 노출. */
  onDelete?: () => Promise<void> | void
  /** 폼 / 표시 내용. mode 에 따라 페이지가 분기 렌더. */
  children: ReactNode
}

const SIZE_PX: Record<NonNullable<DetailModalProps['size']>, number> = {
  sm: 420,
  md: 560,
  lg: 720,
  xl: 960,
}

export default function DetailModal({
  open,
  title,
  mode,
  canEdit = false,
  canDelete = false,
  saving = false,
  size = 'md',
  onClose,
  onModeChange,
  onSave,
  onDelete,
  children,
}: DetailModalProps) {
  // ESC 키로 닫기 (saving 중에는 무시)
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, saving, onClose])

  if (!open) return null

  const isEdit = mode === 'edit' || mode === 'create'

  return (
    <div
      className="eg-modal-backdrop"
      onClick={() => {
        if (saving) return
        onClose()
      }}
    >
      <div
        className="eg-modal"
        style={{ maxWidth: SIZE_PX[size] }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="eg-modal-header">
          <h2>{title}</h2>
          <div className="eg-modal-header-actions">
            {mode === 'view' && canEdit && onModeChange && (
              <button
                type="button"
                className="eg-btn eg-btn-outline"
                onClick={() => onModeChange('edit')}
                disabled={saving}
              >
                수정
              </button>
            )}
            <button
              type="button"
              className="eg-modal-close"
              onClick={onClose}
              disabled={saving}
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        </div>

        <div className="eg-modal-body">{children}</div>

        <div className="eg-modal-footer">
          {mode === 'view' && canDelete && onDelete && (
            <button
              type="button"
              className="eg-btn eg-btn-danger left"
              onClick={onDelete}
              disabled={saving}
            >
              {saving ? '처리 중…' : '삭제'}
            </button>
          )}

          {mode === 'edit' && onModeChange && (
            <button
              type="button"
              className="eg-btn eg-btn-default"
              onClick={() => onModeChange('view')}
              disabled={saving}
            >
              취소
            </button>
          )}
          {mode === 'create' && (
            <button
              type="button"
              className="eg-btn eg-btn-default"
              onClick={onClose}
              disabled={saving}
            >
              취소
            </button>
          )}
          {mode === 'view' && (
            <button
              type="button"
              className="eg-btn eg-btn-default"
              onClick={onClose}
              disabled={saving}
            >
              닫기
            </button>
          )}

          {isEdit && onSave && (
            <button
              type="button"
              className="eg-btn eg-btn-primary"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
