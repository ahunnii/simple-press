/**
 * "Download your site" export — shared HTML shell for every readable document
 * and guide. Self-contained (inline CSS, no scripts, no remote assets) so files
 * open from a double-click, print cleanly, and copy-paste into site builders
 * with headings/links intact.
 */
import { relativeZipPath, START_HERE_PATH } from "./types";

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape text for HTML element content and attribute values. */
export function esc(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

export interface RenderDocumentOptions {
  /** Zip path of the document being rendered — used to build relative links. */
  docPath: string;
  title: string;
  /** Store name, shown in the header strip. */
  storeName: string;
  /** Pre-rendered, already-escaped HTML for the body. */
  bodyHtml: string;
  /** Optional short line under the title. Plain text. */
  subtitle?: string;
  /** Breadcrumb trail after "Start here": [{ label, zipPath? }]. Plain text labels. */
  breadcrumbs?: Array<{ label: string; zipPath?: string }>;
}

/** Relative href from `docPath` to another zip path. */
export function hrefTo(docPath: string, zipPath: string): string {
  return relativeZipPath(docPath, zipPath);
}

export function renderDocument(opts: RenderDocumentOptions): string {
  const { docPath, title, storeName, bodyHtml, subtitle, breadcrumbs = [] } =
    opts;
  const crumbs =
    docPath === START_HERE_PATH
      ? ""
      : `<nav class="crumbs"><a href="${esc(hrefTo(docPath, START_HERE_PATH))}">Start here</a>${breadcrumbs
          .map((c) =>
            c.zipPath
              ? ` <span aria-hidden="true">›</span> <a href="${esc(hrefTo(docPath, c.zipPath))}">${esc(c.label)}</a>`
              : ` <span aria-hidden="true">›</span> <span>${esc(c.label)}</span>`,
          )
          .join("")}</nav>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — ${esc(storeName)}</title>
<style>${DOCUMENT_CSS}</style>
</head>
<body>
<header class="store">${esc(storeName)} · Site export</header>
<main>
${crumbs}
<h1>${esc(title)}</h1>
${subtitle ? `<p class="subtitle">${esc(subtitle)}</p>` : ""}
${bodyHtml}
</main>
</body>
</html>
`;
}

/**
 * Two-column "label → value" table for copy-paste field entry. Values are
 * pre-escaped HTML; rows with empty values are dropped.
 */
export function fieldTable(rows: Array<[label: string, valueHtml: string | null | undefined]>): string {
  const kept = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (kept.length === 0) return "";
  return `<table class="fields"><tbody>${kept
    .map(([label, v]) => `<tr><th scope="row">${esc(label)}</th><td>${v}</td></tr>`)
    .join("")}</tbody></table>`;
}

/** A callout box. `tone` picks the color. Body is pre-escaped HTML. */
export function callout(bodyHtml: string, tone: "info" | "warn" | "tip" = "info"): string {
  return `<div class="callout ${tone}">${bodyHtml}</div>`;
}

const DOCUMENT_CSS = `
:root{--ink:#1d1d1f;--muted:#5f6368;--line:#e3e3e6;--accent:#2f5d50;--bg:#ffffff;--soft:#f6f6f4}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
header.store{padding:10px 20px;background:var(--soft);border-bottom:1px solid var(--line);color:var(--muted);font-size:13px}
main{max-width:860px;margin:0 auto;padding:24px 20px 64px}
.crumbs{font-size:14px;color:var(--muted);margin-bottom:8px}
.crumbs a{color:var(--accent)}
h1{font-size:32px;line-height:1.2;margin:8px 0 4px}
h2{font-size:22px;margin:36px 0 8px;padding-top:8px;border-top:1px solid var(--line)}
h3{font-size:18px;margin:24px 0 6px}
.subtitle{color:var(--muted);margin-top:0}
a{color:var(--accent)}
img,video{max-width:100%;height:auto;border-radius:6px}
.photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin:12px 0}
.photos figure{margin:0}
.photos figcaption{font-size:12px;color:var(--muted);word-break:break-all}
table{border-collapse:collapse;width:100%;margin:12px 0;font-size:15px}
th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}
thead th{background:var(--soft)}
table.fields th{width:28%;background:var(--soft);font-weight:600}
.callout{border:1px solid var(--line);background:var(--soft);padding:12px 16px;margin:16px 0;border-radius:8px}
.callout.warn{border-color:#f0d9a8;background:#fff7e8}
.callout.tip{border-color:#c9dcf0;background:#eef5fc}
ol li,ul li{margin:4px 0}
code{background:var(--soft);padding:1px 5px;border-radius:4px;font-size:14px}
.muted{color:var(--muted)}
@media print{header.store,.crumbs{display:none}main{max-width:none;padding:0}h2{break-after:avoid}img{break-inside:avoid}}
`;
