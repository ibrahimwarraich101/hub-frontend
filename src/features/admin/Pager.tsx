// File purpose: "Previous / Page X of Y / Next" for admin lists.
export function Pager({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  return (
    <div className="adm-pager">
      <button type="button" className="hub-button secondary small" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <span>Page {page} of {pages}</span>
      <button type="button" className="hub-button secondary small" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  )
}
