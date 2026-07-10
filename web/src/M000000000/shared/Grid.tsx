/**
 * Grid — 표준 목록 그리드 (78 차 08, 2026-05-17).
 *
 * 공유 컴포넌트 (권장). 자체 grid 가 필요한 특수 UI 는 직접 작성 가능하지만,
 * 일반 CRUD 목록은 본 컴포넌트 사용을 권장한다.
 *
 * 기능:
 *   - 헤더 sticky + body 만 스크롤 (visibleRows 행 정도 보이는 고정 높이)
 *   - 전체/행별 체크박스 (selectable=true)
 *   - 행 클릭 콜백 (onRowClick) — 상세 모달 열기 패턴
 *   - 페이지네이션 (기본 페이지당 10행)
 *   - 페이지당 행 수 선택 (PAGE_SIZE_OPTIONS = [10, 20, 50, 100])
 *   - toolbar 슬롯 (좌/우)
 *   - row 단위 클래스 커스터마이즈 (rowClassName)
 *
 * 사용 예:
 * ```tsx
 * const cols: GridColumn<Row>[] = [
 *   { key: 'title', header: '제목', render: (r) => r.title },
 *   { key: 'created', header: '작성일', width: 110, render: (r) => fmtDate(r.created_at) },
 * ]
 * <Grid
 *   columns={cols}
 *   rows={items}
 *   rowKey={(r) => r.id}
 *   loading={loading}
 *   onRowClick={openDetail}
 *   selectable
 *   selectedKeys={selected}
 *   onSelectionChange={setSelected}
 *   toolbarRight={<button onClick={handleBulkDelete}>선택 삭제</button>}
 * />
 * ```
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Pagination from './Pagination'

export interface GridColumn<T> {
  /** 컬럼 식별자 (React key + 데이터 접근 용도). */
  key: string
  /** 헤더 표시 텍스트. */
  header: string
  /** 컬럼 너비 (number=px, string=CSS). 미지정 시 flex 분배. */
  width?: number | string
  /** 셀 정렬. 기본 'center', 텍스트가 긴 컬럼은 'left' 권장. */
  align?: 'left' | 'center' | 'right'
  /** 셀 내용 렌더러. 미지정 시 (row as any)[key] 출력. */
  render?: (row: T) => ReactNode
  /** 헤더 추가 클래스. */
  headerClassName?: string
  /** 셀 추가 클래스 (행 단위 함수 가능). */
  cellClassName?: string | ((row: T) => string)
}

export interface GridProps<T> {
  columns: GridColumn<T>[]
  rows: T[]
  /** React key 및 selection key 생성기 — 행 고유 식별자 필수. */
  rowKey: (row: T) => string
  loading?: boolean
  /** 비어 있을 때 표시 텍스트. 기본 '조회된 데이터가 없습니다.'. */
  emptyMessage?: string
  /** 행 클릭 콜백 — 상세 모달 열기 등. */
  onRowClick?: (row: T) => void
  /** 체크박스 컬럼 노출 여부. 기본 false. */
  selectable?: boolean
  /** 선택된 키 집합 (controlled). selectable=true 일 때 필수. */
  selectedKeys?: Set<string>
  /** 선택 변경 콜백. selectable=true 일 때 필수. */
  onSelectionChange?: (next: Set<string>) => void
  /** 페이지당 행 수. 기본 15. */
  pageSize?: number
  /** 페이지 사이즈 옵션. 기본 [10, 20, 50, 100]. */
  pageSizeOptions?: number[]
  /** 페이지 사이즈 변경 시 통보. */
  onPageSizeChange?: (size: number) => void
  /** 본문 영역 가시 행 수 (헤더 sticky + 본문 고정 높이). 기본 15. */
  visibleRows?: number
  /** 상단 좌측 toolbar (예: 총건수 / 안내 문구). */
  toolbarLeft?: ReactNode
  /** 상단 우측 toolbar (예: 등록/삭제/엑셀 버튼). */
  toolbarRight?: ReactNode
  /** 행 단위 추가 클래스 (강조 등). */
  rowClassName?: (row: T) => string | undefined
}

const DEFAULT_PAGE_SIZE = 15
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
// 평균 행 높이 (px) — visibleRows × ROW_HEIGHT 로 본문 영역 높이 결정.
// 셀 padding 6px*2 + 내용 ~22px = 약 34px. 여유 1px 추가.
const ROW_HEIGHT = 35
const HEADER_HEIGHT = 38

