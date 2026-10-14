/**
 * Readable (human-friendly, copy-paste-ready) HTML copies of the whole site.
 *
 *   buildReadableDocuments(businessId, ctx)   — fetches, then assembles
 *   assembleReadableDocuments(data, ctx)      — pure; unit-testable without a DB
 *
 * Folder layout (see the plan's ZIP layout):
 *   Site details.html
 *   Pages/        index, one doc per CMS page, "<Page> page sections", FAQ, Testimonials
 *   Blog/         index + one doc per post
 *   Products/     index, Collections, one doc per product
 *   Services/ Events/ Galleries/   index + one doc each (only when rows exist)
 */
import { createNameDeduper, safeName, SITE_DETAILS_PATH, SITE_EXPORT_DIRS } from "../types";
import type { MediaIndex, SiteExportBusiness, SiteExportFile, SiteExportNote } from "../types";
import { BLOG_INDEX_PATH, renderBlogIndex, renderBlogPostDoc } from "./blog";
import { EVENTS_INDEX_PATH, renderEventDoc, renderEventsIndex } from "./events";
import { selectFieldPages } from "./fields";
import type { ReadableData } from "./fetch";
import { fetchReadableData } from "./fetch";
import {
  GALLERIES_INDEX_PATH,
  renderGalleriesIndex,
  renderGalleryDoc,
} from "./galleries";
import {
  PAGES_INDEX_PATH,
  renderFaqDoc,
  renderFieldsDoc,
  renderPageDoc,
  renderPagesIndex,
  renderTestimonialsDoc,
} from "./pages";
import {
  COLLECTIONS_PATH,
  PRODUCTS_INDEX_PATH,
  renderCollectionsDoc,
  renderProductDoc,
  renderProductsIndex,
} from "./products";
import {
  renderServiceDoc,
  renderServicesIndex,
  SERVICES_INDEX_PATH,
} from "./services";
import { renderSiteDetailsDoc } from "./site-details";
import type { ReadableRefs, RenderCtx } from "./types";

export interface ReadableCounts {
  pages: number;
  posts: number;
  products: number;
  collections: number;
  services: number;
  events: number;
  galleries: number;
  faqs: number;
  testimonials: number;
}

export interface ReadableDocuments {
  files: SiteExportFile[];
  counts: ReadableCounts;
  /** Every generated document, for START HERE to link. */
  index: Array<{ section: string; label: string; path: string }>;
  notes: SiteExportNote[];
}

export interface ReadableBuildContext {
  business: SiteExportBusiness;
  media: Pick<MediaIndex, "byUrl">;
}

export async function buildReadableDocuments(
  businessId: string,
  ctx: ReadableBuildContext,
): Promise<ReadableDocuments> {
  const data = await fetchReadableData(businessId);
  return assembleReadableDocuments(data, ctx);
}

/** Dedupes "<safe title>.html" names within one folder; "index" is reserved. */
function createFolder(dir: string, reserved: string[] = ["index"]) {
  const dedupe = createNameDeduper();
  for (const r of reserved) dedupe(r);
  return (title: string, fallback?: string) =>
    `${dir}/${dedupe(safeName(title, fallback))}.html`;
}

const WIDGET_WARNING = /form node|quote calculator/i;

