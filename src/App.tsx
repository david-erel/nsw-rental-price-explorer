import { useEffect, useMemo, useRef, useState } from "react";
import type { RentalBond, Filters, GroupByField, SortField, SortDir, ThemeMode, RentBin } from "./types";
import { DWELLING_TYPE_LABELS, BEDROOM_OPTIONS, MONTH_CATALOG } from "./types";
import {
  RENT_STEP,
  RENT_ABS_MIN,
  RENT_ABS_MAX,
  PAGE_SIZE,
  CHART_COLORS,
  CHART_BIN_COUNT,
  THEME_STORAGE_KEY,
  applyDarkClass,
  median,
  formatCurrency,
  groupLabel,
  logDataStats,
  parseXlsxData,
  getPostcodeRegion,
  formatPostcodeRegionKey,
  groupStats,
  filterBonds,
  sortBonds,
  groupBonds,
} from "./utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { MultiSelect } from "./components/MultiSelect";
import { TagInput } from "./components/TagInput";
import { RangeSlider } from "./components/RangeSlider";
import { ThemeDropdown } from "./components/ThemeDropdown";
import "./App.css";

// ── Staggered X-axis tick (Recharts custom tick API) ──
// Alternates labels between two vertical positions so more fit without overlap.

function StaggeredXTick({
  x = 0,
  y = 0,
  payload,
  index = 0,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
  index?: number;
}) {
  const dy = index % 2 === 0 ? 12 : 26;
  return (
    <text x={x} y={y + dy} textAnchor="middle" fill="#6b7280" fontSize={11}>
      {payload?.value}
    </text>
  );
}

// ── HistogramChart ──

interface HistogramChartProps {
  bins: RentBin[];
  groupKeys: string[];
  groupBy: GroupByField;
}

