/**
 * "Download your site" export — the orchestrator.
 *
 *   buildSiteExport(businessId)  → { filename, files, summary }
 *   zipSiteExport(files)         → ZIP bytes (photos STORE, everything else DEFLATE)
 *
 * Runs every builder under `src/lib/site-export/` and assembles the final ZIP
 * layout (see the plan):
 *
 *   START HERE.html
 *   Guides/
 *   Site details.html, Pages/, Blog/, Products/, Services/, Events/, Galleries/
 *   Photos/
 *   Spreadsheets/
 *   Import files/   (Shopify, Wix, Squarespace, Square + WordPress/WooCommerce)
 *   For developers/ (README.txt, data.json, simplepress-store-content.json)
 *   Licenses/
 *
 * Read-only: database and storage are only ever read. Partial failures (a
 * photo that won't download, an import format that can't be built) become
 * notes on START HERE instead of failing the whole export.
 *
 * No `next/headers`, `checkBusiness`, `server-only` or `src/lib/preview/*` —
 * callable from the route handler or a script (scripts/site-export.ts).
 */
import { Readable } from "node:stream";

import JSZip from "jszip";
import Papa from "papaparse";

import type { SiteExportSummary } from "./guides";
import type {
  MediaIndex,
  SiteExportBusiness,
  SiteExportFile,
  SiteExportNote,
} from "./types";
import { getCanonicalBaseUrl } from "~/lib/canonical";
import { collectStoreContent } from "~/lib/store-transfer/export";
import { STORE_TRANSFER_FORMAT_VERSION } from "~/lib/store-transfer/types";
import { collectWordPressExport } from "~/lib/wordpress/export";
import { db } from "~/server/db";

import { buildGuides, buildStartHere } from "./guides";
import { buildImportFiles } from "./import-files";
import { buildLicenseFiles } from "./licenses";
import { buildMediaIndex } from "./media";
import { buildReadableDocuments } from "./readable";
import { buildSpreadsheets } from "./spreadsheets";
import { safeName, SITE_DETAILS_PATH, SITE_EXPORT_DIRS } from "./types";

export interface SiteExportResult {
  /** "{Store Name} - Site Export - YYYY-MM-DD.zip" */
  filename: string;
  /** Every ZIP entry, in final order. */
  files: SiteExportFile[];
  summary: SiteExportSummary;
}

export interface BuildSiteExportOptions {
  /** Human-readable progress ("Downloading photos (40/120)", …). */
  onProgress?: (step: string) => void;
  /**
   * Folders that will sit next to the export but are not built here (the
   * sp-site-snapshot skill's `Website pictures/`). Only listed on START HERE
   * and in the hiring guide; the caller guarantees the linked files exist.
   */
  extraFolders?: SiteExportSummary["extraFolders"];
}

const DEV_DIR = SITE_EXPORT_DIRS.developers;
const IMPORT_DIR = SITE_EXPORT_DIRS.importFiles;

export const WORDPRESS_IMPORT_PATHS = {
  content: `${IMPORT_DIR}/WordPress/content.wxr.xml`,
  products: `${IMPORT_DIR}/WordPress/woocommerce-products.csv`,
} as const;

export const DEVELOPER_PATHS = {
  readme: `${DEV_DIR}/README.txt`,
  dataJson: `${DEV_DIR}/data.json`,
  storeContent: `${DEV_DIR}/simplepress-store-content.json`,
} as const;

/** How many missing photo keys are listed by name before summarizing. */
const MISSING_MEDIA_LIST_MAX = 10;

const VIDEO_EXT_RE = /\.(mp4|m4v|mov|webm|ogv|avi|mkv)$/i;

// ─── Filename ────────────────────────────────────────────────────────────────

/** "{Store Name} - Site Export - YYYY-MM-DD.zip" (UTC date). */
export function siteExportFilename(storeName: string, date: Date): string {
  return `${safeName(storeName, "Store")} - Site Export - ${date.toISOString().slice(0, 10)}.zip`;
}

// ─── ZIP ─────────────────────────────────────────────────────────────────────

function createSiteExportZip(files: SiteExportFile[]): JSZip {
  const zip = new JSZip();
  for (const f of files) {
    const store = f.compress === false;
    zip.file(f.path, f.contents, {
      binary: typeof f.contents !== "string",
      compression: store ? "STORE" : "DEFLATE",
      ...(store ? {} : { compressionOptions: { level: 6 } }),
    });
  }
  return zip;
}

