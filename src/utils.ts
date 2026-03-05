import type { RentalBond, Filters, GroupByField, SortField, SortDir, ThemeMode } from "./types";
import { DWELLING_TYPE_LABELS } from "./types";
import * as XLSX from "xlsx";

export const RENT_STEP = 50;
export const RENT_ABS_MIN = 0;
export const RENT_ABS_MAX = 3000;
export const PAGE_SIZE = 50;
export const CHART_COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
export const CHART_BIN_COUNT = 50;
export const THEME_STORAGE_KEY = "nsw-explorer-theme";

export const POSTCODE_REGIONS: Array<{ lo: number; hi: number; name: string }> = [
  { lo: 2000, hi: 2019, name: "CBD · Kings Cross" },
  { lo: 2020, hi: 2039, name: "Bondi · Eastern Suburbs" },
  { lo: 2040, hi: 2059, name: "Inner West · Newtown" },
  { lo: 2060, hi: 2079, name: "North Sydney · Chatswood" },
  { lo: 2080, hi: 2099, name: "Mosman · Manly · Dee Why" },
  { lo: 2100, hi: 2119, name: "Northern Beaches · Ryde" },
  { lo: 2120, hi: 2139, name: "Strathfield · Hills District" },
  { lo: 2140, hi: 2159, name: "Parramatta · Castle Hill" },
  { lo: 2160, hi: 2179, name: "Liverpool · Fairfield" },
  { lo: 2180, hi: 2199, name: "Canterbury · Bankstown" },
  { lo: 2200, hi: 2299, name: "South Sydney · Central Coast" },
  { lo: 2300, hi: 2399, name: "Newcastle · Hunter" },
  { lo: 2400, hi: 2499, name: "Mid-North Coast · New England" },
  { lo: 2500, hi: 2599, name: "Wollongong · Illawarra" },
  { lo: 2600, hi: 2699, name: "Canberra · ACT Region" },
  { lo: 2700, hi: 2799, name: "Penrith · Blue Mountains" },
  { lo: 2800, hi: 2899, name: "Central NSW · Orange" },
];

export function applyDarkClass(mode: ThemeMode) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = mode === "dark" || (mode === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
}

