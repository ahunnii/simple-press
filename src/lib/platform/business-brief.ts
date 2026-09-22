import "server-only";

import { TRPCError } from "@trpc/server";

import { formatBusinessAddress } from "~/lib/address/format";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { getCanonicalBaseUrl } from "~/lib/canonical";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { firstNonBlank } from "~/lib/seo/blank";
import { db } from "~/server/db";

const NOT_SET = "(not set)";

export type BusinessBriefFaq = {
  question: string;
  answer: string;
};

export type BusinessBriefData = {
  name: string;
  url: string;
  location: string | null;
  phone: string | null;
  email: string | null;
  hours: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  products: string[];
  services: string[];
  collections: string[];
  pages: string[];
  faqs: BusinessBriefFaq[];
};

function labeledLine(label: string, value: string | null): string | null {
  return value == null ? null : `${label}: ${value}`;
}

function bulletSection(heading: string, items: string[]): string | null {
  if (items.length === 0) return null;
  return [`## ${heading}`, ...items.map((item) => `- ${item}`)].join("\n");
}

function faqSection(faqs: BusinessBriefFaq[]): string | null {
  if (faqs.length === 0) return null;
  const blocks = faqs.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`);
  return `## FAQs\n${blocks.join("\n\n")}`;
}

/**
 * Compact public brief for a platform admin to paste into an LLM.
 * Empty optional identity lines and empty catalog sections are omitted.
 * Site SEO is always present so blank title/description show as `(not set)`.
 */
export function formatBusinessBrief(data: BusinessBriefData): string {
  const identity = [
    `# ${data.name}`,
    `URL: ${data.url}`,
    labeledLine("Location", data.location),
    labeledLine("Phone", data.phone),
    labeledLine("Email", data.email),
    labeledLine("Hours", data.hours),
  ].filter((line): line is string => line !== null);

  const seo = [
    "## Site SEO",
    `Title: ${data.metaTitle ?? NOT_SET}`,
    `Description: ${data.metaDescription ?? NOT_SET}`,
  ].join("\n");

  const sections = [
    identity.join("\n"),
    seo,
    bulletSection("Products", data.products),
    bulletSection("Services", data.services),
    bulletSection("Collections", data.collections),
    bulletSection("Pages", data.pages),
    faqSection(data.faqs),
  ].filter((section): section is string => section !== null);

  return `${sections.join("\n\n")}\n`;
}

/**
 * Assemble a high-level public markdown brief for one business.
 *
 * Id-addressed (not hostname-addressed): platform admins export some other
 * tenant from admin.simplepress.co. Unpublished rows and disabled features
 * are skipped. Private fields (ownerEmail, orders, tokens, drafts) are never
 * selected.
 */
export async function buildBusinessBrief(businessId: string): Promise<string> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    select: {
      name: true,
      subdomain: true,
      customDomain: true,
      domainStatus: true,
      phoneNumber: true,
      supportEmail: true,
      businessAddress: true,
      addressStreet: true,
      addressCity: true,
      addressState: true,
      addressPostalCode: true,
      businessHours: true,
      featureFlags: true,
      siteContent: {
        select: {
          metaTitle: true,
          metaDescription: true,
        },
      },
    },
  });

  if (!business) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
  }

  const { isEnabled } = resolveFlags(business.featureFlags);
  const emptyNames = Promise.resolve([] as { name: string }[]);
  const emptyPages = Promise.resolve([] as { title: string }[]);

  const [products, services, collections, pages, faqs] = await Promise.all([
    isEnabled("products")
      ? db.product.findMany({
          where: { businessId, published: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { name: true },
        })
      : emptyNames,
    isEnabled("services")
      ? db.service.findMany({
          where: { businessId, published: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { name: true },
        })
      : emptyNames,
    isEnabled("collections")
      ? db.collection.findMany({
          where: { businessId, published: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { name: true },
        })
      : emptyNames,
    isEnabled("pages")
      ? db.page.findMany({
          where: { businessId, published: true, type: { not: "blog" } },
          orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
          select: { title: true },
        })
      : emptyPages,
    db.faqItem.findMany({
      where: { businessId, published: true },
      orderBy: { sortOrder: "asc" },
      select: { question: true, answer: true },
    }),
  ]);

  const hoursRows = formatBusinessHours(
    parseBusinessHours(business.businessHours),
  );
  const hours =
    hoursRows.length > 0
      ? hoursRows.map((row) => `${row.label} ${row.value}`).join("; ")
      : null;

  return formatBusinessBrief({
    name: business.name,
    url: getCanonicalBaseUrl(business),
    location:
      firstNonBlank(
        formatBusinessAddress({
          street: business.addressStreet,
          city: business.addressCity,
          state: business.addressState,
          postalCode: business.addressPostalCode,
        }),
        business.businessAddress,
      ) ?? null,
    phone: firstNonBlank(business.phoneNumber) ?? null,
    email: firstNonBlank(business.supportEmail) ?? null,
    hours,
    metaTitle: firstNonBlank(business.siteContent?.metaTitle) ?? null,
    metaDescription:
      firstNonBlank(business.siteContent?.metaDescription) ?? null,
    products: products.map((row) => row.name),
    services: services.map((row) => row.name),
    collections: collections.map((row) => row.name),
    pages: pages.map((row) => row.title),
    faqs,
  });
}
