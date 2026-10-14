/**
 * Helpers shared by the guides and the START HERE page. Pure string builders —
 * no I/O. All user-supplied text goes through `esc`; static copy is written as
 * HTML directly.
 */
import { callout, esc, hrefTo, renderDocument } from "../html";
import {
  SITE_DETAILS_PATH,
  SITE_EXPORT_DIRS,
  type SiteExportFile,
} from "../types";
import type { SiteExportSummary } from "./types";

export const GUIDE_PATHS = {
  wordpress: `${SITE_EXPORT_DIRS.guides}/Moving to WordPress.html`,
  shopify: `${SITE_EXPORT_DIRS.guides}/Moving to Shopify.html`,
  wix: `${SITE_EXPORT_DIRS.guides}/Moving to Wix.html`,
  squarespace: `${SITE_EXPORT_DIRS.guides}/Moving to Squarespace.html`,
  square: `${SITE_EXPORT_DIRS.guides}/Moving to Square Online.html`,
  hiring: `${SITE_EXPORT_DIRS.guides}/Hiring a designer or developer.html`,
  domain: `${SITE_EXPORT_DIRS.guides}/Keeping your domain name.html`,
  payments: `${SITE_EXPORT_DIRS.guides}/Payments, customers and subscriptions.html`,
} as const;

export const IMPORT_PATHS = {
  wordpressContent: `${SITE_EXPORT_DIRS.importFiles}/WordPress/content.wxr.xml`,
  wordpressProducts: `${SITE_EXPORT_DIRS.importFiles}/WordPress/woocommerce-products.csv`,
  shopify: `${SITE_EXPORT_DIRS.importFiles}/Shopify/products.csv`,
  wix: `${SITE_EXPORT_DIRS.importFiles}/Wix/products.csv`,
  squarespace: `${SITE_EXPORT_DIRS.importFiles}/Squarespace/products.csv`,
  square: `${SITE_EXPORT_DIRS.importFiles}/Square/items.csv`,
} as const;

/** Wrap a guide body in the shared document shell with Guides → title breadcrumbs. */
export function guideFile(
  docPath: string,
  title: string,
  summary: SiteExportSummary,
  bodyHtml: string,
  subtitle?: string,
): SiteExportFile {
  return {
    path: docPath,
    contents: renderDocument({
      docPath,
      title,
      storeName: summary.business.name,
      subtitle,
      breadcrumbs: [{ label: "Guides" }, { label: title }],
      bodyHtml,
    }),
  };
}

export function hasImportFile(summary: SiteExportSummary, zipPath: string): boolean {
  return summary.importFiles.includes(zipPath);
}

export function link(docPath: string, zipPath: string, label: string): string {
  return `<a href="${esc(hrefTo(docPath, zipPath))}">${esc(label)}</a>`;
}

export function siteDetailsLink(docPath: string, label = "Site details"): string {
  return link(docPath, SITE_DETAILS_PATH, label);
}

export function ol(items: string[]): string {
  return `<ol>${items.map((i) => `<li>${i}</li>`).join("")}</ol>`;
}

