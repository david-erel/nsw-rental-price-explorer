import type { RentalBond, SortField, SortDir } from "../types";
import { DWELLING_TYPE_LABELS } from "../types";
import { formatCurrency, PAGE_SIZE } from "../utils";

interface DataTableProps {
  items: RentalBond[];
  paginate: boolean;
  page: number;
  pageSize: number;
  sortField: SortField;
  sortDir: SortDir;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSort: (field: SortField) => void;
}

export function DataTable({
  items,
  paginate,
  page,
  pageSize,
  sortField,
  sortDir,
  onPageChange,
  onPageSizeChange,
  onSort,
}: DataTableProps) {
  const start = paginate ? page * pageSize : 0;
  const pageItems = paginate ? items.slice(start, start + pageSize) : items.slice(0, PAGE_SIZE);
  const totalPages = paginate ? Math.ceil(items.length / pageSize) : 1;

  const sortIndicator = (field: SortField) => (sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  return (
    <>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th
              className={`sticky top-0 bg-indigo-50 dark:bg-indigo-950 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-indigo-100 dark:border-indigo-900 cursor-pointer select-none transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${sortField === "lodgementDate" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}
              onClick={() => onSort("lodgementDate")}
            >
              Date{sortIndicator("lodgementDate")}
            </th>
            <th
              className={`sticky top-0 bg-indigo-50 dark:bg-indigo-950 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-indigo-100 dark:border-indigo-900 cursor-pointer select-none transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${sortField === "postcode" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}
              onClick={() => onSort("postcode")}
            >
              Postcode{sortIndicator("postcode")}
            </th>
            <th
              className={`sticky top-0 bg-indigo-50 dark:bg-indigo-950 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-indigo-100 dark:border-indigo-900 cursor-pointer select-none transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${sortField === "dwellingType" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}
              onClick={() => onSort("dwellingType")}
            >
              Type{sortIndicator("dwellingType")}
            </th>
            <th
              className={`sticky top-0 bg-indigo-50 dark:bg-indigo-950 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-indigo-100 dark:border-indigo-900 cursor-pointer select-none transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${sortField === "bedrooms" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}
              onClick={() => onSort("bedrooms")}
            >
              Beds{sortIndicator("bedrooms")}
            </th>
            <th
              className={`sticky top-0 bg-indigo-50 dark:bg-indigo-950 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-indigo-100 dark:border-indigo-900 cursor-pointer select-none transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${sortField === "weeklyRent" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}
              onClick={() => onSort("weeklyRent")}
            >
              Weekly Rent{sortIndicator("weeklyRent")}
            </th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((r, i) => (
            <tr
              key={start + i}
              className={`hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 ${(start + i) % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/70 dark:bg-gray-800/50"}`}
            >
              <td className="px-4 py-2.5 text-sm border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                {r.lodgementDate}
              </td>
              <td className="px-4 py-2.5 text-sm border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                {r.postcode}
              </td>
              <td className="px-4 py-2.5 text-sm border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                {DWELLING_TYPE_LABELS[r.dwellingType] ?? r.dwellingType}
              </td>
              <td className="px-4 py-2.5 text-sm border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                {r.bedrooms == null ? "–" : r.bedrooms === 0 ? "Studio" : r.bedrooms}
              </td>
              <td className="px-4 py-2.5 text-sm border-b border-gray-100 dark:border-gray-800 font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                {formatCurrency(r.weeklyRent)}/wk
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {paginate && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="w-28" />
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm cursor-pointer transition-colors hover:enabled:bg-gray-100 dark:hover:enabled:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {totalPages > 1 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {page + 1} of {totalPages}
              </span>
            )}
            <button
              disabled={page >= totalPages - 1}
              onClick={() => onPageChange(page + 1)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm cursor-pointer transition-colors hover:enabled:bg-gray-100 dark:hover:enabled:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="relative w-28 flex justify-end">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="appearance-none pl-3 pr-7 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 cursor-pointer transition-colors hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:border-indigo-600"
            >
              <option value={10}>10 rows</option>
              <option value={20}>20 rows</option>
              <option value={50}>50 rows</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[0.6rem] text-gray-400 dark:text-gray-500">
              &#9660;
            </span>
          </div>
        </div>
      )}
    </>
  );
}
