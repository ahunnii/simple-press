#!/usr/bin/env node
/**
 * generate-zip-data.mjs
 *
 * One-time (re-run-as-needed) data generator: downloads the GeoNames US
 * postal-code dump (CC-BY 4.0, http://download.geonames.org/export/zip/US.zip),
 * filters/dedupes it, and writes the compact lookup table consumed by
 * `src/lib/geo/zip-lookup.ts` at src/lib/geo/zip-data.json.
 *
 * This script is committed for regeneration but NEVER runs at build time —
 * it is a standalone dev tool, invoked manually.
 *
 * Usage:
 *   node scripts/generate-zip-data.mjs
 *
 * Source columns (tab-separated, no header row):
 *   country_code, postal_code, place_name, admin_name1, admin_code1,
 *   admin_name2, admin_code2, admin_name3, admin_code3, latitude, longitude,
 *   accuracy
 *
 * Output shape (src/lib/geo/zip-data.json):
 *   { "48601": [43.4195, -83.9508, "Saginaw", "MI"], ... }
 *   Tuple = [lat, lng, city, stateCode]. lat/lng rounded to 4 decimal places
 *   (~11m precision — plenty for straight-line quote-distance math, keeps the
 *   file compact).
 *
 * US.zip covers all 50 states + DC + US territories (PR, VI, GU, AS, MP) —
 * GeoNames files them all under country_code "US", so no territory filtering
 * is needed; every 5-digit ZIP in the dump is a valid US postal code.
 */

import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL = "http://download.geonames.org/export/zip/US.zip";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "src", "lib", "geo", "zip-data.json");

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function main() {
  const workDir = mkdtempSync(path.join(tmpdir(), "sp-zip-data-"));
  const zipPath = path.join(workDir, "US.zip");

  try {
    console.log(`Downloading ${SOURCE_URL} ...`);
    execSync(`curl -sSL --fail -o ${JSON.stringify(zipPath)} ${JSON.stringify(SOURCE_URL)}`, {
      stdio: "inherit",
    });

    console.log("Extracting US.txt ...");
    const tsv = execSync(`unzip -p ${JSON.stringify(zipPath)} US.txt`, {
      maxBuffer: 1024 * 1024 * 100, // 100MB — the raw TSV is ~3.5MB, generous headroom
    }).toString("utf8");

    const lines = tsv.split("\n");
    /** @type {Record<string, [number, number, string, string]>} */
    const zipData = {};
    let seen = 0;
    let kept = 0;

    for (const line of lines) {
      if (!line.trim()) continue;
      seen++;

      const cols = line.split("\t");
      // country_code, postal_code, place_name, admin_name1, admin_code1,
      // admin_name2, admin_code2, admin_name3, admin_code3, latitude, longitude, accuracy
      const postalCode = cols[1]?.trim();
      const placeName = cols[2]?.trim();
      const stateCode = cols[4]?.trim();
      const latRaw = cols[9]?.trim();
      const lngRaw = cols[10]?.trim();

      if (!postalCode || !/^\d{5}$/.test(postalCode)) continue;
      if (!placeName || !stateCode || !latRaw || !lngRaw) continue;

      // First entry wins on duplicate ZIPs (GeoNames occasionally lists a ZIP
      // more than once for split admin regions).
      if (zipData[postalCode]) continue;

      const lat = Number(latRaw);
      const lng = Number(lngRaw);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      zipData[postalCode] = [round4(lat), round4(lng), placeName, stateCode];
      kept++;
    }

    const json = JSON.stringify(zipData);
    writeFileSync(OUTPUT_PATH, json + "\n", "utf8");

    const { size } = statSync(OUTPUT_PATH);
    console.log(`\nWrote ${OUTPUT_PATH}`);
    console.log(`  rows scanned: ${seen}`);
    console.log(`  zip codes kept: ${kept}`);
    console.log(`  file size: ${(size / 1024).toFixed(1)} KB`);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main();