export function assembleReadableDocuments(
  data: ReadableData,
  base: ReadableBuildContext,
): ReadableDocuments {
  const files: SiteExportFile[] = [];
  const index: ReadableDocuments["index"] = [];
  const notes: SiteExportNote[] = [];
  const warnings = new Map<string, Set<string>>();

  const add = (
    section: string,
    label: string,
    path: string,
    contents: string,
    listed = true,
  ) => {
    files.push({ path, contents });
    if (listed) index.push({ section, label, path });
  };

  // ── Paths first, so cross-references (galleries, collections) resolve ──
  const pagesPath = createFolder(SITE_EXPORT_DIRS.pages);
  const blogPath = createFolder(SITE_EXPORT_DIRS.blog);
  const productPath = createFolder(SITE_EXPORT_DIRS.products, ["index", "Collections"]);
  const servicePath = createFolder(SITE_EXPORT_DIRS.services);
  const eventPath = createFolder(SITE_EXPORT_DIRS.events);
  const galleryPath = createFolder(SITE_EXPORT_DIRS.galleries);

  const galleryEntries = data.galleries.map((gallery) => ({
    gallery,
    path: galleryPath(gallery.name, "Gallery"),
  }));
  const pageEntries = data.pages.map((page) => ({
    page,
    path: pagesPath(page.title, "Page"),
  }));
  const postEntries = data.posts.map((post) => ({
    post,
    path: blogPath(post.title, "Post"),
  }));
  const productEntries = data.products.map((product) => ({
    product,
    path: productPath(product.name, "Product"),
  }));
  const serviceEntries = data.services.map((service) => ({
    service,
    path: servicePath(service.name, "Service"),
  }));
  const eventEntries = data.events.map((event) => ({
    event,
    path: eventPath(event.name, "Event"),
  }));

  const refs: ReadableRefs = {
    galleries: new Map(
      galleryEntries.map(({ gallery, path }) => [
        gallery.id,
        { name: gallery.name, path },
      ]),
    ),
    collections: new Map(
      data.collections.map((c) => [c.id, { name: c.name, path: COLLECTIONS_PATH }]),
    ),
    faqs: new Map(data.faqs.map((f) => [f.id, { question: f.question }])),
    forms: data.formRefs,
  };

  const ctx: RenderCtx = {
    ...base,
    galleryMap: data.galleryMap,
    refs,
    timeZone: data.timeZone,
    onWarning: (docPath, message) => {
      const set = warnings.get(docPath) ?? new Set<string>();
      set.add(message);
      warnings.set(docPath, set);
    },
  };

  // ── Site details ──
  add("Site", "Site details", SITE_DETAILS_PATH, renderSiteDetailsDoc(data.details, ctx));

  // ── Pages ──
  const extraPageDocs: Array<{ title: string; path: string; kind: string }> = [];

  for (const { page, path } of pageEntries) {
    add("Pages", page.title, path, renderPageDoc(page, ctx, path));
  }

  for (const selected of selectFieldPages(data.registry, data.customFields)) {
    const path = pagesPath(selected.title);
    add("Pages", selected.title, path, renderFieldsDoc(selected, ctx, path));
    extraPageDocs.push({ title: selected.title, path, kind: "Page sections" });
  }
  if (!data.registry.resolved && data.customFields) {
    notes.push({
      level: "info",
      message: `The "${data.registry.templateId}" design has no field list on file, so its saved text and images are listed under "Other saved content" using their technical names.`,
    });
  }

  if (data.faqs.length > 0) {
    const path = pagesPath("FAQ");
    add("Pages", "FAQ", path, renderFaqDoc(data.faqs, ctx, path));
    extraPageDocs.push({ title: "FAQ", path, kind: "Questions and answers" });
  }
  if (data.testimonials.length > 0) {
    const path = pagesPath("Testimonials");
    add("Pages", "Testimonials", path, renderTestimonialsDoc(data.testimonials, ctx, path));
    extraPageDocs.push({ title: "Testimonials", path, kind: "Customer quotes" });
  }
  if (pageEntries.length + extraPageDocs.length > 0) {
    add(
      "Pages",
      "All pages",
      PAGES_INDEX_PATH,
      renderPagesIndex(pageEntries, extraPageDocs, ctx),
    );
  }

  // ── Blog ──
  for (const { post, path } of postEntries) {
    add("Blog", post.title, path, renderBlogPostDoc(post, ctx, path));
  }
  if (postEntries.length > 0) {
    add("Blog", "All blog posts", BLOG_INDEX_PATH, renderBlogIndex(postEntries, ctx));
  }

  // ── Products ──
  for (const { product, path } of productEntries) {
    add("Products", product.name, path, renderProductDoc(product, ctx, path));
  }
  if (data.collections.length > 0) {
    const productPaths = new Map(
      productEntries.map(({ product, path }) => [product.slug, path]),
    );
    add(
      "Products",
      "Collections",
      COLLECTIONS_PATH,
      renderCollectionsDoc(data.collections, productPaths, ctx),
    );
  }
  if (productEntries.length > 0 || data.collections.length > 0) {
    add(
      "Products",
      "All products",
      PRODUCTS_INDEX_PATH,
      renderProductsIndex(productEntries, ctx, data.collections.length > 0),
    );
  }

  // ── Services ──
  for (const { service, path } of serviceEntries) {
    add(
      "Services",
      service.name,
      path,
      renderServiceDoc(service, ctx, path, data.serviceFieldInfo(service.serviceTemplateId)),
    );
  }
  if (serviceEntries.length > 0) {
    add("Services", "All services", SERVICES_INDEX_PATH, renderServicesIndex(serviceEntries, ctx));
  }

  // ── Events ──
  for (const { event, path } of eventEntries) {
    add("Events", event.name, path, renderEventDoc(event, ctx, path));
  }
  if (eventEntries.length > 0) {
    add("Events", "All events", EVENTS_INDEX_PATH, renderEventsIndex(eventEntries, ctx));
  }

  // ── Galleries ──
  for (const { gallery, path } of galleryEntries) {
    add("Galleries", gallery.name, path, renderGalleryDoc(gallery, ctx, path));
  }
  if (galleryEntries.length > 0) {
    add("Galleries", "All galleries", GALLERIES_INDEX_PATH, renderGalleriesIndex(galleryEntries, ctx));
  }

  // ── Notes from rich-text serialization ──
  for (const [docPath, set] of warnings) {
    const widgets = [...set].filter((w) => WIDGET_WARNING.test(w));
    const other = [...set].filter((w) => !WIDGET_WARNING.test(w));
    if (widgets.length > 0) {
      notes.push({
        level: "info",
        message: `${docPath} contains a form or quote calculator. These can't be exported; re-create them with your new site builder.`,
      });
    }
    for (const w of other) {
      notes.push({ level: "warn", message: `${docPath}: ${w}` });
    }
  }

  return {
    files,
    counts: {
      pages: data.pages.length,
      posts: data.posts.length,
      products: data.products.length,
      collections: data.collections.length,
      services: data.services.length,
      events: data.events.length,
      galleries: data.galleries.length,
      faqs: data.faqs.length,
      testimonials: data.testimonials.length,
    },
    index,
    notes,
  };
}
