import { useEffect, useRef, useState } from "react";
import type { RentalBond } from "../types";
import { MONTH_CATALOG } from "../types";
import { logDataStats, parseXlsxData } from "../utils";

export function useRentalData() {
  const [data, setData] = useState<RentalBond[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("2025-01");
  const [localMonths, setLocalMonths] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    async function init() {
      let available: Set<string>;

      if (import.meta.env.PROD) {
        const res = await fetch(`${import.meta.env.BASE_URL}available-months.json`);
        const keys: string[] = res.ok ? await res.json() : [];
        available = new Set(keys);
      } else {
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

  return {
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
  };
}
