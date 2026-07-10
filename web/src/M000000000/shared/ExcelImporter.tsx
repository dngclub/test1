/**
 * ExcelImporter — 표준 엑셀 업로드 (78 차 09, 2026-05-17).
 *
 * 사용 흐름 (78 차 09.1 — 모달 우선):
 *   1. [엑셀 업로드] 버튼 클릭 → **업로드 모달 즉시 표시** (파일 미선택 상태)
 *   2. 모달 내 파일 드롭존을 클릭 또는 .xlsx 파일을 드래그&드롭
 *   3. ExcelJS 가 .xlsx 파싱, 첫 행을 헤더로 인식 후 headerMap 으로 필드 매핑
 *   4. 같은 모달에 **미리보기 표시 + 유효성 검사 결과** (정상/실패 건수, 실패 사유)
 *   5. 사용자가 다른 파일로 교체 가능 ([다른 파일 선택] 버튼)
 *   6. [확정 등록] 클릭 → onImport(rows) 호출 (페이지가 실제 API 처리)
 *   7. 결과 표시 (ok / fail / errors)
 *
 * 양식 정합성: Grid 의 엑셀 다운로드 양식과 동일 헤더로 작성한 .xlsx 를 업로드하면
 * 자동 매핑된다 — round-trip 보장.
 *
 * 사용 예:
 * ```tsx
 * <ExcelImporter
 *   headerMap={{
 *     '제목': 'title',
 *     '게시기간시작': 'start_date',
 *     '게시기간종료': 'end_date',
 *     '내용': 'content',
 *   }}
 *   requiredFields={['title']}
 *   onImport={async (rows) => {
 *     let ok = 0, fail = 0
 *     for (const r of rows) {
 *       try { await api.post('/api/announcements', r); ok++ }
 *       catch (e: any) { fail++ }
 *     }
 *     return { ok, fail }
 *   }}
 *   onComplete={() => fetchList()}
 * />
 * ```
 */
import { useRef, useState, type ReactNode } from 'react'
import ExcelJS from 'exceljs'

export interface ExcelImportResult {
  /** 등록 성공 건수. */
  ok: number
  /** 등록 실패 건수. */
  fail: number
  /** 행 단위 에러 메시지 (1-based 행 번호 포함 권장). 화면 표시용. */
  errors?: string[]
}

export interface ExcelImporterProps {
  /** Excel 헤더(한글) → 필드명(snake_case) 매핑. 미정의 헤더는 무시. */
  headerMap: Record<string, string>
  /** 필수 필드명. 비어 있으면 행 단위로 실패 표시 (등록 차단). */
  requiredFields?: string[]
  /** 실제 등록 처리 — 검증 통과 행만 전달. ok/fail 카운트 반환. */
  onImport: (rows: Record<string, unknown>[]) => Promise<ExcelImportResult>
  /** 등록 완료 후 호출 (목록 새로고침 등). */
  onComplete?: () => void
  /** 버튼 라벨. 기본 '엑셀 업로드'. */
  label?: ReactNode
  /** 버튼 비활성화. */
  disabled?: boolean
  /** 헤더 행 위치 (1-based). 기본 1. */
  headerRow?: number
  /** 시트 이름 또는 인덱스. 기본 0 (첫 시트). */
  sheet?: string | number
}

interface ParsedState {
  fileName: string
  rows: Record<string, unknown>[]
  /** 검증 실패 행 (등록 차단). 1-based 엑셀 행번호 + 사유. */
  invalid: { rowNo: number; reason: string }[]
  /** 정상 + 실패 합산 총 건수. */
  total: number
  /** 매핑된 필드명 목록 (테이블 헤더). */
  fields: string[]
}

