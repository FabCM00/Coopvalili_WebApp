interface PaginatorProps {
  page: number;
  totalPages: number;
  totalRows: number;
  pageStart: number;
  pageSize: number;
  onChange: (p: number) => void;
}

export function Paginator({
  page,
  totalPages,
  totalRows,
  pageStart,
  pageSize,
  onChange,
}: PaginatorProps) {
  const from = pageStart + 1;
  const to = Math.min(pageStart + pageSize, totalRows);

  return (
    <div className="flex-shrink-0 border-t border-[#0D0D0D]/10 px-3 py-2 flex items-center justify-between">
      <span className="text-[10px] text-[#0D0D0D]/40">
        {from}–{to} de {totalRows}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="h-6 w-6 flex items-center justify-center border border-[#0D0D0D]/12 text-[#0D0D0D]/50 hover:border-[#012340] hover:text-[#012340] disabled:opacity-30 disabled:cursor-not-allowed text-xs"
        >
          ‹
        </button>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="h-6 w-6 flex items-center justify-center border border-[#0D0D0D]/12 text-[#0D0D0D]/50 hover:border-[#012340] hover:text-[#012340] disabled:opacity-30 disabled:cursor-not-allowed text-xs"
        >
          ›
        </button>
      </div>
    </div>
  );
}
