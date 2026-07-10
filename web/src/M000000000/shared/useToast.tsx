/**
 * useToast — 표준 토스트 훅 + 표시 컴포넌트 (78 차 08, 2026-05-17).
 *
 * 사용:
 * ```tsx
 * const { toasts, show } = useToast()
 * show('success', '저장되었습니다.')
 * <ToastStack toasts={toasts} />
 * ```
 */
import { useCallback, useRef, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  type: ToastType
  message: string
}

export function useToast(durationMs = 3000) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)
  const show = useCallback(
    (type: ToastType, message: string) => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, type, message }])
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        durationMs,
      )
    },
    [durationMs],
  )
  return { toasts, show }
}

export function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="eg-toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`eg-toast eg-toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