export function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function formatCurrency(n: number): string {
  return (
    "$" +
    n.toLocaleString("en-AU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

export function groupLabel(field: GroupByField, key: string): string {
  if (field === "dwellingType") return DWELLING_TYPE_LABELS[key] ?? key;
  if (field === "bedrooms") {
    if (key === "null") return "Unknown";
    return key === "0" ? "Studio" : `${key} Bed`;
  }
  return key;
}

export function toNum(val: unknown): number {
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export function logDataStats(label: string, records: RentalBond[]) {
  const zeros = records.filter((r) => r.weeklyRent === 0);
  console.group(`[data] ${label}`);
  console.log(`Total: ${records.length}, Zero-rent: ${zeros.length}`);
  if (zeros.length > 0) console.log("First 3 zero-rent records:", zeros.slice(0, 3));
  console.groupEnd();
}

export function parseXlsxData(buffer: ArrayBuffer): RentalBond[] {
  const workbook = XLSX.read(new Uint8Array(buffer), {
    type: "array",
    cellDates: true,
  });

  let rows: unknown[][] | null = null;
  let headerIdx = -1;
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    for (let i = 0; i < Math.min(sheetRows.length, 20); i++) {
      const row = sheetRows[i];
      if (Array.isArray(row) && row.some((c) => String(c).trim().toLowerCase() === "postcode")) {
        headerIdx = i;
        rows = sheetRows;
        break;
      }
    }
    if (rows) break;
  }
  if (!rows || headerIdx === -1) throw new Error("Could not find header row in XLSX");

  const rawHeaders = rows[headerIdx] as unknown[];
  const headers = rawHeaders.map((h) => String(h).trim().toLowerCase());
  const col = {
    date: headers.findIndex((h) => h.includes("lodgement") && h.includes("date")),
    postcode: headers.findIndex((h) => h === "postcode"),
    dwelling: headers.findIndex((h) => h.includes("dwelling")),
    bedrooms: headers.findIndex((h) => h.includes("bedroom")),
    rent: headers.findIndex((h) => h === "weekly rent"),
  };

  console.group("[parseXlsxData] Header detection");
  console.log("Raw headers:", rawHeaders);
  console.log("Normalised headers:", headers);
  console.log("Column indices:", col);
  console.groupEnd();

  const firstDataRows = rows.slice(headerIdx + 1, headerIdx + 6);
  console.group("[parseXlsxData] First 5 raw data rows");
  firstDataRows.forEach((row, i) => {
    const r = row as unknown[];
    console.log(`Row ${i + 1}:`, {
      date: {
        idx: col.date,
        raw: col.date >= 0 ? r[col.date] : "N/A",
        type: typeof (col.date >= 0 ? r[col.date] : undefined),
      },
      postcode: {
        idx: col.postcode,
        raw: col.postcode >= 0 ? r[col.postcode] : "N/A",
        type: typeof (col.postcode >= 0 ? r[col.postcode] : undefined),
      },
      dwelling: {
        idx: col.dwelling,
        raw: col.dwelling >= 0 ? r[col.dwelling] : "N/A",
        type: typeof (col.dwelling >= 0 ? r[col.dwelling] : undefined),
      },
      bedrooms: {
        idx: col.bedrooms,
        raw: col.bedrooms >= 0 ? r[col.bedrooms] : "N/A",
        type: typeof (col.bedrooms >= 0 ? r[col.bedrooms] : undefined),
      },
      rent: {
        idx: col.rent,
        raw: col.rent >= 0 ? r[col.rent] : "N/A",
        type: typeof (col.rent >= 0 ? r[col.rent] : undefined),
      },
    });
  });
  console.groupEnd();

  const result: RentalBond[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || row.length === 0) continue;
    const pc = row[col.postcode];
    if (pc == null || isNaN(Number(pc)) || Number(pc) <= 0) continue;

    const dateVal = col.date >= 0 ? row[col.date] : undefined;
    let dateStr: string;
    if (dateVal instanceof Date) {
      const d = dateVal.getDate();
      const m = dateVal.getMonth() + 1;
      const y = dateVal.getFullYear();
      dateStr = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
    } else {
      dateStr = String(dateVal ?? "");
    }

    const beds = col.bedrooms >= 0 ? row[col.bedrooms] : undefined;
    const rentRaw = col.rent >= 0 ? row[col.rent] : undefined;
    if (rentRaw == null || String(rentRaw).trim() === "") continue;
    const weeklyRent = toNum(rentRaw);
    if (weeklyRent === 0) {
      console.warn(`[parseXlsxData] Row ${i}: rent raw value produced 0`, {
        rentRaw,
        type: typeof rentRaw,
      });
      continue;
    }
    result.push({
      lodgementDate: dateStr,
      postcode: toNum(pc),
      dwellingType: col.dwelling >= 0 ? String(row[col.dwelling] ?? "") : "",
      bedrooms: beds != null && String(beds).trim() !== "" && String(beds).toLowerCase() !== "u" ? toNum(beds) : null,
      weeklyRent,
    });
  }
  logDataStats("parseXlsxData result", result);
  return result;
}

export function getPostcodeRegion(postcode: number) {
  return POSTCODE_REGIONS.find((r) => postcode >= r.lo && postcode <= r.hi);
}

export function formatPostcodeRegionKey(key: string) {
  const [loStr, hiStr] = key.split("-");
  const lo = Number(loStr);
  const hi = Number(hiStr);
  const region = POSTCODE_REGIONS.find((r) => r.lo === lo && r.hi === hi);
  return `${lo}–${hi} · ${region?.name ?? ""}`;
}

export function groupStats(items: RentalBond[]) {
  const rents = items.map((r) => r.weeklyRent);
  const avg = rents.reduce((s, v) => s + v, 0) / rents.length;
  return { avg, median: median(rents) };
}

export function filterBonds(data: RentalBond[], filters: Filters): RentalBond[] {
  return data.filter((r) => {
    if (filters.dwellingTypes.length > 0 && !filters.dwellingTypes.includes(r.dwellingType)) return false;
    if (filters.bedrooms.length > 0) {
      if (r.bedrooms == null) return false;
      const match = filters.bedrooms.some((b) => (b >= 5 ? r.bedrooms! >= 5 : r.bedrooms === b));
      if (!match) return false;
    }
    if (filters.postcodes.length > 0 && !filters.postcodes.includes(r.postcode)) return false;
    if (r.weeklyRent < filters.rentMin) return false;
    if (filters.rentMax < RENT_ABS_MAX && r.weeklyRent > filters.rentMax) return false;
    return true;
  });
}

export function sortBonds(data: RentalBond[], sortField: SortField, sortDir: SortDir): RentalBond[] {
  return [...data].sort((a, b) => {
    let cmp = 0;
    const av = a[sortField];
    const bv = b[sortField];
    if (av == null && bv == null) cmp = 0;
    else if (av == null) cmp = 1;
    else if (bv == null) cmp = -1;
    else if (typeof av === "string" && typeof bv === "string") cmp = av.localeCompare(bv);
    else cmp = (av as number) - (bv as number);
    return sortDir === "asc" ? cmp : -cmp;
  });
}

export function groupBonds(data: RentalBond[], groupBy: GroupByField): [string, RentalBond[]][] | null {
  if (groupBy === "none") return null;
  const map = new Map<string, RentalBond[]>();
  for (const r of data) {
    const key = String(r[groupBy]);
    const arr = map.get(key);
    if (arr) arr.push(r);
    else map.set(key, [r]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
}
