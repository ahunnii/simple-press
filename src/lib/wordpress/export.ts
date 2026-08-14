/**
 * Export to WordPress — data collector.
 *
 * Fetches all of a business's content, catalog, and commercial records and
 * packages them into the set of files that make up a WordPress-offboarding
 * export zip (WXR content, WooCommerce product CSV, records CSVs, a machine
 * readable data.json, and a plain-language README migration guide).
 *
 * This module is server-only (it imports Prisma via `~/server/db`). It carries
 * no HTTP concerns — the route handler owns auth and ZIP assembly. Money fields
 * on Order/OrderItem are stored in cents (Stripe amounts), matching what the
 * csv-builders expect. `prisma-field-encryption` decrypts `@encrypted` fields
 * transparently on read, so addresses/phones need no special handling here.
 */
import type {
  CustomerForExport,
  DiscountForExport,
  OrderForExport,
  ReviewForExport,
} from "~/lib/wordpress/csv-builders";
import type { ExportSummary } from "~/lib/wordpress/readme";
import type {
  GalleryForHtml,
  GalleryMap,
} from "~/lib/wordpress/tiptap-to-html";
import type { WxrChannel, WxrItem } from "~/lib/wordpress/wxr";
import { getBusinessUrl } from "~/lib/business-url";
import { isStorageUrl } from "~/lib/s3/url";
import {
  buildCustomerAddressesCsv,
  buildCustomersCsv,
  buildDiscountsCsv,
  buildOrderItemsCsv,
  buildOrdersCsv,
  buildReviewsCsv,
} from "~/lib/wordpress/csv-builders";
import { exportToWooCommerceCSV } from "~/lib/wordpress/csv-exporter";
import { buildReadme } from "~/lib/wordpress/readme";
import { tiptapToHtml } from "~/lib/wordpress/tiptap-to-html";
import { buildWxrDocument } from "~/lib/wordpress/wxr";
import { db } from "~/server/db";

// ─── Public API ────────────────────────────────────────────────────────────

export interface WordPressExportFile {
  path: string;
  contents: string;
}

export interface WordPressExportResult {
  businessSlug: string;
  /** Every zip entry, including README.md. */
  files: WordPressExportFile[];
  counts: ExportSummary["counts"];
}

// ─── Prisma fetchers (run in Promise.all) ───────────────────────────────────

async function fetchBusiness(businessId: string) {
  return db.business.findUnique({
    where: { id: businessId },
    select: {
      name: true,
      slug: true,
      subdomain: true,
      customDomain: true,
      domainStatus: true,
    },
  });
}

async function fetchPages(businessId: string) {
  return db.page.findMany({
    where: { businessId },
    orderBy: { sortOrder: "asc" },
  });
}

