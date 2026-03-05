import { formatCurrency } from "../utils";

interface StatsPanelProps {
  stats: { min: number; avg: number; max: number } | null;
  filterSummary: string;
}

export function StatsPanel({ stats, filterSummary }: StatsPanelProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl px-5 py-4 mb-5 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
          Summary for <span className="text-indigo-600 dark:text-indigo-400">{filterSummary}</span>
        </h3>
      </div>
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-indigo-50 dark:bg-indigo-950/60 rounded-lg px-4 py-3.5 border border-indigo-100 dark:border-indigo-900">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Min Rent
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(stats.min)}/wk</div>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-950/60 rounded-lg px-4 py-3.5 border border-indigo-100 dark:border-indigo-900">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Avg Rent
            </div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(stats.avg)}/wk
            </div>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-950/60 rounded-lg px-4 py-3.5 border border-indigo-100 dark:border-indigo-900">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
              Max Rent
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(stats.max)}/wk</div>
          </div>
        </div>
      )}
    </div>
  );
}
