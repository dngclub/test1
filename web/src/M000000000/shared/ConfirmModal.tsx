/**
 * ConfirmModal — 표준 확인 대화상자 (78 차 08, 2026-05-17).
 *
 * 브라우저 기본 confirm() 금지 (CLAUDE.md §6.1). 본 모달 사용 권장.
 *
 * 사용 (선언적):
 * ```tsx
 * const [confirm, setConfirm] = useState<ConfirmState>(EMPTY_CONFIRM)
 * <ConfirmModal state={confirm} onClose={() => setConfirm(EMPTY_CONFIRM)} />
 *
 * setConfirm({
 *   open: true,
 *   title: '삭제 확인',
 *   message: `선택한 ${n}건을 삭제하시겠습니까?`,
 *   variant: 'danger',
 *   onConfirm: async () => { ...; setConfirm(EMPTY_CONFIRM) },
 * })
 * ```
 */
import { useEffect } from 'react'

export interface ConfirmState {
  open: boolean
  title: string
  message: string
  variant?: 'default' | 'danger'
  confirmText?: string
  cancelText?: string
  onConfirm: (() => void | Promise<void>) | null
}

export const EMPTY_CONFIRM: ConfirmState = {
  open: false,
  title: '',
  message: '',
  onConfirm: null,
}

export interface ConfirmModalProps {
  state: ConfirmState
  onClose: () => void
  /** 처리 중 표시 — confirm 버튼 disabled + 텍스트 변경. */
  busy?: boolean
}

export default function ConfirmModal({
  state,
  onClose,
  busy = false,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!state.open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state.open, busy, onClose])

  if (!state.open) return null

  const variant = state.variant ?? 'default'
  const confirmText = state.confirmText ?? '확인'
  const cancelText = state.cancelText ?? '취소'

  return (
    <div
      className="eg-confirm-backdrop"
      onClick={() => {
        if (busy) return
        onClose()
      }}
    >
      <div
        className="eg-confirm"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="eg-confirm-header">
          <h2>{state.title}</h2>
          <button
            type="button"
            className="eg-confirm-close"
            onClick={onClose}
            disabled={busy}
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div className="eg-confirm-body">
          <p>{state.message}</p>
        </div>
        <div className="eg-confirm-footer">
          <button
            type="button"
            className="eg-btn eg-btn-default"
            onClick={onClose}
            disabled={busy}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={
              variant === 'danger'
                ? 'eg-btn eg-btn-danger'
                : 'eg-btn eg-btn-primary'
            }
            onClick={() => state.onConfirm?.()}
            disabled={busy}
          >
            {busy ? '처리 중…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