/**
 * Zip the export in memory. Files with `compress: false` (photos/videos,
 * already compressed) are STOREd; everything else is DEFLATEd.
 */
export async function zipSiteExport(
  files: SiteExportFile[],
): Promise<Uint8Array> {
  const buf = await createSiteExportZip(files).generateAsync({
    type: "nodebuffer",
  });
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

/**
 * Same ZIP as `zipSiteExport`, streamed entry by entry so the route never
 * holds a second full copy of the archive in memory (a ~160 MB store peaked
 * at ~1 GB when buffered). No Content-Length is known up front.
 */
export function zipSiteExportStream(
  files: SiteExportFile[],
): ReadableStream<Uint8Array> {
  const nodeStream = createSiteExportZip(files).generateNodeStream({
    type: "nodebuffer",
    streamFiles: true,
  });
  // JSZip returns an old-style stream; wrap it so it can become a web stream.
  const readable = new Readable().wrap(nodeStream);
  return Readable.toWeb(readable) as ReadableStream<Uint8Array>;
}

// ─── Business ────────────────────────────────────────────────────────────────

interface LoadedBusiness {
  business: SiteExportBusiness;
  hasStripe: boolean;
  hasCustomDomain: boolean;
  formCount: number;
  optionGroupCount: number;
}

async function loadBusiness(businessId: string): Promise<LoadedBusiness> {
  const row = await db.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      slug: true,
      subdomain: true,
      templateId: true,
      supportEmail: true,
      customDomain: true,
      domainStatus: true,
      stripeAccountId: true,
      _count: { select: { forms: true, productOptionGroups: true } },
    },
  });
  if (!row) throw new Error("Business not found");

  const hasCustomDomain = !!row.customDomain && row.domainStatus === "ACTIVE";
  return {
    business: {
      id: row.id,
      name: row.name,
      slug: row.slug,
      templateId: row.templateId,
      siteUrl: getCanonicalBaseUrl(row).replace(/\/+$/, ""),
      supportEmail: row.supportEmail ?? null,
      customDomain: hasCustomDomain ? row.customDomain : null,
      exportedAt: new Date(),
    },
    hasStripe: !!row.stripeAccountId,
    hasCustomDomain,
    formCount: row._count.forms,
    optionGroupCount: row._count.productOptionGroups ?? 0,
  };
}

// ─── Small helpers (exported for tests) ──────────────────────────────────────

export function isVideoPath(zipPath: string): boolean {
  return (
    zipPath.startsWith(`${SITE_EXPORT_DIRS.photos}/Videos/`) ||
    VIDEO_EXT_RE.test(zipPath)
  );
}

/**
 * Notes about the photo download: one warn per missing stored file (or a
 * summary when there are many), plus an info note when the storage listing
 * and the included count differ.
 */
export function mediaNotes(
  stats: MediaIndex["stats"],
  businessId: string,
): SiteExportNote[] {
  const notes: SiteExportNote[] = [];
  const name = (key: string) =>
    key.startsWith(`${businessId}/`) ? key.slice(businessId.length + 1) : key;
  const { missing } = stats;
  if (missing.length > MISSING_MEDIA_LIST_MAX) {
    const shown = missing.slice(0, MISSING_MEDIA_LIST_MAX).map(name);
    notes.push({
      level: "warn",
      message: `${missing.length} photos or videos couldn't be downloaded, so they are not in the Photos folder. The first ${MISSING_MEDIA_LIST_MAX}: ${shown.join(", ")}.`,
    });
  } else {
    for (const key of missing) {
      notes.push({
        level: "warn",
        message: `A photo or video couldn't be downloaded, so it is not in the Photos folder: ${name(key)}.`,
      });
    }
  }
  if (stats.listed !== stats.included) {
    notes.push({
      level: "info",
      message: `Your site's storage lists ${stats.listed} uploaded file${stats.listed === 1 ? "" : "s"}; ${stats.included} ${stats.included === 1 ? "is" : "are"} included in the Photos folder.`,
    });
  }
  return notes;
}

/** Data rows in a CSV (header excluded; multi-line cells handled). */
export function csvDataRows(contents: string | Uint8Array): number {
  const text =
    typeof contents === "string" ? contents : new TextDecoder().decode(contents);
  const parsed = Papa.parse<string[]>(text.replace(/^﻿/, ""), {
    skipEmptyLines: true,
  });
  return Math.max(0, parsed.data.length - 1);
}

