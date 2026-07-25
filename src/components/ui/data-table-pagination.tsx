import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataTablePaginationProps {
  page: number;
  totalPages: number;
  totalRows: number;
  pageStart: number;
  pageSize: number;
  onChange: (p: number) => void;
}

export function DataTablePagination({
  page,
  totalPages,
  totalRows,
  pageStart,
  pageSize,
  onChange,
}: DataTablePaginationProps) {
  const from = pageStart + 1;
  const to = Math.min(pageStart + pageSize, totalRows);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#0D0D0D]/10 text-xs text-[#0D0D0D]/60">
      <div>
        Mostrando{" "}
        <span className="font-semibold text-[#0D0D0D]">{from}</span>
        {"–"}
        <span className="font-semibold text-[#0D0D0D]">{to}</span> de{" "}
        <span className="font-semibold text-[#0D0D0D]">{totalRows}</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center justify-center h-8 w-8 border border-[#0D0D0D]/15 text-[#0D0D0D]/70 hover:border-brand-navy hover:text-brand-navy disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageItems(page, totalPages).map((item, i) =>
          item === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="inline-flex items-center justify-center h-8 w-8 text-[#0D0D0D]/40"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onChange(item)}
              className={`inline-flex items-center justify-center h-8 min-w-[32px] px-2 text-xs font-medium border transition-colors ${
                item === page
                  ? "bg-brand-navy text-white border-brand-navy"
                  : "bg-white text-[#0D0D0D]/70 border-[#0D0D0D]/15 hover:border-brand-navy hover:text-brand-navy"
              }`}
            >
              {item}
            </button>
          ),
        )}

        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center justify-center h-8 w-8 border border-[#0D0D0D]/15 text-[#0D0D0D]/70 hover:border-brand-navy hover:text-brand-navy disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function getPageItems(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) items.push("...");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push("...");

  items.push(total);
  return items;
}
