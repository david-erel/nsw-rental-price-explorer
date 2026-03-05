import { useEffect, useMemo, useState } from "react";
import type { RentalBond, Filters, GroupByField, SortField, SortDir, ThemeMode, RentBin } from "./types";
import { DWELLING_TYPE_LABELS, BEDROOM_OPTIONS, MONTH_CATALOG } from "./types";
import {
  RENT_ABS_MIN,
  RENT_ABS_MAX,
  CHART_BIN_COUNT,
  THEME_STORAGE_KEY,
  applyDarkClass,
  median,
  formatCurrency,
  groupLabel,
  getPostcodeRegion,
  groupStats,
  filterBonds,
  sortBonds,
  groupBonds,
} from "./utils";
import { useRentalData } from "./hooks/useRentalData";
import { HistogramChart, BubbleMatrix } from "./components/Charts";
import { DataTable } from "./components/DataTable";
import { FilterPanel } from "./components/FilterPanel";
import { StatsPanel } from "./components/StatsPanel";
import { ThemeDropdown } from "./components/ThemeDropdown";
import "./App.css";

export default function App() {
  const {
    data,
    loading,
    error,
    setError,
    selectedMonth,
    localMonths,
    downloading,
    handleMonthChange,
    handleDownload,
    handleCancelDownload,
  } = useRentalData();

  const [filters, setFilters] = useState<Filters>({
    dwellingTypes: [],
    bedrooms: [],
    postcodes: [],
    rentMin: RENT_ABS_MIN,
    rentMax: RENT_ABS_MAX,
  });
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupByField>("none");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>("weeklyRent");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(10);
  const [viewTab, setViewTab] = useState<"table" | "graphs">("table");
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    return stored ?? "system";
  });

  useEffect(() => {
    if (themeMode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyDarkClass("system");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [themeMode]);

  function handleThemeChange(mode: ThemeMode) {
    applyDarkClass(mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    setThemeMode(mode);
  }

  const filtered = useMemo(() => filterBonds(data, filters), [data, filters]);

  const sorted = useMemo(() => sortBonds(filtered, sortField, sortDir), [filtered, sortField, sortDir]);

  const grouped = useMemo(() => groupBonds(sorted, groupBy), [sorted, groupBy]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const rents = filtered.map((r) => r.weeklyRent);
    return {
      count: filtered.length,
      avg: rents.reduce((s, v) => s + v, 0) / rents.length,
      median: median(rents),
      min: Math.min(...rents),
      max: Math.max(...rents),
    };
  }, [filtered]);

  const chartGroupBy: GroupByField = groupBy;

  const { chartBins, chartGroupKeys } = useMemo(() => {
    if (filtered.length === 0) return { chartBins: [], chartGroupKeys: [] };

    const chartData = filtered.filter((r) => r.bedrooms === null || r.bedrooms <= 10);
    if (chartData.length === 0) return { chartBins: [], chartGroupKeys: [] };

    const rents = chartData.map((r) => r.weeklyRent);
    const minRent = Math.min(...rents);
    const maxRent = Math.max(...rents);
    const step = Math.ceil((maxRent - minRent) / CHART_BIN_COUNT / 25) * 25 || 25;
    const start = Math.floor(minRent / step) * step;

    const bins: RentBin[] = [];
    for (let lo = start; lo < maxRent; lo += step) {
      const hi = lo + step;
      bins.push({
        label: `$${lo}`,
        fullLabel: `$${lo}–$${hi}`,
        midpoint: lo + step / 2,
        total: 0,
        avg: 0,
        byGroup: {},
        avgByGroup: {},
      });
    }

    const sumTotal: number[] = new Array(bins.length).fill(0);
    const sumByGroup: Record<string, number[]> = {};

    const groupKeySet = new Set<string>();
    for (const r of chartData) {
      const rent = r.weeklyRent;
      const idx = Math.min(Math.floor((rent - start) / step), bins.length - 1);
      if (idx < 0) continue;
      bins[idx].total += 1;
      sumTotal[idx] += rent;
      if (chartGroupBy !== "none") {
        let gk: string;
        if (chartGroupBy === "postcode") {
          const region = getPostcodeRegion(r.postcode);
          if (!region) continue;
          gk = `${region.lo}-${region.hi}`;
        } else {
          gk = String(r[chartGroupBy as keyof RentalBond]);
        }
        bins[idx].byGroup[gk] = (bins[idx].byGroup[gk] ?? 0) + 1;
        if (!sumByGroup[gk]) sumByGroup[gk] = new Array(bins.length).fill(0);
        sumByGroup[gk][idx] += rent;
        groupKeySet.add(gk);
      }
    }

    bins.forEach((b, i) => {
      b.avg = b.total > 0 ? Math.round(sumTotal[i] / b.total) : 0;
      for (const gk of Object.keys(b.byGroup)) {
        b.avgByGroup[gk] = b.byGroup[gk] > 0 ? Math.round(sumByGroup[gk][i] / b.byGroup[gk]) : 0;
      }
    });

    const groupKeys = [...groupKeySet].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return { chartBins: bins, chartGroupKeys: groupKeys };
  }, [filtered, chartGroupBy]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.dwellingTypes.length > 0 ||
      filters.bedrooms.length > 0 ||
      filters.postcodes.length > 0 ||
      filters.rentMin > RENT_ABS_MIN ||
      filters.rentMax < RENT_ABS_MAX
    );
  }, [filters]);

  const filterSummary = useMemo(() => {
    if (!hasActiveFilters) return "All Rental Bonds";
    const parts: string[] = [];
    if (filters.dwellingTypes.length > 0) {
      parts.push(filters.dwellingTypes.map((t) => DWELLING_TYPE_LABELS[t] ?? t).join(", "));
    }
    if (filters.bedrooms.length > 0) {
      const labels = filters.bedrooms
        .map((b) => BEDROOM_OPTIONS.find((o) => o.value === b)?.label ?? `${b} Bed`)
        .join(", ");
      parts.push(labels);
    }
    if (filters.postcodes.length > 0) {
      parts.push(`postcodes ${filters.postcodes.join(", ")}`);
    }
    const rentChanged = filters.rentMin > RENT_ABS_MIN || filters.rentMax < RENT_ABS_MAX;
    if (rentChanged) {
      const maxLabel =
        filters.rentMax >= RENT_ABS_MAX ? formatCurrency(filters.rentMax) + "+" : formatCurrency(filters.rentMax);
      parts.push(`${formatCurrency(filters.rentMin)} – ${maxLabel}/wk`);
    }
    return parts.join(" · ");
  }, [filters, hasActiveFilters]);

  useEffect(() => setPage(0), [filters, groupBy, sortField, sortDir, pageSize]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function resetFilters() {
    setFilters({
      dwellingTypes: [],
      bedrooms: [],
      postcodes: [],
      rentMin: RENT_ABS_MIN,
      rentMax: RENT_ABS_MAX,
    });
  }

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400">
        <div className="spinner" />
        Loading rental bond data...
      </div>
    );

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <header className="mb-6">
            <div className="flex items-center justify-between gap-3 mb-0.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 shadow-sm shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6 text-white"
                  >
                    <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
                    <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a1.03 1.03 0 0 0 .091-.086L12 5.432Z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">NSW Rental Price Explorer</h1>
              </div>
              <ThemeDropdown mode={themeMode} onChange={handleThemeChange} />
            </div>
            <div className="text-gray-500 dark:text-gray-400 text-sm mt-1 flex items-center gap-1.5 flex-wrap">
              <span>Bond lodgements from</span>
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded px-2 py-0.5 text-sm cursor-pointer focus:outline-none focus:border-indigo-600"
              >
                {MONTH_CATALOG.filter((m) => import.meta.env.DEV || localMonths.has(m.key)).map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                    {!localMonths.has(m.key) ? " (download required)" : ""}
                  </option>
                ))}
              </select>
              {import.meta.env.DEV && !localMonths.has(selectedMonth) && (
                <button
                  onClick={handleDownload}
                  className="px-2.5 py-0.5 bg-indigo-600 text-white text-xs font-semibold rounded cursor-pointer hover:bg-indigo-700 transition-colors"
                >
                  Download
                </button>
              )}
              <span>
                &middot; Source:{" "}
                <a
                  href="https://nsw.gov.au/housing-and-construction/rental-forms-surveys-and-data/rental-bond-data"
                  target="_blank"
                  rel="noopener"
                  className="text-indigo-600 hover:underline"
                >
                  NSW Fair Trading
                </a>
              </span>
            </div>
          </header>

          {error && data.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-700 dark:hover:text-red-300 text-lg leading-none px-1 cursor-pointer"
              >
                &times;
              </button>
            </div>
          )}

          <FilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            filtersOpen={filtersOpen}
            onToggleOpen={() => setFiltersOpen((o) => !o)}
            hasActiveFilters={hasActiveFilters}
            onReset={resetFilters}
          />

          {data.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center py-16 px-8 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-12 h-12 text-indigo-200 dark:text-indigo-900 mb-4"
              >
                <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
                <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a1.03 1.03 0 0 0 .091-.086L12 5.432Z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">No data loaded</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm">
                Select a month above and click{" "}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">Download</span> to fetch rental
                bond data from NSW Fair Trading.
              </p>
            </div>
          ) : (
            <>
              <StatsPanel stats={stats} filterSummary={filterSummary} />

              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Card header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {filtered.length.toLocaleString()} result
                    {filtered.length !== 1 ? "s" : ""} out of {data.length.toLocaleString()} bond lodgements
                  </h2>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Group by
                    <div className="relative">
                      <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value as GroupByField)}
                        className="appearance-none pl-3 pr-8 py-1.5 min-h-[34px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 font-normal cursor-pointer transition-colors hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/10"
                      >
                        <option value="none">None</option>
                        <option value="dwellingType">Dwelling Type</option>
                        <option value="bedrooms">Bedrooms</option>
                        <option value="postcode">{viewTab === "graphs" ? "Postcode Region" : "Postcode"}</option>
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.6rem] text-gray-400 dark:text-gray-500">
                        &#9660;
                      </span>
                    </div>
                  </label>
                </div>

                {/* Tab strip */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5">
                  {(["table", "graphs"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setViewTab(tab)}
                      className={`px-4 py-2.5 text-sm font-semibold capitalize border-b-2 -mb-px transition-colors cursor-pointer ${
                        viewTab === tab
                          ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      {tab === "table" ? "Table" : "Graphs"}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {viewTab === "table" ? (
                  grouped ? (
                    grouped.map(([key, items]) => {
                      const s = groupStats(items);
                      const isOpen = expandedGroups.has(key);
                      return (
                        <div key={key} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                          <div
                            className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800/50 cursor-pointer select-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={() => toggleGroup(key)}
                          >
                            <h3 className="text-[0.95rem] font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                              <span
                                className={`inline-block text-[0.7rem] text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                              >
                                &#9654;
                              </span>
                              {groupLabel(groupBy, key)}
                              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                {items.length.toLocaleString()}
                              </span>
                            </h3>
                            <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                              <span className="whitespace-nowrap">Avg {formatCurrency(s.avg)}/wk</span>
                              <span className="whitespace-nowrap">Median {formatCurrency(s.median)}/wk</span>
                            </div>
                          </div>
                          {isOpen && (
                            <DataTable
                              items={items}
                              paginate={false}
                              page={0}
                              pageSize={pageSize}
                              sortField={sortField}
                              sortDir={sortDir}
                              onPageChange={setPage}
                              onPageSizeChange={setPageSize}
                              onSort={toggleSort}
                            />
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <DataTable
                      items={sorted}
                      paginate={true}
                      page={page}
                      pageSize={pageSize}
                      sortField={sortField}
                      sortDir={sortDir}
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                      onSort={toggleSort}
                    />
                  )
                ) : (
                  <div className="p-5 space-y-8 bg-white dark:bg-gray-900">
                    <HistogramChart bins={chartBins} groupKeys={chartGroupKeys} groupBy={chartGroupBy} />
                    {chartGroupBy !== "none" && chartGroupKeys.length > 0 && (
                      <BubbleMatrix bins={chartBins} groupKeys={chartGroupKeys} groupBy={chartGroupBy} />
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {downloading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="spinner" />
          <p className="text-white text-lg font-medium mt-4">Downloading and processing...</p>
          <button
            onClick={handleCancelDownload}
            className="mt-4 px-4 py-2 bg-white text-gray-900 rounded-md font-medium cursor-pointer hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
