/** The START HERE.html landing page at the top of the ZIP. */
import { callout, esc, renderDocument } from "../html";
import {
  SITE_DETAILS_PATH,
  SITE_EXPORT_DIRS,
  START_HERE_PATH,
  type SiteExportFile,
} from "../types";
import { GUIDE_PATHS, count, fileName, h2, link, ul } from "./shared";
import type { SiteExportSummary } from "./types";

const MAX_DOCS_PER_SECTION = 25;
const MAX_EXTERNAL_IMAGES = 100;

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

interface FolderRow {
  dir: string;
  what: string;
  amount: string | null;
  /** Show the row even when the amount is empty. */
  always?: boolean;
}

function insideTable(summary: SiteExportSummary): string {
  const c = summary.counts;
  const present = (dir: string) =>
    summary.documents.some((d) => d.path.startsWith(`${dir}/`));
  const rows: FolderRow[] = [
    {
      dir: SITE_EXPORT_DIRS.guides,
      what: "Step-by-step help for moving to another platform, keeping your domain, and handling payments.",
      amount: "8 guides",
      always: true,
    },
    {
      dir: SITE_EXPORT_DIRS.pages,
      what: "Readable copies of your pages, to copy and paste from.",
      amount: c.pages > 0 ? count(c.pages, "page") : null,
    },
    {
      dir: SITE_EXPORT_DIRS.blog,
      what: "Your blog posts.",
      amount: c.posts > 0 ? count(c.posts, "post") : null,
    },
    {
      dir: SITE_EXPORT_DIRS.products,
      what: "Your product catalog, plus one page for each product.",
      amount:
        c.products > 0
          ? `${count(c.products, "product")}${c.collections > 0 ? `, ${count(c.collections, "collection")}` : ""}`
          : null,
    },
    {
      dir: SITE_EXPORT_DIRS.services,
      what: "Your services.",
      amount: c.services > 0 ? count(c.services, "service") : null,
    },
    {
      dir: SITE_EXPORT_DIRS.events,
      what: "Your events.",
      amount: c.events > 0 ? count(c.events, "event") : null,
    },
    {
      dir: SITE_EXPORT_DIRS.galleries,
      what: "Your photo galleries.",
      amount: c.galleries > 0 ? count(c.galleries, "gallery", "galleries") : null,
    },
    {
      dir: SITE_EXPORT_DIRS.photos,
      what: "Every photo and video from your site, sorted into folders.",
      amount:
        c.photos + c.videos > 0
          ? `${count(c.photos, "photo")}${c.videos > 0 ? `, ${count(c.videos, "video")}` : ""}`
          : null,
    },
    {
      dir: SITE_EXPORT_DIRS.spreadsheets,
      what: "Your data in spreadsheets: customers, orders, products and more. Contains personal information.",
      amount:
        summary.spreadsheets.length > 0
          ? count(summary.spreadsheets.length, "spreadsheet")
          : null,
    },
    {
      dir: SITE_EXPORT_DIRS.importFiles,
      what: "Ready-made files to import your products and blog into WordPress, Shopify, Wix, Squarespace or Square.",
      amount:
        summary.importFiles.length > 0
          ? count(summary.importFiles.length, "file")
          : null,
    },
    {
      dir: SITE_EXPORT_DIRS.developers,
      what: "The same data in a format developers prefer. Hand this to a developer.",
      amount: null,
      always: true,
    },
    {
      dir: SITE_EXPORT_DIRS.licenses,
      what: "Open-source licenses for the software and templates your site used.",
      amount: null,
      always: true,
    },
  ];

  const body = rows
    .filter((r) => (r.always ?? false) || r.amount !== null)
    .map((r) => {
      const index = `${r.dir}/index.html`;
      const name = present(r.dir) && summary.documents.some((d) => d.path === index)
        ? link(START_HERE_PATH, index, r.dir)
        : `<strong>${esc(r.dir)}</strong>`;
      return `<tr><td>${name}</td><td>${esc(r.what)}</td><td>${r.amount === null ? "" : esc(r.amount)}</td></tr>`;
    })
    .join("");
  const details = `<tr><td>${link(START_HERE_PATH, SITE_DETAILS_PATH, "Site details.html")}</td><td>Your business name, contact details, hours, links and settings in one place.</td><td></td></tr>`;
  const extras = (summary.extraFolders ?? [])
    .map(
      (f) =>
        `<tr><td><strong>${esc(f.dir)}</strong></td><td>${esc(f.what)}${
          f.links.length > 0
            ? ` Start with ${f.links.map((l) => link(START_HERE_PATH, l.path, l.label)).join(", ")}.`
            : ""
        }</td><td></td></tr>`,
    )
    .join("");
  return `<table><thead><tr><th>Folder</th><th>What it is</th><th>How many</th></tr></thead><tbody>${details}${extras}${body}</tbody></table>`;
}

