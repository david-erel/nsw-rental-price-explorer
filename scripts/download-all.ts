/**
 * Downloads all monthly rental bond XLSX files from nsw.gov.au, parses them,
 * writes rental-bonds-{key}.json files to public/, and writes a
 * public/available-months.json manifest listing all successfully saved months.
 *
 * Usage:
 *   pnpm download-all            # skip already-downloaded months
 *   pnpm download-all --force    # re-download and overwrite everything
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";
import { MONTH_CATALOG } from "../src/types.js";
import type { RentalBond } from "../src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, "../public");
const NSW_BASE = "https://www.nsw.gov.au";
const API_PREFIX = "/api/nsw-data";
const force = process.argv.includes("--force");

function toNum(val: unknown): number {
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseXlsxBuffer(buffer: ArrayBuffer): RentalBond[] {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });

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

  const headers = (rows[headerIdx] as unknown[]).map((h) => String(h).trim().toLowerCase());
  const col = {
    date: headers.findIndex((h) => h.includes("lodgement") && h.includes("date")),
    postcode: headers.findIndex((h) => h === "postcode"),
    dwelling: headers.findIndex((h) => h.includes("dwelling")),
    bedrooms: headers.findIndex((h) => h.includes("bedroom")),
    rent: headers.findIndex((h) => h === "weekly rent"),
  };

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
    if (weeklyRent === 0) continue;

    result.push({
      lodgementDate: dateStr,
      postcode: toNum(pc),
      dwellingType: col.dwelling >= 0 ? String(row[col.dwelling] ?? "") : "",
      bedrooms:
        beds != null && String(beds).trim() !== "" && String(beds).toLowerCase() !== "u"
          ? toNum(beds)
          : null,
      weeklyRent,
    });
  }
  return result;
}

async function downloadMonth(key: string, url: string): Promise<boolean> {
  const outFile = path.join(PUBLIC_DIR, `rental-bonds-${key}.json`);

  if (!force && fs.existsSync(outFile)) {
    console.log(`  [skip]  ${key} — already exists`);
    return true;
  }

  const realUrl = NSW_BASE + url.replace(API_PREFIX, "");
  process.stdout.write(`  [fetch] ${key}  ${realUrl} … `);

  try {
    const res = await fetch(realUrl);
    if (!res.ok) {
      process.stdout.write(`\n`);
      console.error(`  [fail]  ${key} — HTTP ${res.status}`);
      return false;
    }

    const buffer = await res.arrayBuffer();
    process.stdout.write(`${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB downloaded, parsing … `);

    const records = parseXlsxBuffer(buffer);
    process.stdout.write(`${records.length} records\n`);

    fs.writeFileSync(outFile, JSON.stringify(records));
    return true;
  } catch (e) {
    process.stdout.write(`\n`);
    console.error(`  [fail]  ${key} — ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

async function main() {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  console.log(
    `\nDownloading ${MONTH_CATALOG.length} months${force ? " (--force, overwriting existing)" : " (skipping existing)"}…\n`,
  );

  const succeeded: string[] = [];
  const failed: string[] = [];

  for (const entry of MONTH_CATALOG) {
    const ok = await downloadMonth(entry.key, entry.url);
    if (ok) succeeded.push(entry.key);
    else failed.push(entry.key);
  }

  const manifestPath = path.join(PUBLIC_DIR, "available-months.json");
  fs.writeFileSync(manifestPath, JSON.stringify(succeeded));

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Done: ${succeeded.length} succeeded, ${failed.length} failed.`);
  console.log(`Manifest written → public/available-months.json`);
  if (failed.length > 0) {
    console.log(`\nFailed months: ${failed.join(", ")}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
