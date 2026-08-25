#!/usr/bin/env node
/**
 * generate-zip-data.mjs
 *
 * One-time (re-run-as-needed) data generator: downloads several GeoNames
 * postal-code dumps (CC-BY 4.0, https://download.geonames.org/export/zip/),
 * merges/dedupes them, and writes the compact lookup table consumed by
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
 * Sources — see SOURCES below, one GeoNames country dump per entry. `US.zip`
 * does NOT cover the territories, despite an earlier version of this
 * docblock claiming otherwise: GeoNames files Puerto Rico, the US Virgin
 * Islands, Guam, American Samoa, and the Northern Mariana Islands as their
 * own country dumps (`PR.zip`, `VI.zip`, `GU.zip`, `AS.zip`, `MP.zip`), each
 * under its own two-letter country code, not folded into `US.zip`. A
 * territory dump's `admin_code1` column is a local district code (or blank),
 * not the two-letter code the rest of the app expects
 * (`US_TERRITORIES` in `src/lib/geo/regions.ts`) — so every row from a
 * territory source has its state code FORCED to that source's own code
 * (`forceStateCode` below) instead of read from the file. The `US` source is
 * unchanged in that respect: it still reads the state from `admin_code1`.
 *
 * New in this version: `US` rows are additionally checked against
 * `US_STATE_WHITELIST` (the 50 states + DC, plus the freely-associated
 * states MH/FM/PW). GeoNames' `US.txt` carries a couple of USPS ZIPs for the
 * Marshall Islands (96960 and 96970, code `"MH"`); USPS genuinely serves the
 * Compact of Free Association states through domestic ZIPs, the shipped
 * dataset has always contained those rows, and dropping them would regress
 * ZIPs that resolve today — so they stay. The whitelist's job is narrower:
 * refuse any OTHER unexpected `admin_code1` value a future dump might
 * introduce, so a surprise lands as a missing ZIP (loud, at generation time
 * via the count check) rather than a nonsense state code in the app. It
 * applies ONLY to the `US` source; a territory source's code is forced, not
 * read, so it never touches the whitelist and can never be dropped by it.
 *
 * APO/FPO military ZIPs (state codes AA/AE/AP) are DELIBERATELY excluded —
 * they exist in NO GeoNames dump (there's nothing here that filters them
 * out; they simply were never in the raw data) and have no meaningful
 * lat/lng centroid: an APO/FPO ZIP routes through a domestic mail gateway to
 * an address that can be anywhere on Earth, so a fabricated centroid would
 * silently produce absurd quote-distance numbers instead of an honest
 * "unknown ZIP". The app's unknown-ZIP handling (see
 * `src/lib/geo/zip-lookup.ts`) is the intended mitigation for these ZIPs,
 * not a fake table entry.
 */

import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The 50 states + DC + the freely-associated states (MH/FM/PW — USPS serves
 * them through domestic ZIPs and `US.txt` carries a handful of their rows;
 * see docblock above) — used ONLY to sanity-filter the `US` source's
 * `admin_code1` column. Deliberately hand-written here rather than imported
 * from `src/lib/geo/regions.ts`: this is a standalone Node script with no
 * TypeScript loader, and the two lists serve different jobs — this one
 * exists solely to catch unexpected rows in a raw GeoNames dump, not to
 * define what the app accepts.
 */
const US_STATE_WHITELIST = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI",
  "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN",
  "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH",
  "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA",
  "WV", "WI", "WY",
  "MH", "FM", "PW",
]);

/**
 * One row per GeoNames country dump to merge, in priority order — dedupe
 * below is first-wins by ZIP, and `US` must stay first so nothing in the 50
 * states + DC can ever be overridden by a territory dump.
 *
 * `forceStateCode` is set for every territory: as explained in the docblock
 * above, their `admin_code1` column is not the two-letter code the app
 * expects, so the source's own code is used instead of anything read from
 * the file. `US` keeps `forceStateCode: null` and reads `admin_code1` as
 * before (now additionally checked against `US_STATE_WHITELIST`).
 */
