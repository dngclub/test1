/**
 * Pagination — Grid 와 동일한 페이저. 5페이지 ±2 윈도우 + «‹ ›» 4가지 점프 버튼.
 */

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onChange: (page: number) => void
}

const WINDOW = 2

export default function Pagination({
  currentPage,
  totalPages,
  onChange,
}: PaginationProps) {
  if (totalPages <= 0) return null

  let from = Math.max(1, currentPage - WINDOW)
  let to = Math.min(totalPages, currentPage + WINDOW)
  if (to - from < WINDOW * 2) {
    if (from === 1) to = Math.min(totalPages, from + WINDOW * 2)
    else if (to === totalPages) from = Math.max(1, to - WINDOW * 2)
  }
  const pages: number[] = []
  for (let i = from; i <= to; i += 1) pages.push(i)

  return (
    <nav className="eg-pager" aria-label="페이지 네비게이션">
      <button
        type="button"
        onClick={() => onChange(1)}
        disabled={currentPage === 1}
        aria-label="첫 페이지"
      >
        «
      </button>
      <button
        type="button"
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="이전 페이지"
      >
        ‹
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={p === currentPage ? 'active' : ''}
          onClick={() => onChange(p)}
          aria-current={p === currentPage ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="다음 페이지"
      >
        ›
      </button>
      <button
        type="button"
        onClick={() => onChange(totalPages)}
        disabled={currentPage === totalPages}
        aria-label="마지막 페이지"
      >
        »
      </button>
    </nav>
  )
}