/**
 * Rows per spreadsheet. Top-level sheets use the builder's own count (keyed
 * by file slug); form-entry sheets and anything unknown are counted by parsing.
 */
export function spreadsheetRows(
  files: SiteExportFile[],
  counts: Record<string, number>,
): Array<{ path: string; rows: number }> {
  const top = `${SITE_EXPORT_DIRS.spreadsheets}/`;
  return files
    .filter((f) => f.path.toLowerCase().endsWith(".csv"))
    .map((f) => {
      const rest = f.path.startsWith(top) ? f.path.slice(top.length) : f.path;
      const slug = rest.includes("/") ? null : rest.replace(/\.csv$/i, "");
      const known = slug !== null ? counts[slug] : undefined;
      return {
        path: f.path,
        rows: typeof known === "number" ? known : csvDataRows(f.contents),
      };
    });
}

/** Why a zip path is unsafe, or null when it is fine. */
export function unsafePathReason(zipPath: string): string | null {
  if (!zipPath) return "empty path";
  if (zipPath.startsWith("/")) return "starts with /";
  if (zipPath.includes("\\")) return "contains a backslash";
  if (zipPath.includes("\0")) return "contains a NUL byte";
  const segments = zipPath.split("/");
  if (segments.some((s) => s === "." || s === ".."))
    return 'contains "." or ".." segments';
  if (segments.some((s) => s === "")) return "contains an empty segment";
  return null;
}

/**
 * Drop unsafe paths and duplicate paths (case-insensitive, since macOS and
 * Windows unzip that way), keeping the first occurrence. Each drop becomes a
 * warn note; the export itself never fails for this.
 */
export function guardPaths(files: SiteExportFile[]): {
  files: SiteExportFile[];
  notes: SiteExportNote[];
} {
  const seen = new Set<string>();
  const kept: SiteExportFile[] = [];
  const notes: SiteExportNote[] = [];
  for (const f of files) {
    const reason = unsafePathReason(f.path);
    if (reason) {
      notes.push({
        level: "warn",
        message: `A file was left out of the export because its name was not valid (${reason}): ${f.path}`,
      });
      continue;
    }
    const key = f.path.toLowerCase();
    if (seen.has(key)) {
      notes.push({
        level: "warn",
        message: `Two files in the export had the same name, so only the first was kept: ${f.path}`,
      });
      continue;
    }
    seen.add(key);
    kept.push(f);
  }
  return { files: kept, notes };
}

/**
 * Run a non-essential builder (an extra file format); on failure return
 * `fallback` and a warn note instead of failing the whole export.
 */
async function optional<T>(
  what: string,
  fallback: T,
  run: () => Promise<T>,
  notes: SiteExportNote[],
): Promise<T> {
  try {
    return await run();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[site-export] ${what} failed:`, err);
    notes.push({
      level: "warn",
      message: `Couldn't create ${what}, so ${what.endsWith("files") ? "they are" : "it is"} missing from this export (${detail}). Try downloading the export again later.`,
    });
    return fallback;
  }
}

// ─── WordPress + Store Transfer re-pathing ───────────────────────────────────

/**
 * Take only what the site export needs from the WordPress export: the WXR
 * (pages + posts), the WooCommerce CSV (when there are products) and the raw
 * data.json. Its README (replaced by the guides) and records/ CSVs (covered by
 * Spreadsheets/) are dropped.
 */
export function pickWordPressFiles(wp: {
  files: Array<{ path: string; contents: string }>;
  counts: { pages: number; blogPosts: number; policies: number; products: number };
}): { importFiles: SiteExportFile[]; developerFiles: SiteExportFile[] } {
  const byPath = new Map(wp.files.map((f) => [f.path, f.contents]));
  const importFiles: SiteExportFile[] = [];
  const developerFiles: SiteExportFile[] = [];
  const wxr = byPath.get("content.wxr.xml");
  if (wxr && wp.counts.pages + wp.counts.blogPosts + wp.counts.policies > 0) {
    importFiles.push({ path: WORDPRESS_IMPORT_PATHS.content, contents: wxr });
  }
  const products = byPath.get("products.csv");
  if (products && wp.counts.products > 0) {
    importFiles.push({ path: WORDPRESS_IMPORT_PATHS.products, contents: products });
  }
  const data = byPath.get("data.json");
  if (data) developerFiles.push({ path: DEVELOPER_PATHS.dataJson, contents: data });
  return { importFiles, developerFiles };
}