export function ul(items: string[]): string {
  return `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
}

export function h2(text: string): string {
  return `<h2>${esc(text)}</h2>`;
}

/** "1 product" / "3 products". Pass `plural` for irregular nouns. */
export function count(n: number, singular: string, plural = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

export function folder(name: string): string {
  return `<strong>${esc(name)}</strong>`;
}

export function fileName(zipPath: string): string {
  return zipPath.split("/").pop() ?? zipPath;
}

/** Documents whose zip path lives under `dir/`, as links (capped). */
export function documentLinks(
  summary: SiteExportSummary,
  docPath: string,
  dir: string,
  max = 12,
): string {
  const docs = summary.documents.filter((d) => d.path.startsWith(`${dir}/`));
  if (docs.length === 0) return "";
  const shown = docs.slice(0, max).map((d) => link(docPath, d.path, d.label));
  const more =
    docs.length > max
      ? `<li class="muted">…and ${docs.length - max} more in the ${esc(dir)} folder.</li>`
      : "";
  return `<ul>${shown.map((s) => `<li>${s}</li>`).join("")}${more}</ul>`;
}

/**
 * "Which files to use" block: links the import files that exist; when none
 * exist, says to add products by hand.
 */
export function filesToUse(
  summary: SiteExportSummary,
  docPath: string,
  entries: Array<{ path: string; what: string }>,
  platform: string,
): string {
  const present = entries.filter((e) => hasImportFile(summary, e.path));
  if (present.length === 0) {
    return `<p>No ready-made ${esc(platform)} import file was made for this site, so there is nothing to upload. Add your products by hand instead, using the ${folder(SITE_EXPORT_DIRS.products)} folder: it has one page for each product with the name, price and description ready to copy and paste.</p>`;
  }
  return (
    `<p>Use ${present.length === 1 ? "this file" : "these files"}, found in the ${folder(SITE_EXPORT_DIRS.importFiles)} folder:</p>` +
    ul(
      present.map(
        (e) => `${link(docPath, e.path, fileName(e.path))}: ${e.what}`,
      ),
    )
  );
}

/** The standard "your photos" section; `extra` is platform-specific HTML. */
export function photosSection(
  summary: SiteExportSummary,
  extra: string,
  hasImport = true,
): string {
  const photoCount = summary.counts.photos;
  return (
    h2("Your photos") +
    `<p>Your photos${photoCount > 0 ? ` (${count(photoCount, "photo")})` : ""} are in the ${folder(SITE_EXPORT_DIRS.photos)} folder, sorted into sub-folders such as Products, Galleries and Branding.</p>` +
    (hasImport
      ? `<p>The import files do not contain the photos themselves. They contain links to the photos on your old SimplePress site, and the new platform copies each photo from that link while it imports. That only works while your old site is still online, so <strong>import first, and only then close the old site</strong>. If your old site is already offline, upload the photos from the ${folder(SITE_EXPORT_DIRS.photos)} folder instead.</p>`
      : `<p>Upload them to your new site from the ${folder(SITE_EXPORT_DIRS.photos)} folder.</p>`) +
    extra +
    callout(
      `<p>If your ${folder(SITE_EXPORT_DIRS.photos)} folder has a ${folder("Template & stock images")} sub-folder, those pictures appeared on your site but you did not upload them yourself. Check you have the right to reuse them before putting them on a new site.</p>`,
      "warn",
    )
  );
}

/**
 * "What you will need to re-enter by hand" list, filtered to what this store
 * actually has. `extras` are platform-specific bullets (HTML).
 */
export function byHandSection(
  summary: SiteExportSummary,
  docPath: string,
  extras: string[],
): string {
  const c = summary.counts;
  const items: string[] = [
    `<strong>Your pages and the sections on your home page.</strong> Open the readable copies and copy and paste the text into your new site${
      summary.documents.some((d) => d.path.startsWith(`${SITE_EXPORT_DIRS.pages}/`))
        ? ` (start with the ${folder(SITE_EXPORT_DIRS.pages)} folder)`
        : ""
    }. Colors, fonts and layout are not copied, because every platform has its own designs. ${siteDetailsLink(docPath)} lists your business name, contact details, hours and social links.`,
  ];
  if (c.forms > 0)
    items.push(
      `<strong>Forms</strong> (you have ${count(c.forms, "form")}). Rebuild them with your new platform's form tool. Past entries are saved in the ${folder(SITE_EXPORT_DIRS.spreadsheets)} folder.`,
    );
  if ((c.optionGroups ?? 0) > 0)
    items.push(
      `<strong>Product options</strong> (you have ${count(c.optionGroups ?? 0, "option group")}, such as add-on choices or engraving). The import files cannot carry these, so products arrive without them. Each order line in the ${folder(SITE_EXPORT_DIRS.spreadsheets)} folder lists what the customer chose, and the products spreadsheet shows which options each product had. Recreate them with your new platform's product options or add-ons feature.`,
    );
  if (c.faqs > 0)
    items.push(
      `<strong>Frequently asked questions</strong> (${count(c.faqs, "question")}). Copy them from ${siteDetailsLink(docPath)} or the pages that show them.`,
    );
  if (c.testimonials > 0)
    items.push(
      `<strong>Testimonials and reviews</strong> (${count(c.testimonials, "testimonial")}). Add them to a page as text, or to the review feature if your platform has one.`,
    );
  if (c.services > 0)
    items.push(
      `<strong>Services</strong> (${count(c.services, "service")}). See the ${folder(SITE_EXPORT_DIRS.services)} folder.`,
    );
  if (c.events > 0)
    items.push(
      `<strong>Events</strong> (${count(c.events, "event")}). See the ${folder(SITE_EXPORT_DIRS.events)} folder.`,
    );
  if (c.galleries > 0)
    items.push(
      `<strong>Photo galleries</strong> (${count(c.galleries, "gallery", "galleries")}). Rebuild each gallery from the ${folder(SITE_EXPORT_DIRS.galleries)} folder and upload the pictures from ${folder("Photos/Galleries")}.`,
    );
  if (c.loyaltyMembers > 0)
    items.push(
      `<strong>Loyalty points</strong> (${count(c.loyaltyMembers, "member")}). Most platforms cannot import points. The balances are in the ${folder(SITE_EXPORT_DIRS.spreadsheets)} folder if you use a loyalty app.`,
    );
  if (c.invoices > 0)
    items.push(
      `<strong>Invoices</strong> (${count(c.invoices, "invoice")}). Keep the spreadsheet for your records. Your new platform or an accounting tool will start its own invoices.`,
    );
  items.push(
    `<strong>Discount codes.</strong> Create them again in your new platform.`,
    ...extras,
  );
  return (
    h2("What you will need to do by hand") +
    `<p>Import files can only carry products. The rest has to be entered again, but you have a readable copy of everything to copy from:</p>` +
    ul(items)
  );
}

export function nextStepsSection(docPath: string): string {
  return (
    h2("When you are done") +
    ul([
      `Read ${link(docPath, GUIDE_PATHS.domain, "Keeping your domain name")} so your web address moves with you.`,
      `Read ${link(docPath, GUIDE_PATHS.payments, "Payments, customers and subscriptions")} before you close the old site, so nobody is charged by mistake.`,
      `Stuck? ${link(docPath, GUIDE_PATHS.hiring, "Hiring a designer or developer")} explains what to hand to someone who can do it for you.`,
    ])
  );
}

export function stampCheckedNote(): string {
  return `<p class="muted">Menu names were checked against each platform's help pages in October 2026. Platforms rename things now and then, so if a button has a slightly different name, look for the closest match.</p>`;
}