function HistogramChart({ bins, groupKeys, groupBy }: HistogramChartProps) {
  const grouped = groupBy !== "none" && groupBy !== "postcode" && groupKeys.length > 0;

  const data = bins.map((b) => {
    const entry: Record<string, number | string> = {
      label: b.label,
      fullLabel: b.fullLabel,
      avg: b.avg,
    };
    if (grouped) {
      groupKeys.forEach((k) => {
        entry[k] = b.byGroup[k] ?? 0;
        entry[`avg_${k}`] = b.avgByGroup[k] ?? 0;
      });
    } else {
      entry["count"] = b.total;
    }
    return entry;
  });

  const formatGroupLabel = (key: string) => {
    if (groupBy === "dwellingType") return DWELLING_TYPE_LABELS[key] ?? key;
    if (groupBy === "bedrooms") {
      if (key === "null") return "Unknown";
      return key === "0" ? "Studio" : `${key} Bed`;
    }
    if (groupBy === "postcode") return formatPostcodeRegionKey(key);
    return key;
  };

  // Show ~10 evenly spaced ticks on the X axis
  const xInterval = Math.max(0, Math.floor(bins.length / 10) - 1);

  // Track container width to decide whether to stagger labels
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(9999);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const stagger = containerWidth < 640;

  return (
    <div ref={containerRef}>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Rent Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="label"
            tick={stagger ? <StaggeredXTick /> : { fontSize: 11, fill: "#6b7280" }}
            interval={xInterval}
            height={stagger ? 44 : 28}
          />
          <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} width={48} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const bin = bins.find((b) => b.label === label);
              return (
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-xs space-y-1">
                  <p className="font-semibold text-gray-700">{bin?.fullLabel ?? label}</p>
                  {grouped
                    ? payload.map((p) => {
                        const gk = String(p.dataKey);
                        const avg = bin?.avgByGroup[gk];
                        return (
                          <p key={gk} style={{ color: p.color }}>
                            {formatGroupLabel(gk)}: {Number(p.value).toLocaleString()}
                            {avg ? ` — $${avg.toLocaleString()} (avg)` : ""}
                          </p>
                        );
                      })
                    : (() => {
                        const p = payload[0];
                        return (
                          <p className="text-indigo-600">
                            {Number(p?.value ?? 0).toLocaleString()} properties
                            {bin?.avg ? ` — $${bin.avg.toLocaleString()} (avg)` : ""}
                          </p>
                        );
                      })()}
                </div>
              );
            }}
          />
          {grouped && <Legend formatter={formatGroupLabel} wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />}
          {grouped ? (
            groupKeys.map((k, i) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))
          ) : (
            <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── BubbleMatrix ──

interface BubbleMatrixProps {
  bins: RentBin[];
  groupKeys: string[];
  groupBy: GroupByField;
}

function BubbleMatrix({ bins, groupKeys, groupBy }: BubbleMatrixProps) {
  const formatGroupLabel = (key: string) => {
    if (groupBy === "dwellingType") return DWELLING_TYPE_LABELS[key] ?? key;
    if (groupBy === "bedrooms") {
      if (key === "null") return "Unknown";
      return key === "0" ? "Studio" : `${key} Bed`;
    }
    if (groupBy === "postcode") return formatPostcodeRegionKey(key);
    return key;
  };

  const maxCount = useMemo(() => {
    let m = 0;
    bins.forEach((b) =>
      groupKeys.forEach((k) => {
        if ((b.byGroup[k] ?? 0) > m) m = b.byGroup[k] ?? 0;
      }),
    );
    return m;
  }, [bins, groupKeys]);

  const scatterData = useMemo(
    () =>
      groupKeys.map((key, yi) =>
        bins
          .map((b) => ({
            x: b.midpoint,
            y: yi,
            z: b.byGroup[key] ?? 0,
            label: b.label,
            fullLabel: b.fullLabel,
            avg: b.avgByGroup[key] ?? 0,
            group: key,
          }))
          .filter((d) => d.z > 0),
      ),
    [bins, groupKeys],
  );

  const yTicks = groupKeys.map((_, i) => i);
  const yTickFormatter = (i: number) => formatGroupLabel(groupKeys[i] ?? "");

  // Derive step from consecutive midpoints so we can display lower bounds
  const binStep = bins.length >= 2 ? bins[1].midpoint - bins[0].midpoint : 0;

  // Show ~10 evenly spaced X ticks
  const allMidpoints = bins.map((b) => b.midpoint);
  const xTickInterval = Math.max(1, Math.floor(allMidpoints.length / 10));
  const xTicks = allMidpoints.filter((_, i) => i % xTickInterval === 0);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Rent vs Category Bubble Matrix</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, groupKeys.length * 44 + 80)}>
        <ScatterChart margin={{ top: 8, right: 24, left: 8, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="x"
            name="Rent"
            domain={["dataMin", "dataMax"]}
            ticks={xTicks}
            tickFormatter={(v: number) => `$${Math.round(v - binStep / 2)}`}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            height={28}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Category"
            ticks={yTicks}
            tickFormatter={yTickFormatter}
            tick={{ fontSize: 11, fill: "#6b7280" }}
            width={groupBy === "postcode" ? 200 : 90}
            domain={[-0.5, groupKeys.length - 0.5]}
          />
          <ZAxis type="number" dataKey="z" range={[30, Math.min(2400, maxCount * 4 + 60)]} />
          <Tooltip
            cursor={false}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0]?.payload as
                | { x: number; fullLabel: string; group: string; z: number; avg: number }
                | undefined;
              if (!d) return null;
              return (
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow text-xs space-y-0.5">
                  <p className="font-semibold text-gray-800">{formatGroupLabel(d.group)}</p>
                  <p className="text-gray-500">{d.fullLabel}</p>
                  <p className="text-indigo-600 font-semibold">{d.z.toLocaleString()} properties</p>
                  {d.avg > 0 && <p className="text-gray-500">${d.avg.toLocaleString()} (avg)</p>}
                </div>
              );
            }}
          />
          {scatterData.map((points, i) => (
            <Scatter
              key={groupKeys[i]}
              name={formatGroupLabel(groupKeys[i])}
              data={points}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              fillOpacity={0.75}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main App ──

export default function App() {
  const [data, setData] = useState<RentalBond[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [selectedMonth, setSelectedMonth] = useState("2025-01");
  const [localMonths, setLocalMonths] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [viewTab, setViewTab] = useState<"table" | "graphs">("table");
  const abortRef = useRef<AbortController | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    return stored ?? "system";
  });

  // Re-apply when system preference changes (only relevant in "system" mode)
  useEffect(() => {
    if (themeMode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyDarkClass("system");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [themeMode]);

  function handleThemeChange(mode: ThemeMode) {
    applyDarkClass(mode); // synchronous DOM update
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    setThemeMode(mode);
  }

  useEffect(() => {
    async function init() {
      let available: Set<string>;

      if (import.meta.env.PROD) {
        // In production, read the pre-built manifest written by `pnpm download-all`.
        const res = await fetch(`${import.meta.env.BASE_URL}available-months.json`);
        const keys: string[] = res.ok ? await res.json() : [];
        available = new Set(keys);
      } else {
        // In development, probe each month via HEAD to discover which JSON
        // files have been saved to public/ so far.
        const checks = await Promise.all(
          MONTH_CATALOG.map(async (m) => {
            try {
              const res = await fetch(`${import.meta.env.BASE_URL}rental-bonds-${m.key}.json`, {
                method: "HEAD",
              });
              const ct = res.headers.get("content-type") ?? "";
              return res.ok && ct.includes("application/json") ? m.key : null;
            } catch {
              return null;
            }
          }),
        );
        available = new Set(checks.filter((k): k is string => k != null));
      }

      setLocalMonths(available);

      // Load the most recent available month as the default dataset.
      const defaultKey = MONTH_CATALOG.find((m) => available.has(m.key))?.key ?? null;
      if (defaultKey) {
        setSelectedMonth(defaultKey);
        const r = await fetch(`${import.meta.env.BASE_URL}rental-bonds-${defaultKey}.json`);
        const ct = r.headers.get("content-type") ?? "";
        const defaultData: RentalBond[] = r.ok && ct.includes("application/json") ? await r.json() : [];
        logDataStats(`init — rental-bonds-${defaultKey}.json`, defaultData);
        setData(defaultData);
      }

      setLoading(false);
    }
    init().catch((e) => {
      setError(e instanceof Error ? e.message : "Unknown error");
      setLoading(false);
    });
  }, []);

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

  // Postcode is handled via region bucketing in the binning step
  const chartGroupBy: GroupByField = groupBy;

  const { chartBins, chartGroupKeys } = useMemo(() => {
    if (filtered.length === 0) return { chartBins: [], chartGroupKeys: [] };

    // Exclude nonsensical bedroom counts (>10) from chart data
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

    // Accumulate sums to compute averages
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

    // Compute averages
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

  async function handleMonthChange(monthKey: string) {
    setSelectedMonth(monthKey);
    if (localMonths.has(monthKey)) {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}rental-bonds-${monthKey}.json`);
        if (!res.ok) throw new Error("Failed to load data");
        const d: RentalBond[] = await res.json();
        logDataStats(`handleMonthChange — rental-bonds-${monthKey}.json`, d);
        setData(d);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    }
  }

  async function handleDownload() {
    const entry = MONTH_CATALOG.find((m) => m.key === selectedMonth);
    if (!entry) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setDownloading(true);
    try {
      const res = await fetch(entry.url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const buffer = await res.arrayBuffer();
      const parsed = parseXlsxData(buffer);
      logDataStats(`handleDownload — ${selectedMonth}`, parsed);
      await fetch("/api/save-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: `rental-bonds-${selectedMonth}.json`,
          data: parsed,
        }),
        signal: controller.signal,
      });
      setData(parsed);
      setLocalMonths((prev) => new Set([...prev, selectedMonth]));
      setError(null);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
      abortRef.current = null;
    }
  }

  function handleCancelDownload() {
    abortRef.current?.abort();
    setDownloading(false);
  }

  const sortIndicator = (field: SortField) => (sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  function renderTable(items: RentalBond[], paginate: boolean) {
    const start = paginate ? page * pageSize : 0;
    const pageItems = paginate ? items.slice(start, start + pageSize) : items.slice(0, PAGE_SIZE);
    const totalPages = paginate ? Math.ceil(items.length / pageSize) : 1;

    return (
      <>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th
                className={`sticky top-0 bg-indigo-50 dark:bg-indigo-950 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-indigo-100 dark:border-indigo-900 cursor-pointer select-none transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${sortField === "lodgementDate" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}
                onClick={() => toggleSort("lodgementDate")}
              >
                Date{sortIndicator("lodgementDate")}
              </th>
              <th
                className={`sticky top-0 bg-indigo-50 dark:bg-indigo-950 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-indigo-100 dark:border-indigo-900 cursor-pointer select-none transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${sortField === "postcode" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}
                onClick={() => toggleSort("postcode")}
              >
                Postcode{sortIndicator("postcode")}
              </th>
              <th
                className={`sticky top-0 bg-indigo-50 dark:bg-indigo-950 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-indigo-100 dark:border-indigo-900 cursor-pointer select-none transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${sortField === "dwellingType" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}
                onClick={() => toggleSort("dwellingType")}
              >
                Type{sortIndicator("dwellingType")}
              </th>
              <th
                className={`sticky top-0 bg-indigo-50 dark:bg-indigo-950 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-indigo-100 dark:border-indigo-900 cursor-pointer select-none transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${sortField === "bedrooms" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}
                onClick={() => toggleSort("bedrooms")}
              >
                Beds{sortIndicator("bedrooms")}
              </th>
              <th
                className={`sticky top-0 bg-indigo-50 dark:bg-indigo-950 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide border-b border-indigo-100 dark:border-indigo-900 cursor-pointer select-none transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 ${sortField === "weeklyRent" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}
                onClick={() => toggleSort("weeklyRent")}
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
                onClick={() => setPage((p) => p - 1)}
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
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm cursor-pointer transition-colors hover:enabled:bg-gray-100 dark:hover:enabled:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="relative w-28 flex justify-end">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
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

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400">
        <div className="spinner" />
        Loading rental bond data...
      </div>
    );

  const dwellingOptions = Object.entries(DWELLING_TYPE_LABELS).map(([code, label]) => ({
    value: code,
    label,
  }));

  const bedroomSelectOptions = BEDROOM_OPTIONS.map((b) => ({
    value: String(b.value),
    label: b.label,
  }));

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

          <div className="bg-white dark:bg-gray-900 rounded-xl mb-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div
              className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl"
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <div className="flex items-center gap-2.5">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Filters
                </h2>
                {hasActiveFilters && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <button
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetFilters();
                    }}
                  >
                    Reset
                  </button>
                )}
                <span className="flex items-center justify-center w-7 h-7 rounded-md text-gray-400 dark:text-gray-500 text-[0.7rem] cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300">
                  <span className={`inline-block transition-transform duration-200 ${filtersOpen ? "rotate-90" : ""}`}>
                    &#9654;
                  </span>
                </span>
              </div>
            </div>
            <div className={`filters-body ${filtersOpen ? "open" : "closed"}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 pl-0.5">
                    Dwelling Type
                  </label>
                  <MultiSelect
                    options={dwellingOptions}
                    selected={filters.dwellingTypes}
                    onChange={(v) => setFilters((f) => ({ ...f, dwellingTypes: v }))}
                    placeholder="All types"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 pl-0.5">
                    Bedrooms
                  </label>
                  <MultiSelect
                    options={bedroomSelectOptions}
                    selected={filters.bedrooms.map(String)}
                    onChange={(v) => setFilters((f) => ({ ...f, bedrooms: v.map(Number) }))}
                    placeholder="Any"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 pl-0.5">
                    Postcode
                  </label>
                  <TagInput
                    tags={filters.postcodes}
                    onChange={(postcodes) => setFilters((f) => ({ ...f, postcodes }))}
                    placeholder="Type postcode + Enter"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 pl-0.5">
                    Weekly Rent
                  </label>
                  <RangeSlider
                    min={RENT_ABS_MIN}
                    max={RENT_ABS_MAX}
                    step={RENT_STEP}
                    valueMin={filters.rentMin}
                    valueMax={filters.rentMax}
                    onChange={(rentMin, rentMax) => setFilters((f) => ({ ...f, rentMin, rentMax }))}
                  />
                </div>
              </div>
            </div>
          </div>

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
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(stats.min)}/wk
                      </div>
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
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(stats.max)}/wk
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
                          {isOpen && renderTable(items, false)}
                        </div>
                      );
                    })
                  ) : (
                    renderTable(sorted, true)
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