export function developerReadme(
  business: SiteExportBusiness,
  has: { dataJson: boolean; storeContent: boolean },
): string {
  const lines = [
    `${business.name} — SimplePress site export, for developers`,
    `Exported ${business.exportedAt.toISOString()} from ${business.siteUrl} (template "${business.templateId}").`,
    "",
    "Business owners: you don't need anything in this folder. Hand it to a",
    "developer if one is moving your site for you.",
    "",
  ];
  if (has.dataJson) {
    lines.push(
      "data.json",
      "  A raw JSON dump of the store as stored in the database: pages (TipTap",
      "  JSON bodies), site content and template fields, FAQs, testimonials,",
      "  galleries, full product rows (incl. variants, additionalFields and SEO",
      "  meta), discount codes, shipping zones, orders, customers and reviews.",
      "  Contains customers' personal information — handle it accordingly.",
      "",
    );
  }
  if (has.storeContent) {
    lines.push(
      "simplepress-store-content.json",
      "  The content block of a SimplePress Store Transfer manifest",
      "  (formatVersion " +
        String(STORE_TRANSFER_FORMAT_VERSION) +
        "): business settings, site content, pages, products, collections,",
      "  services, galleries, events, forms, quote calculators, loyalty and",
      "  invoice settings. Image references point at the live site's storage.",
      "  A SimplePress platform admin can import the full Store Transfer bundle",
      "  (this content plus the media files) into another SimplePress store;",
      "  it is not an import format for other platforms.",
      "",
    );
  }
  lines.push(
    "Other folders",
    "  Spreadsheets/  every record as CSV (UTF-8 with BOM).",
    "  Photos/        the original uploaded files, in readable folders.",
    "  Import files/  ready-made CSV/WXR files for WordPress, Shopify, Wix,",
    "                 Squarespace and Square.",
    "",
  );
  return lines.join("\n");
}

// ─── buildSiteExport ─────────────────────────────────────────────────────────

const READABLE_SECTION_ORDER = [
  SITE_DETAILS_PATH,
  `${SITE_EXPORT_DIRS.pages}/`,
  `${SITE_EXPORT_DIRS.blog}/`,
  `${SITE_EXPORT_DIRS.products}/`,
  `${SITE_EXPORT_DIRS.services}/`,
  `${SITE_EXPORT_DIRS.events}/`,
  `${SITE_EXPORT_DIRS.galleries}/`,
];

function readableRank(path: string): number {
  const i = READABLE_SECTION_ORDER.findIndex((p) =>
    p.endsWith("/") ? path.startsWith(p) : path === p,
  );
  return i === -1 ? READABLE_SECTION_ORDER.length : i;
}

