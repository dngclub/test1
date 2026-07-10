/**
 * StandalonePasswordChangeModal — 비밀번호 변경 강제 모달.
 *
 * 표시 조건:
 * - 로그인 시 password_change_required=true (기본 비번 skax1234! 사용 중)
 * - 사용자가 헤더에서 "비밀번호 변경" 클릭
 *
 * 정책 (CHAT.md 2026-05-20 Q3):
 * - 최소 6자
 * - skax1234! 거부
 * - 현재 비번과 동일 거부 (서버에서 검증)
 * - 새 비번 == 확인 비번
 *
 * forceChange=true 면 닫기 버튼 비활성 — 변경 완료 전까지 화면 진입 차단.
 */
import { useState } from 'react'
import api from '../../lib/api'

interface Props {
  /** 강제 변경 모드 — true 면 닫기 불가, 변경 성공해야만 onSuccess 호출 */
  forceChange?: boolean
  /** 현재 비밀번호 사전 입력값 (로그인 직후 호출 시) */
  currentPassword?: string
  /** 변경 성공 콜백 */
  onSuccess: () => void
  /** 닫기 콜백 (forceChange=false 일 때만) */
  onClose?: () => void
}

export default function StandalonePasswordChangeModal({
  forceChange = false,
  currentPassword = '',
  onSuccess,
  onClose,
}: Props) {
  const [current, setCurrent] = useState<string>(currentPassword)
  const [next, setNext] = useState<string>('')
  const [confirm, setConfirm] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!current || !next || !confirm) {
      setError('모든 필드를 입력하세요.')
      return
    }
    if (next.length < 6) {
      setError('새 비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }
    if (next === 'skax1234!') {
      setError('기본 비밀번호는 사용할 수 없습니다.')
      return
    }
    if (next !== confirm) {
      setError('새 비밀번호와 확인이 일치하지 않습니다.')
      return
    }
    if (next === current) {
      setError('새 비밀번호가 현재 비밀번호와 동일합니다.')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/auth/change-password', {
        current_password: current,
        new_password: next,
      })
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.detail || '비밀번호 변경에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sa-pwch-backdrop">
      <form className="sa-pwch-modal" onSubmit={handleSubmit}>
        <div className="sa-pwch-header">
          <h2>{forceChange ? '🔒 비밀번호 변경 (필수)' : '🔑 비밀번호 변경'}</h2>
          {!forceChange && (
            <button type="button" className="sa-pwch-close" onClick={onClose}>✕</button>
          )}
        </div>
        <div className="sa-pwch-body">
          {forceChange && (
            <div className="sa-pwch-notice">
              <b>최초 로그인</b> 또는 <b>기본 비밀번호</b> 사용이 감지되었습니다.<br/>
              계정 보안을 위해 새 비밀번호를 설정해 주세요.
            </div>
          )}

          <div className="sa-pwch-field">
            <label>현재 비밀번호</label>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              disabled={loading || (forceChange && !!currentPassword)}
              required
            />
          </div>

          <div className="sa-pwch-field">
            <label>새 비밀번호 <span className="sa-pwch-req">*</span></label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              disabled={loading}
              minLength={6}
              required
              autoFocus
            />
            <div className="sa-pwch-hint">최소 6자, 'skax1234!' 사용 불가</div>
          </div>

          <div className="sa-pwch-field">
            <label>새 비밀번호 확인 <span className="sa-pwch-req">*</span></label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
              minLength={6}
              required
            />
          </div>

          {error && <div className="sa-pwch-error">⚠ {error}</div>}
        </div>
        <div className="sa-pwch-footer">
          {!forceChange && (
            <button
              type="button"
              className="sa-pwch-btn sa-pwch-btn-default"
              onClick={onClose}
              disabled={loading}
            >취소</button>
          )}
          <button
            type="submit"
            className="sa-pwch-btn sa-pwch-btn-primary"
            disabled={loading}
          >
            {loading ? '변경 중...' : '변경'}
          </button>
        </div>
      </form>
    </div>
  )
}