function decisionTable(): string {
  const g = (path: string, label: string) => link(START_HERE_PATH, path, label);
  const rows: Array<[string, string, string]> = [
    [
      g(GUIDE_PATHS.square, "Square Online"),
      "Has a free plan. Easiest if you already use Square for in-person sales.",
      "Easy",
    ],
    [
      g(GUIDE_PATHS.wix, "Wix"),
      "Easiest drag-and-drop design. Paid.",
      "Easy",
    ],
    [
      g(GUIDE_PATHS.squarespace, "Squarespace"),
      "Polished, drag-and-drop design. Paid.",
      "Easy",
    ],
    [
      g(GUIDE_PATHS.shopify, "Shopify"),
      "Best for larger product catalogs. Paid.",
      "Medium",
    ],
    [
      g(GUIDE_PATHS.wordpress, "WordPress"),
      "Most flexible. Needs more setup, and your own hosting.",
      "Harder",
    ],
    [
      g(GUIDE_PATHS.hiring, "Hire someone"),
      "Hand this folder to a designer or developer, and the guide says what to send.",
      "Least work for you",
    ],
  ];
  return `<table><thead><tr><th>Option</th><th>Good for</th><th>Effort</th></tr></thead><tbody>${rows
    .map(([a, b, c]) => `<tr><td>${a}</td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`)
    .join("")}</tbody></table><p class="muted">Prices and free plans change. Check each platform's own site before you decide.</p>`;
}

function documentsSection(summary: SiteExportSummary): string {
  if (summary.documents.length === 0) return "";
  const sections = new Map<string, SiteExportSummary["documents"]>();
  for (const d of summary.documents) {
    const list = sections.get(d.section) ?? [];
    list.push(d);
    sections.set(d.section, list);
  }
  let html = h2("Your readable documents");
  html += `<p>Open any of these in your web browser. They show your content as plain pages that you can copy and paste into a new site.</p>`;
  for (const [section, docs] of sections) {
    const shown = docs.slice(0, MAX_DOCS_PER_SECTION);
    html += `<h3>${esc(section)}</h3>${ul([
      ...shown.map((d) => link(START_HERE_PATH, d.path, d.label)),
      ...(docs.length > shown.length
        ? [
            `<span class="muted">…and ${docs.length - shown.length} more in the folder.</span>`,
          ]
        : []),
    ])}`;
  }
  return html;
}

function spreadsheetsSection(summary: SiteExportSummary): string {
  if (summary.spreadsheets.length === 0) return "";
  return (
    h2("Your spreadsheets") +
    `<p>Open these in Excel, Numbers or Google Sheets.</p>` +
    ul(
      summary.spreadsheets.map(
        (s) =>
          `${link(START_HERE_PATH, s.path, s.path.replace(`${SITE_EXPORT_DIRS.spreadsheets}/`, ""))}: ${count(s.rows, "row")}`,
      ),
    ) +
    callout(
      `<p><strong>Privacy: the ${esc(SITE_EXPORT_DIRS.spreadsheets)} folder contains your customers' personal information</strong>, such as names, emails and addresses. Store it somewhere safe, do not share it publicly or upload it to a site you do not trust, and delete the files you do not need.</p>`,
      "warn",
    )
  );
}

function notesSection(summary: SiteExportSummary): string {
  const hasNotes = summary.notes.length > 0;
  const external = summary.externalImages;
  if (!hasNotes && external.length === 0) return "";
  let html = h2("Notes");
  if (hasNotes) {
    html += summary.notes
      .map((n) => callout(`<p>${esc(n.message)}</p>`, n.level === "warn" ? "warn" : "info"))
      .join("");
  }
  if (external.length > 0) {
    const shown = external.slice(0, MAX_EXTERNAL_IMAGES);
    html +=
      `<h3>Pictures from other websites</h3>` +
      callout(
        `<p>${count(external.length, "picture")} on your site came from other websites, not from your own uploads. <strong>Check that you have the right to reuse these</strong> before putting them on a new site. Where we could save a copy, there is a link below.</p>`,
        "warn",
      ) +
      `<ul>${shown
        .map(
          (e) =>
            `<li><code>${esc(e.url)}</code>${
              e.zipPath
                ? ` · ${link(START_HERE_PATH, e.zipPath, `saved copy (${fileName(e.zipPath)})`)}`
                : ` · <span class="muted">not saved</span>`
            }</li>`,
        )
        .join("")}${
        external.length > shown.length
          ? `<li class="muted">…and ${external.length - shown.length} more.</li>`
          : ""
      }</ul>`;
  }
  return html;
}

export function buildStartHere(summary: SiteExportSummary): SiteExportFile {
  const { business } = summary;
  const body =
    `<p>This folder is a complete copy of <strong>${esc(business.name)}</strong>, taken on ${esc(formatDate(business.exportedAt))}. It has your content, your photos, your data, and ready-made files for moving to another website platform. Nothing here depends on SimplePress, so you can keep it, open it on any computer, and use it whenever you like. Take your time, and start with the table below.</p>` +
    h2("What's inside") +
    insideTable(summary) +
    h2("Which option is right for me?") +
    `<p>You have three paths: move to another website builder, do it yourself by hand, or hire someone. Each guide explains the steps in plain language.</p>` +
    decisionTable() +
    `<p>Whatever you pick, also read ${link(START_HERE_PATH, GUIDE_PATHS.domain, "Keeping your domain name")} and ${link(START_HERE_PATH, GUIDE_PATHS.payments, "Payments, customers and subscriptions")}.</p>` +
    documentsSection(summary) +
    spreadsheetsSection(summary) +
    notesSection(summary) +
    callout(
      `<p><strong>Keep this export private.</strong> The ${esc(SITE_EXPORT_DIRS.spreadsheets)} folder contains customers' personal information. Store the whole download somewhere safe, and delete what you do not need.</p>`,
      "warn",
    );
  return {
    path: START_HERE_PATH,
    contents: renderDocument({
      docPath: START_HERE_PATH,
      title: "Everything from your SimplePress site, ready to take anywhere",
      storeName: business.name,
      bodyHtml: body,
    }),
  };
}