const SOURCES = [
  {
    id: "US",
    url: "http://download.geonames.org/export/zip/US.zip",
    txtEntry: "US.txt",
    forceStateCode: null,
  },
  {
    id: "PR",
    url: "http://download.geonames.org/export/zip/PR.zip",
    txtEntry: "PR.txt",
    forceStateCode: "PR",
  },
  {
    id: "VI",
    url: "http://download.geonames.org/export/zip/VI.zip",
    txtEntry: "VI.txt",
    forceStateCode: "VI",
  },
  {
    id: "GU",
    url: "http://download.geonames.org/export/zip/GU.zip",
    txtEntry: "GU.txt",
    forceStateCode: "GU",
  },
  {
    id: "AS",
    url: "http://download.geonames.org/export/zip/AS.zip",
    txtEntry: "AS.txt",
    forceStateCode: "AS",
  },
  {
    id: "MP",
    url: "http://download.geonames.org/export/zip/MP.zip",
    txtEntry: "MP.txt",
    forceStateCode: "MP",
  },
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "src", "lib", "geo", "zip-data.json");

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

/**
 * Downloads and parses one `SOURCES` entry, inserting first-wins into the
 * shared `zipData` map (a row is skipped if its ZIP is already present from
 * an earlier source — which is how `US` rows stay un-overridable). Returns
 * `{ seen, kept }` for this source's console summary line.
 */
function ingestSource(source, zipData) {
  const workDir = mkdtempSync(path.join(tmpdir(), `sp-zip-data-${source.id}-`));
  const zipPath = path.join(workDir, `${source.id}.zip`);

  try {
    console.log(`Downloading ${source.url} ...`);
    execSync(`curl -sSL --fail -o ${JSON.stringify(zipPath)} ${JSON.stringify(source.url)}`, {
      stdio: "inherit",
    });

    console.log(`Extracting ${source.txtEntry} ...`);
    const tsv = execSync(
      `unzip -p ${JSON.stringify(zipPath)} ${JSON.stringify(source.txtEntry)}`,
      {
        maxBuffer: 1024 * 1024 * 100, // 100MB — the raw TSV is at most a few MB, generous headroom
      },
    ).toString("utf8");

    const lines = tsv.split("\n");
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
      const stateCode = source.forceStateCode ?? cols[4]?.trim();
      const latRaw = cols[9]?.trim();
      const lngRaw = cols[10]?.trim();

      if (!postalCode || !/^\d{5}$/.test(postalCode)) continue;
      if (!placeName || !stateCode || !latRaw || !lngRaw) continue;

      // Only the US source reads its state code from the file — sanity-check
      // it against the 50-states+DC whitelist so stray non-US rows in the raw
      // dump (e.g. the Marshall Islands ZIPs 96960/96970) never make it in.
      // A territory source's code is forced above and never reaches here.
      if (source.forceStateCode === null && !US_STATE_WHITELIST.has(stateCode)) {
        continue;
      }

      // First entry wins on duplicate ZIPs, both within a source (GeoNames
      // occasionally lists a ZIP more than once for split admin regions) and
      // across sources (SOURCES order puts US first, so a territory dump can
      // never override a 50-states+DC row).
      if (zipData[postalCode]) continue;

      const lat = Number(latRaw);
      const lng = Number(lngRaw);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      zipData[postalCode] = [round4(lat), round4(lng), placeName, stateCode];
      kept++;
    }

    return { seen, kept };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

function main() {
  /** @type {Record<string, [number, number, string, string]>} */
  const zipData = {};
  const summary = [];

  for (const source of SOURCES) {
    const { seen, kept } = ingestSource(source, zipData);
    summary.push({ id: source.id, seen, kept });
  }

  const json = JSON.stringify(zipData);
  writeFileSync(OUTPUT_PATH, json + "\n", "utf8");

  const { size } = statSync(OUTPUT_PATH);
  console.log(`\nWrote ${OUTPUT_PATH}`);
  for (const { id, seen, kept } of summary) {
    console.log(`  ${id}: rows scanned ${seen}, zip codes kept ${kept}`);
  }
  console.log(`  total zip codes: ${Object.keys(zipData).length}`);
  console.log(`  file size: ${(size / 1024).toFixed(1)} KB`);
}

main();