export default function ExcelImporter({
  headerMap,
  requiredFields = [],
  onImport,
  onComplete,
  label = '엑셀 업로드',
  disabled = false,
  headerRow = 1,
  sheet = 0,
}: ExcelImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [parsed, setParsed] = useState<ParsedState | null>(null)
  const [parsing, setParsing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ExcelImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // ── 모달 열기/닫기 ───────────────────────────────
  const openModal = () => {
    if (disabled || busy) return
    setOpen(true)
    setParsed(null)
    setResult(null)
    setError(null)
  }
  const closeModal = () => {
    if (busy || parsing) return
    setOpen(false)
    setParsed(null)
    setResult(null)
    setError(null)
    setDragOver(false)
  }

  // ── 파일 처리 (input change / drop 공통) ─────────
  const handleFile = async (file: File) => {
    if (!file) return
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError('Excel 파일(.xlsx 또는 .xls)만 업로드할 수 있습니다.')
      setParsed(null)
      return
    }
    setError(null)
    setResult(null)
    setParsing(true)
    try {
      const parsedState = await parseExcel(file, {
        headerMap,
        requiredFields,
        headerRow,
        sheet,
      })
      setParsed(parsedState)
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
      setParsed(null)
    } finally {
      setParsing(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''  // 같은 파일 재선택 가능하도록 리셋
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleClickDropzone = () => {
    if (parsing || busy) return
    fileInputRef.current?.click()
  }

  // ── 등록 처리 ────────────────────────────────────
  const handleSubmit = async () => {
    if (busy || !parsed || parsed.rows.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const r = await onImport(parsed.rows)
      setResult(r)
      if (r.fail === 0 && r.ok > 0) {
        // 전부 성공 시 자동 닫기 + 새로고침
        onComplete?.()
        setTimeout(() => {
          closeModal()
        }, 800)
      } else if (r.ok > 0) {
        // 부분 성공 — 새로고침은 즉시
        onComplete?.()
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  // ── 렌더 ─────────────────────────────────────────
  return (
    <>
      <button
        type="button"
        className="eg-btn eg-btn-default"
        onClick={openModal}
        disabled={disabled}
        title="엑셀 양식으로 다중 등록"
      >
        {label}
      </button>

      {open && (
        <div
          className="eg-import-backdrop"
          onClick={() => {
            if (busy || parsing) return
            closeModal()
          }}
        >
          <div
            className="eg-import"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="eg-import-header">
              <h2>엑셀 업로드</h2>
              <button
                type="button"
                className="eg-import-close"
                onClick={closeModal}
                disabled={busy || parsing}
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="eg-import-body">
              {/* 파일 선택 영역 (항상 표시) */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {!parsed && !error && !result && (
                <div
                  className={`eg-import-dropzone ${dragOver ? 'is-over' : ''} ${parsing ? 'is-parsing' : ''}`}
                  onClick={handleClickDropzone}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDragOver(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDragOver(false)
                  }}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <div className="eg-import-dropzone-title">
                    {parsing
                      ? '파일을 분석 중입니다…'
                      : '클릭하여 파일을 선택하거나 여기에 끌어다 놓으세요'}
                  </div>
                  <div className="eg-import-dropzone-hint">
                    엑셀 다운로드 양식 그대로 작성한 .xlsx 파일
                  </div>
                </div>
              )}

              {/* 파싱 결과: 파일명 + 다른 파일 선택 */}
              {parsed && (
                <div className="eg-import-fileinfo">
                  <div className="eg-import-fileinfo-left">
                    <span className="eg-import-fileicon">📄</span>
                    <span className="eg-import-filename" title={parsed.fileName}>
                      {parsed.fileName}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="eg-btn eg-btn-default"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    style={{ height: 26, padding: '0 10px', fontSize: 12 }}
                  >
                    다른 파일 선택
                  </button>
                </div>
              )}

              {/* 파싱 에러 */}
              {error && (
                <div className="eg-import-error">
                  <strong>오류:</strong> {error}
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="eg-btn eg-btn-default"
                      onClick={() => {
                        setError(null)
                        setParsed(null)
                      }}
                      style={{ height: 26, padding: '0 10px', fontSize: 12 }}
                    >
                      다시 시도
                    </button>
                  </div>
                </div>
              )}

              {/* 미리보기 + 유효성 검사 결과 */}
              {parsed && (
                <>
                  <div className="eg-import-summary">
                    총 <strong>{parsed.total}</strong>건 — 정상{' '}
                    <strong className="ok">{parsed.rows.length}</strong>건
                    {parsed.invalid.length > 0 && (
                      <>
                        , 검증 실패{' '}
                        <strong className="fail">
                          {parsed.invalid.length}
                        </strong>
                        건
                      </>
                    )}
                  </div>

                  {parsed.invalid.length > 0 && (
                    <details className="eg-import-invalid" open>
                      <summary>
                        검증 실패 {parsed.invalid.length}건 — 등록 대상에서 제외
                      </summary>
                      <ul>
                        {parsed.invalid.map((v, idx) => (
                          <li key={idx}>
                            [행 {v.rowNo}] {v.reason}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {parsed.rows.length > 0 && (
                    <div className="eg-import-preview">
                      <table>
                        <thead>
                          <tr>
                            <th style={{ width: 50 }}>#</th>
                            {parsed.fields.map((f) => (
                              <th key={f}>{f}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parsed.rows.slice(0, 20).map((row, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              {parsed.fields.map((f) => (
                                <td key={f}>{formatCellValue(row[f])}</td>
                              ))}
                            </tr>
                          ))}
                          {parsed.rows.length > 20 && (
                            <tr>
                              <td
                                colSpan={parsed.fields.length + 1}
                                className="eg-import-more"
                              >
                                ... {parsed.rows.length - 20}건 더 (미리보기 상위 20건만 표시)
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* 처리 결과 */}
              {result && (
                <div
                  className={`eg-import-result ${result.fail === 0 ? 'ok' : 'partial'}`}
                >
                  <strong>처리 결과:</strong> 성공 {result.ok}건
                  {result.fail > 0 && `, 실패 ${result.fail}건`}
                  {result.errors && result.errors.length > 0 && (
                    <details>
                      <summary>실패 사유 보기</summary>
                      <ul>
                        {result.errors.map((e, idx) => (
                          <li key={idx}>{e}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>

            <div className="eg-import-footer">
              <button
                type="button"
                className="eg-btn eg-btn-default"
                onClick={closeModal}
                disabled={busy || parsing}
              >
                {result && result.ok > 0 ? '닫기' : '취소'}
              </button>
              {parsed && !result && (
                <button
                  type="button"
                  className="eg-btn eg-btn-primary"
                  onClick={handleSubmit}
                  disabled={busy || parsed.rows.length === 0}
                >
                  {busy
                    ? '등록 중…'
                    : `확정 등록 (${parsed.rows.length}건)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────
// 파싱 유틸
// ─────────────────────────────────────────────────────────

interface ParseOptions {
  headerMap: Record<string, string>
  requiredFields: string[]
  headerRow: number
  sheet: string | number
}

async function parseExcel(
  file: File,
  opts: ParseOptions,
): Promise<ParsedState> {
  const buf = await file.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf)

  const ws =
    typeof opts.sheet === 'string'
      ? wb.getWorksheet(opts.sheet)
      : wb.worksheets[opts.sheet] ?? wb.worksheets[0]
  if (!ws) {
    throw new Error('시트를 찾을 수 없습니다. 빈 워크북이거나 시트 이름이 다릅니다.')
  }

  const headerRowObj = ws.getRow(opts.headerRow)
  const headers: { col: number; field: string | null; label: string }[] = []
  headerRowObj.eachCell({ includeEmpty: false }, (cell, col) => {
    const label = String(cell.value ?? '').trim()
    if (!label) return
    const field = opts.headerMap[label] ?? null
    headers.push({ col, field, label })
  })

  if (headers.filter((h) => h.field !== null).length === 0) {
    const known = Object.keys(opts.headerMap).join(', ')
    throw new Error(
      `매칭되는 헤더가 없습니다. 다운로드한 엑셀 양식 그대로 사용해주세요.\n` +
        `인식된 헤더: ${headers.map((h) => h.label).join(', ') || '(없음)'}\n` +
        `기대 헤더: ${known}`,
    )
  }

  const rows: Record<string, unknown>[] = []
  const invalid: { rowNo: number; reason: string }[] = []
  const lastRow = ws.actualRowCount

  for (let r = opts.headerRow + 1; r <= lastRow; r += 1) {
    const row = ws.getRow(r)
    if (!row || row.cellCount === 0) continue

    const obj: Record<string, unknown> = {}
    let hasAny = false
    for (const h of headers) {
      if (!h.field) continue
      const cell = row.getCell(h.col)
      const value = normalizeCellValue(cell.value)
      if (value !== null && value !== '') hasAny = true
      obj[h.field] = value
    }
    if (!hasAny) continue

    const missing = opts.requiredFields.filter((f) => {
      const v = obj[f]
      return v === null || v === undefined || v === ''
    })
    if (missing.length > 0) {
      invalid.push({
        rowNo: r,
        reason: `필수 필드 누락: ${missing.join(', ')}`,
      })
      continue
    }

    rows.push(obj)
  }

  const fields = headers.filter((h) => h.field).map((h) => h.field as string)
  return {
    fileName: file.name,
    rows,
    invalid,
    total: rows.length + invalid.length,
    fields,
  }
}

function normalizeCellValue(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (typeof value === 'object' && value !== null && 'richText' in value) {
    const rt = (value as { richText: { text: string }[] }).richText
    return rt.map((t) => t.text).join('')
  }
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return (value as { text: string }).text
  }
  if (typeof value === 'object' && value !== null && 'result' in value) {
    return (value as { result: unknown }).result ?? null
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'string') return value.trim()
  return value
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return String(err)
}