export async function buildSiteExport(
  businessId: string,
  opts?: BuildSiteExportOptions,
): Promise<SiteExportResult> {
  const progress = opts?.onProgress ?? (() => undefined);

  progress("Loading store");
  const loaded = await loadBusiness(businessId);
  const { business } = loaded;

  // ── Photos first: readable documents link to them ─────────────────────────
  progress("Downloading photos and videos");
  let lastReported = 0;
  const media = await buildMediaIndex(businessId, {
    onProgress: (done, total) => {
      if (done === total || done - lastReported >= 25) {
        lastReported = done;
        progress(`Downloading photos and videos (${done}/${total})`);
      }
    },
  });

  // ── Everything else, in parallel ──────────────────────────────────────────
  progress("Writing pages, spreadsheets and import files");
  const softNotes: SiteExportNote[] = [];
  const [readable, sheets, imports, wordpress, storeContent, licenses] =
    await Promise.all([
      buildReadableDocuments(businessId, { business, media }),
      buildSpreadsheets(businessId),
      optional(
        "the Shopify, Wix, Squarespace and Square import files",
        { files: [] as SiteExportFile[], notes: [] as SiteExportNote[] },
        () => buildImportFiles(businessId, business),
        softNotes,
      ),
      optional(
        "the WordPress import files",
        null,
        () => collectWordPressExport(businessId),
        softNotes,
      ),
      optional(
        "the developer store-content file",
        null,
        () => collectStoreContent(businessId),
        softNotes,
      ),
      buildLicenseFiles(business),
    ]);

  progress("Putting the export together");

  // ── Import files + developer files ────────────────────────────────────────
  const wp = wordpress
    ? pickWordPressFiles(wordpress)
    : { importFiles: [], developerFiles: [] };
  const importFiles: SiteExportFile[] = [...wp.importFiles, ...imports.files];

  const developerFiles: SiteExportFile[] = [...wp.developerFiles];
  if (storeContent) {
    developerFiles.push({
      path: DEVELOPER_PATHS.storeContent,
      contents: JSON.stringify(
        {
          formatVersion: STORE_TRANSFER_FORMAT_VERSION,
          exportedAt: business.exportedAt.toISOString(),
          templateId: storeContent.templateId,
          content: storeContent.manifestContent,
        },
        null,
        2,
      ),
    });
  }
  developerFiles.unshift({
    path: DEVELOPER_PATHS.readme,
    contents: developerReadme(business, {
      dataJson: developerFiles.some((f) => f.path === DEVELOPER_PATHS.dataJson),
      storeContent: !!storeContent,
    }),
  });

  const readableFiles = readable.files
    .map((f, i) => ({ f, i }))
    .sort((a, b) => readableRank(a.f.path) - readableRank(b.f.path) || a.i - b.i)
    .map(({ f }) => f);

  // ── Guard everything except START HERE + guides (built from the summary) ──
  const guarded = guardPaths([
    ...readableFiles,
    ...media.files,
    ...sheets.files,
    ...importFiles,
    ...developerFiles,
    ...licenses,
  ]);
  const present = new Set(guarded.files.map((f) => f.path));
  // guardPaths keeps the first of any duplicate, so filter each group by
  // identity rather than by path to keep exactly one copy.
  const keptSet = new Set(guarded.files);
  const keep = (files: SiteExportFile[]) => files.filter((f) => keptSet.has(f));

  const finalSheets = keep(sheets.files);
  const finalImports = keep(importFiles);
  const finalMedia = keep(media.files);

  // ── Summary ───────────────────────────────────────────────────────────────
  const videos = finalMedia.filter((f) => isVideoPath(f.path)).length;
  const sc = sheets.counts;
  const summary: SiteExportSummary = {
    business,
    counts: {
      ...readable.counts,
      photos: finalMedia.length - videos,
      videos,
      customers: sc.customers ?? 0,
      orders: sc.orders ?? 0,
      // Every form the owner has to rebuild — not only those with entries.
      forms: Math.max(
        loaded.formCount,
        finalSheets.filter((f) =>
          f.path.startsWith(`${SITE_EXPORT_DIRS.spreadsheets}/Form entries/`),
        ).length,
      ),
      optionGroups: loaded.optionGroupCount,
      invoices: sc.invoices ?? 0,
      subscriptions: sc.subscriptions ?? 0,
      loyaltyMembers: sc["loyalty-members"] ?? 0,
    },
    documents: readable.index.filter((d) => present.has(d.path)),
    spreadsheets: spreadsheetRows(finalSheets, sc),
    importFiles: finalImports.map((f) => f.path),
    externalImages: media.stats.external.map((e) => ({
      url: e.url,
      zipPath: e.zipPath && present.has(e.zipPath) ? e.zipPath : null,
    })),
    notes: [
      ...mediaNotes(media.stats, businessId),
      ...readable.notes,
      ...sheets.notes,
      ...imports.notes,
      ...softNotes,
      ...guarded.notes,
    ],
    hasStripe: loaded.hasStripe,
    hasCustomDomain: loaded.hasCustomDomain,
    ...(opts?.extraFolders?.length ? { extraFolders: opts.extraFolders } : {}),
  };

  // ── Final order ───────────────────────────────────────────────────────────
  const guides = buildGuides(summary);
  const startHere = buildStartHere(summary);
  const files: SiteExportFile[] = [
    startHere,
    ...guides,
    ...keep(readableFiles),
    ...finalMedia,
    ...finalSheets,
    ...finalImports,
    ...keep(developerFiles),
    ...keep(licenses),
  ];

  // START HERE + guides use fixed paths; a clash means a builder bug.
  const finalCheck = guardPaths(files);
  if (finalCheck.notes.length > 0) {
    throw new Error(
      `Site export path conflict: ${finalCheck.notes.map((n) => n.message).join("; ")}`,
    );
  }

  progress("Done");
  return {
    filename: siteExportFilename(business.name, business.exportedAt),
    files,
    summary,
  };
}