async function fetchGalleries(businessId: string) {
  return db.gallery.findMany({
    where: { businessId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      showCaptions: true,
      images: {
        select: {
          id: true,
          url: true,
          altText: true,
          caption: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

async function fetchFaqItems(businessId: string) {
  return db.faqItem.findMany({
    where: { businessId, published: true },
    select: {
      id: true,
      question: true,
      answer: true,
      sortOrder: true,
      published: true,
    },
    orderBy: { sortOrder: "asc" },
  });
}

async function fetchTestimonials(businessId: string) {
  return db.testimonial.findMany({
    where: { businessId, isApproved: true, isHidden: false },
    select: {
      id: true,
      text: true,
      customerName: true,
      customerTitle: true,
      customerCompany: true,
      photoUrls: true,
      testimonialDate: true,
      createdAt: true,
    },
    orderBy: { testimonialDate: "desc" },
  });
}

async function fetchProducts(businessId: string) {
  return db.product.findMany({
    where: { businessId },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
      collectionProducts: {
        include: { collection: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function fetchOrders(businessId: string) {
  return db.order.findMany({
    where: { businessId },
    include: {
      items: true,
      shippingAddress: true,
      discountCode: { select: { code: true } },
      shipments: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function fetchCustomers(businessId: string) {
  return db.customer.findMany({
    where: { businessId },
    include: { shippingAddresses: true },
    orderBy: { createdAt: "desc" },
  });
}

async function fetchDiscountCodes(businessId: string) {
  return db.discountCode.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });
}

async function fetchReviews(businessId: string) {
  return db.productReview.findMany({
    where: { product: { businessId } },
    include: { product: { select: { name: true, sku: true } } },
    orderBy: { reviewDate: "desc" },
  });
}

async function fetchSiteContent(businessId: string) {
  return db.siteContent.findUnique({ where: { businessId } });
}

async function fetchShippingZones(businessId: string) {
  return db.shippingZone.findMany({
    where: { businessId },
    include: { rates: { orderBy: { tierIndex: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
}

// ─── DTO mappers (CSV builders) ─────────────────────────────────────────────

function mapOrder(
  o: Awaited<ReturnType<typeof fetchOrders>>[number],
): OrderForExport {
  return {
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    customerName: o.customerName,
    customerEmail: o.customerEmail,
    status: o.status,
    paymentStatus: o.paymentStatus,
    fulfillmentStatus: o.fulfillmentStatus,
    deliveryMethod: o.deliveryMethod,
    paymentMethod: o.paymentMethod,
    subtotal: o.subtotal,
    shipping: o.shipping,
    tax: o.tax,
    discount: o.discount,
    total: o.total,
    refundAmountCents: o.refundAmountCents,
    discountCode: o.discountCode,
    items: o.items.map((i) => ({
      productName: i.productName,
      variantName: i.variantName,
      sku: i.sku,
      price: i.price,
      quantity: i.quantity,
      total: i.total,
      fulfilledQuantity: i.fulfilledQuantity,
    })),
    shippingAddress: o.shippingAddress
      ? {
          firstName: o.shippingAddress.firstName,
          lastName: o.shippingAddress.lastName,
          address1: o.shippingAddress.address1,
          address2: o.shippingAddress.address2,
          city: o.shippingAddress.city,
          province: o.shippingAddress.province,
          zip: o.shippingAddress.zip,
          country: o.shippingAddress.country,
        }
      : null,
    stripeSessionId: o.stripeSessionId,
    stripePaymentIntentId: o.stripePaymentIntentId,
    customerPhone: o.customerPhone,
    customerNote: o.customerNote,
    internalNote: o.internalNote,
    shipments: o.shipments.map((s) => ({
      carrier: s.carrier,
      trackingNumber: s.trackingNumber,
    })),
  };
}

function mapCustomer(
  c: Awaited<ReturnType<typeof fetchCustomers>>[number],
): CustomerForExport {
  return {
    email: c.email,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    acceptsMarketing: c.acceptsMarketing,
    totalSpent: c.totalSpent,
    orderCount: c.orderCount,
    notes: c.notes,
    createdAt: c.createdAt,
    shippingAddresses: c.shippingAddresses.map((a) => ({
      firstName: a.firstName,
      lastName: a.lastName,
      company: a.company,
      address1: a.address1,
      address2: a.address2,
      city: a.city,
      province: a.province,
      zip: a.zip,
      country: a.country,
      phone: a.phone,
      isDefault: a.isDefault,
    })),
  };
}

function mapDiscount(
  d: Awaited<ReturnType<typeof fetchDiscountCodes>>[number],
): DiscountForExport {
  return {
    code: d.code,
    type: d.type,
    value: d.value,
    active: d.active,
    usageLimit: d.usageLimit,
    usageCount: d.usageCount,
    startsAt: d.startsAt,
    expiresAt: d.expiresAt,
    minPurchase: d.minPurchase,
    maxDiscount: d.maxDiscount,
  };
}

function mapReview(
  r: Awaited<ReturnType<typeof fetchReviews>>[number],
): ReviewForExport {
  return {
    productName: r.product.name,
    productSku: r.product.sku,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    customerName: r.customerName,
    customerEmail: r.customerEmail,
    verifiedPurchase: r.verifiedPurchase,
    isApproved: r.isApproved,
    isHidden: r.isHidden,
    source: r.source,
    reviewDate: r.reviewDate,
  };
}

// ─── HTML helpers (synthetic pages) ─────────────────────────────────────────

/** Escape a value for safe interpolation into HTML text or an attribute. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Convert a plain-text block (e.g. an FAQ answer) to HTML: blank lines split
 * paragraphs, single newlines become `<br>`. Text is escaped first.
 */
function plainTextToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// ─── Collector ──────────────────────────────────────────────────────────────

/**
 * Fetch and package all of a business's content into WordPress export files.
 *
 * Returns the full list of zip entries (including README.md and data.json),
 * the business slug (for the zip filename), and the summary counts.
 */
export async function collectWordPressExport(
  businessId: string,
): Promise<WordPressExportResult> {
  const now = new Date();
  const exportedAt = now.toISOString();

  const [
    business,
    pages,
    galleries,
    faqItems,
    testimonials,
    products,
    orders,
    customers,
    discountCodes,
    reviews,
    siteContent,
    shippingZones,
  ] = await Promise.all([
    fetchBusiness(businessId),
    fetchPages(businessId),
    fetchGalleries(businessId),
    fetchFaqItems(businessId),
    fetchTestimonials(businessId),
    fetchProducts(businessId),
    fetchOrders(businessId),
    fetchCustomers(businessId),
    fetchDiscountCodes(businessId),
    fetchReviews(businessId),
    fetchSiteContent(businessId),
    fetchShippingZones(businessId),
  ]);

  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }

  const storefrontBaseUrl = getBusinessUrl({
    subdomain: business.subdomain,
    customDomain: business.customDomain,
    domainStatus: business.domainStatus,
  });

  // ── Gallery map for TipTap → HTML rendering ──
  const galleryMap: GalleryMap = new Map<string, GalleryForHtml>(
    galleries.map((g) => [
      g.id,
      {
        id: g.id,
        name: g.name,
        showCaptions: g.showCaptions,
        images: g.images.map((img) => ({
          url: img.url,
          altText: img.altText,
          caption: img.caption,
        })),
      },
    ]),
  );

  // ── WXR items from real pages ──
  const warnings: string[] = [];
  const existingSlugs = new Set(pages.map((p) => p.slug));

  const pageItems: WxrItem[] = pages.map((page) => {
    const {
      html,
      imageUrls,
      warnings: pageWarnings,
    } = tiptapToHtml(page.content, galleryMap);
    for (const w of pageWarnings) {
      warnings.push(`[${page.slug}] ${w}`);
    }

    const isBlog = page.type === "blog";

    return {
      title: page.title,
      slug: page.slug,
      contentHtml: html,
      excerpt: page.excerpt ?? undefined,
      postDateGmt: page.publishedAt ?? page.createdAt,
      status: page.published ? "publish" : "draft",
      type: isBlog ? "post" : "page",
      menuOrder: page.sortOrder,
      categories: isBlog ? ["Blog"] : undefined,
      attachments: imageUrls.filter(isStorageUrl).map((url) => ({ url })),
      featuredImageUrl:
        page.image && isStorageUrl(page.image) ? page.image : undefined,
    };
  });

  // ── Synthetic FAQ page ──
  const faqItem: WxrItem | null =
    faqItems.length > 0
      ? {
          title: "Frequently Asked Questions",
          slug: existingSlugs.has("faq") ? "faq-export" : "faq",
          contentHtml: faqItems
            .map(
              (f) =>
                `<h3>${escapeHtml(f.question)}</h3>${plainTextToHtml(f.answer)}`,
            )
            .join(""),
          postDateGmt: now,
          status: "publish",
          type: "page",
        }
      : null;

  // ── Synthetic Testimonials page ──
  let testimonialItem: WxrItem | null = null;
  if (testimonials.length > 0) {
    const testimonialAttachments = new Set<string>();
    const blocks = testimonials.map((t) => {
      const photoImgs = t.photoUrls
        .map((url) => {
          if (isStorageUrl(url)) testimonialAttachments.add(url);
          return `<img src="${escapeHtml(url)}" alt="">`;
        })
        .join("");
      const cite = [t.customerName, t.customerTitle, t.customerCompany]
        .filter((part): part is string => Boolean(part))
        .map(escapeHtml)
        .join(", ");
      return `<blockquote><p>${escapeHtml(
        t.text,
      )}</p>${photoImgs}<cite>${cite}</cite></blockquote>`;
    });

    testimonialItem = {
      title: "Testimonials",
      slug: existingSlugs.has("testimonials")
        ? "testimonials-export"
        : "testimonials",
      contentHtml: blocks.join(""),
      postDateGmt: now,
      status: "publish",
      type: "page",
      attachments: Array.from(testimonialAttachments).map((url) => ({ url })),
    };
  }

  const wxrItems: WxrItem[] = [
    ...pageItems,
    ...(faqItem ? [faqItem] : []),
    ...(testimonialItem ? [testimonialItem] : []),
  ];

  const channel: WxrChannel = {
    title: business.name,
    link: storefrontBaseUrl,
    description: "Exported from SimplePress",
  };

  const wxr = buildWxrDocument(channel, wxrItems);

  // ── CSVs ──
  const orderDtos = orders.map(mapOrder);
  const customerDtos = customers.map(mapCustomer);

  const productsCsv = exportToWooCommerceCSV(products);
  const ordersCsv = buildOrdersCsv(orderDtos);
  const orderItemsCsv = buildOrderItemsCsv(orderDtos);
  const customersCsv = buildCustomersCsv(customerDtos);
  const customerAddressesCsv = buildCustomerAddressesCsv(customerDtos);
  const discountsCsv = buildDiscountsCsv(discountCodes.map(mapDiscount));
  const reviewsCsv = buildReviewsCsv(reviews.map(mapReview));

  // ── Counts ──
  const counts: ExportSummary["counts"] = {
    pages: pages.filter((p) => p.type === "page" || p.type === "custom").length,
    blogPosts: pages.filter((p) => p.type === "blog").length,
    policies: pages.filter((p) => p.type === "policy").length,
    faqs: faqItems.length,
    testimonials: testimonials.length,
    products: products.length,
    orders: orders.length,
    customers: customers.length,
    discounts: discountCodes.length,
    reviews: reviews.length,
  };

  // ── README (with optional Export notes appended) ──
  let readme = buildReadme({
    storeName: business.name,
    exportedAt,
    counts,
  });
  if (warnings.length > 0) {
    readme +=
      "\n## Export notes\n\n" +
      "A few items in your page content could not be fully converted and were " +
      "skipped. This usually only affects unusual embeds or custom blocks — " +
      "review the affected pages after importing:\n\n" +
      warnings.map((w) => `- ${w}`).join("\n") +
      "\n";
  }

  // ── data.json (raw dump) ──
  const dataJson = JSON.stringify(
    {
      formatVersion: 1,
      exportedAt,
      business: { name: business.name, slug: business.slug },
      pages,
      siteContent,
      faqItems,
      testimonials,
      galleries,
      // Raw products too: the WooCommerce CSV can't carry additionalFields
      // (template-specific JSON, e.g. rich "additional information" docs) or
      // SEO meta, so the full rows are preserved here.
      products,
      discountCodes,
      shippingZones,
      orders,
      customers,
      reviews,
    },
    null,
    2,
  );

  // ── Assemble file list ──
  const files: WordPressExportFile[] = [
    { path: "README.md", contents: readme },
    { path: "content.wxr.xml", contents: wxr },
    { path: "products.csv", contents: productsCsv },
    { path: "data.json", contents: dataJson },
  ];

  // Records CSVs — omit entirely when their builder returns "" (empty dataset).
  const recordFiles: WordPressExportFile[] = [
    { path: "records/orders.csv", contents: ordersCsv },
    { path: "records/order-items.csv", contents: orderItemsCsv },
    { path: "records/customers.csv", contents: customersCsv },
    { path: "records/customer-addresses.csv", contents: customerAddressesCsv },
    { path: "records/discounts.csv", contents: discountsCsv },
    { path: "records/reviews.csv", contents: reviewsCsv },
  ];
  for (const file of recordFiles) {
    if (file.contents !== "") files.push(file);
  }

  return {
    businessSlug: business.slug,
    files,
    counts,
  };
}
