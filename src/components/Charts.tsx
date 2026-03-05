import { useEffect, useMemo, useRef, useState } from "react";
import type { RentBin, GroupByField } from "../types";
import { DWELLING_TYPE_LABELS } from "../types";
import { CHART_COLORS, formatPostcodeRegionKey } from "../utils";
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

interface HistogramChartProps {
  bins: RentBin[];
  groupKeys: string[];
  groupBy: GroupByField;
}

export function HistogramChart({ bins, groupKeys, groupBy }: HistogramChartProps) {
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

  const xInterval = Math.max(0, Math.floor(bins.length / 10) - 1);

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

interface BubbleMatrixProps {
  bins: RentBin[];
  groupKeys: string[];
  groupBy: GroupByField;
}

export function BubbleMatrix({ bins, groupKeys, groupBy }: BubbleMatrixProps) {
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

  const binStep = bins.length >= 2 ? bins[1].midpoint - bins[0].midpoint : 0;

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