export default function Grid<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyMessage = '조회된 데이터가 없습니다.',
  onRowClick,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  pageSize: pageSizeProp,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onPageSizeChange,
  visibleRows = 15,
  toolbarLeft,
  toolbarRight,
  rowClassName,
}: GridProps<T>) {
  // 페이지 사이즈는 내부 state — 상위에서 onPageSizeChange 로 통보만 받는다.
  const [pageSize, setPageSize] = useState<number>(pageSizeProp ?? DEFAULT_PAGE_SIZE)
  const [currentPage, setCurrentPage] = useState(1)

  // 외부에서 pageSizeProp 이 바뀌면 동기화.
  useEffect(() => {
    if (pageSizeProp !== undefined && pageSizeProp !== pageSize) {
      setPageSize(pageSizeProp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSizeProp])

  // rows 가 바뀌면 currentPage 보정 (검색 후 1페이지로).
  useEffect(() => {
    setCurrentPage(1)
  }, [rows])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(rows.length / pageSize)),
    [rows.length, pageSize],
  )
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const pagedRows = useMemo(
    () => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [rows, currentPage, pageSize],
  )

  // ── 선택 ────────────────────────────────────────
  const sel = selectedKeys ?? new Set<string>()
  const pageKeys = useMemo(() => pagedRows.map(rowKey), [pagedRows, rowKey])
  const allSelectedOnPage =
    pageKeys.length > 0 && pageKeys.every((k) => sel.has(k))

  const toggleSelectAllOnPage = () => {
    if (!onSelectionChange) return
    const next = new Set(sel)
    if (allSelectedOnPage) pageKeys.forEach((k) => next.delete(k))
    else pageKeys.forEach((k) => next.add(k))
    onSelectionChange(next)
  }
  const toggleSelectOne = (k: string) => {
    if (!onSelectionChange) return
    const next = new Set(sel)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    onSelectionChange(next)
  }

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const n = Number(e.target.value)
    setPageSize(n)
    setCurrentPage(1)
    onPageSizeChange?.(n)
  }

  const bodyHeight = visibleRows * ROW_HEIGHT
  const colCount = columns.length + (selectable ? 1 : 0)

  return (
    <div className="eg-grid-wrap">
      {/* 상단 toolbar */}
      <div className="eg-grid-head">
        <div className="eg-grid-head-left">
          {toolbarLeft ?? <span>총 {rows.length}건</span>}
          {loading && <span className="eg-loading"> · 불러오는 중…</span>}
        </div>
        <div className="eg-grid-head-right">
          {toolbarRight}
          <label className="eg-page-size">
            <span>페이지당</span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              aria-label="페이지당 행 수"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* sticky header + scrollable body */}
      <div
        className="eg-grid-scroll"
        style={{
          maxHeight: bodyHeight + HEADER_HEIGHT,
          minHeight: HEADER_HEIGHT + ROW_HEIGHT,
        }}
      >
        <table className="eg-grid">
          <thead>
            <tr>
              {selectable && (
                <th className="eg-grid-check" style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={allSelectedOnPage}
                    onChange={toggleSelectAllOnPage}
                    aria-label="현재 페이지 전체 선택"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.headerClassName}
                  style={{
                    width: col.width,
                    textAlign: col.align ?? 'center',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="eg-empty">
                  {loading ? '불러오는 중…' : emptyMessage}
                </td>
              </tr>
            ) : (
              pagedRows.map((row) => {
                const key = rowKey(row)
                const isSel = sel.has(key)
                const customClass = rowClassName?.(row) ?? ''
                const cls = [
                  isSel ? 'sel' : '',
                  onRowClick ? 'clickable' : '',
                  customClass,
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <tr
                    key={key}
                    className={cls}
                    onClick={(e) => {
                      // 체크박스 셀 클릭은 행 클릭으로 전파하지 않음
                      const tgt = e.target as HTMLElement
                      if (tgt.closest('.eg-grid-check')) return
                      onRowClick?.(row)
                    }}
                  >
                    {selectable && (
                      <td
                        className="eg-grid-check"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleSelectOne(key)}
                          aria-label="행 선택"
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const cellCls =
                        typeof col.cellClassName === 'function'
                          ? col.cellClassName(row)
                          : col.cellClassName
                      return (
                        <td
                          key={col.key}
                          className={cellCls}
                          style={{ textAlign: col.align ?? 'center' }}
                        >
                          {col.render
                            ? col.render(row)
                            : ((row as unknown as Record<string, unknown>)[col.key] as ReactNode) ?? ''}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onChange={setCurrentPage}
      />
    </div>
  )
}
