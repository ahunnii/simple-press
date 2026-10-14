/**
 * Read-only database queries for the readable documents. Maps Prisma rows
 * onto the plain input types in `./types` — nothing here renders HTML.
 */
import type { GalleryMap } from "~/lib/wordpress/tiptap-to-html";
import { db } from "~/server/db";
import {
  getFieldRegistry,
  getServiceFieldInfo,
  resolveThemeLabels,
  templateLabel,
} from "./registry";
import type {
  CollectionInput,
  EventInput,
  FaqInput,
  FieldDef,
  FieldRegistry,
  GalleryInput,
  PageInput,
  ProductInput,
  ServiceInput,
  SiteDetailsInput,
  TestimonialInput,
} from "./types";

export interface ReadableData {
  pages: PageInput[];
  posts: PageInput[];
  products: ProductInput[];
  collections: CollectionInput[];
  services: ServiceInput[];
  events: EventInput[];
  galleries: GalleryInput[];
  faqs: FaqInput[];
  testimonials: TestimonialInput[];
  details: SiteDetailsInput;
  registry: FieldRegistry;
  /** Raw `SiteContent.customFields`. */
  customFields: unknown;
  timeZone: string;
  galleryMap: GalleryMap;
  serviceFieldInfo: (serviceTemplateId: string) => {
    fields: FieldDef[];
    groupTitles: Record<string, string>;
  };
}

export async function fetchReadableData(
  businessId: string,
): Promise<ReadableData> {
  const [
    business,
    siteContent,
    pageRows,
    productRows,
    collectionRows,
    serviceRows,
    eventRows,
    galleryRows,
    faqRows,
    testimonialRows,
  ] = await Promise.all([
    db.business.findUniqueOrThrow({
      where: { id: businessId },
      select: {
        name: true,
        subdomain: true,
        customDomain: true,
        domainStatus: true,
        templateId: true,
        supportEmail: true,
        ownerEmail: true,
        phoneNumber: true,
        businessAddress: true,
        timeZone: true,
        latitude: true,
        longitude: true,
        areaServed: true,
        businessHours: true,
        offersInStorePickup: true,
        pickupLocation: true,
        pickupInstructions: true,
      },
    }),
    db.siteContent.findUnique({ where: { businessId } }),
    db.page.findMany({ where: { businessId }, orderBy: { sortOrder: "asc" } }),
    db.product.findMany({
      where: { businessId },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: { createdAt: "asc" } },
        collectionProducts: {
          include: { collection: { select: { name: true } } },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    db.collection.findMany({
      where: { businessId },
      include: {
        collectionProducts: {
          orderBy: { sortOrder: "asc" },
          include: { product: { select: { name: true, slug: true } } },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
    db.service.findMany({
      where: { businessId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    }),
    db.event.findMany({ where: { businessId }, orderBy: { startAt: "desc" } }),
    db.gallery.findMany({
      where: { businessId },
      include: { images: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "asc" },
    }),
    db.faqItem.findMany({
      where: { businessId },
      orderBy: { sortOrder: "asc" },
    }),
    db.testimonial.findMany({
      where: { businessId },
      orderBy: { testimonialDate: "desc" },
    }),
  ]);

  const toPage = (p: (typeof pageRows)[number]): PageInput => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    type: p.type,
    published: p.published,
    content: p.content,
    excerpt: p.excerpt,
    image: p.image,
    metaTitle: p.metaTitle,
    metaDescription: p.metaDescription,
    metaKeywords: p.metaKeywords,
    ogImage: p.ogImage,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
    scheduledPublishAt: p.scheduledPublishAt,
  });

  const customFields = siteContent?.customFields ?? null;

  const galleries: GalleryInput[] = galleryRows.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    description: g.description,
    layout: g.layout,
    images: g.images.map((i) => ({
      url: i.url,
      alt: i.altText,
      caption: i.caption,
    })),
  }));

  const galleryMap: GalleryMap = new Map(
    galleryRows.map((g) => [
      g.id,
      {
        id: g.id,
        name: g.name,
        showCaptions: g.showCaptions,
        images: g.images.map((i) => ({
          url: i.url,
          altText: i.altText,
          caption: i.caption,
        })),
      },
    ]),
  );

  return {
    pages: pageRows.filter((p) => p.type !== "blog").map(toPage),
    posts: pageRows.filter((p) => p.type === "blog").map(toPage),
    products: productRows.map((p) => ({
      name: p.name,
      slug: p.slug,
      excerpt: p.excerpt,
      description: p.description,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      sku: p.sku,
      barcode: p.barcode,
      trackInventory: p.trackInventory,
      inventoryQty: p.inventoryQty,
      allowBackorders: p.allowBackorders,
      weight: p.weight,
      weightUnit: p.weightUnit,
      published: p.published,
      featured: p.featured,
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      metaKeywords: p.metaKeywords,
      ogImage: p.ogImage,
      images: p.images.map((i) => ({ url: i.url, alt: i.altText })),
      variants: p.variants.map((v) => ({
        name: v.name,
        sku: v.sku,
        barcode: v.barcode,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        inventoryQty: v.inventoryQty,
        options: v.options,
        imageUrl: v.imageUrl,
      })),
      collections: p.collectionProducts.map((cp) => cp.collection.name),
      subscriptionEnabled: p.subscriptionEnabled,
      subscriptionDiscountPercent: p.subscriptionDiscountPercent,
      additionalFields: p.additionalFields,
    })),
    collections: collectionRows.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl,
      published: c.published,
      metaTitle: c.metaTitle,
      metaDescription: c.metaDescription,
      products: c.collectionProducts.map((cp) => ({
        name: cp.product.name,
        slug: cp.product.slug,
      })),
    })),
    services: serviceRows.map((s) => ({
      name: s.name,
      slug: s.slug,
      description: s.description,
      image: s.image,
      serviceTemplateId: s.serviceTemplateId,
      customFields: s.customFields,
      published: s.published,
      metaTitle: s.metaTitle,
      metaDescription: s.metaDescription,
      metaKeywords: s.metaKeywords,
      ogImage: s.ogImage,
      items: s.items.map((i) => ({
        name: i.name,
        description: i.description,
        image: i.image,
        priceLabel: i.priceLabel,
        durationLabel: i.durationLabel,
        compareAtPriceLabel: i.compareAtPriceLabel,
        priceTiers: i.priceTiers,
        addOns: i.addOns,
        bookingEmbedSrc: i.bookingEmbedSrc,
        category: i.category,
        isSignature: i.isSignature,
        published: i.published,
      })),
    })),
    events: eventRows.map((e) => ({
      name: e.name,
      slug: e.slug,
      blurb: e.blurb,
      coverImage: e.coverImage,
      coverVideo: e.coverVideo,
      startAt: e.startAt,
      endAt: e.endAt,
      allDay: e.allDay,
      location: e.location,
      externalUrl: e.externalUrl,
      externalUrlLabel: e.externalUrlLabel,
      priceLabel: e.priceLabel,
      published: e.published,
      isArchived: e.isArchived,
    })),
    galleries,
    faqs: faqRows.map((f) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      published: f.published,
    })),
    testimonials: testimonialRows.map((t) => ({
      customerName: t.customerName,
      customerTitle: t.customerTitle,
      customerCompany: t.customerCompany,
      title: t.title,
      text: t.text,
      photoUrls: t.photoUrls,
      testimonialDate: t.testimonialDate,
      status: t.isHidden ? "HIDDEN" : t.isApproved ? "PUBLISHED" : "PENDING",
    })),
    details: {
      name: business.name,
      subdomain: business.subdomain,
      customDomain: business.customDomain,
      domainStatus: business.domainStatus,
      templateId: business.templateId,
      templateLabel: templateLabel(business.templateId),
      supportEmail: business.supportEmail,
      ownerEmail: business.ownerEmail,
      phoneNumber: business.phoneNumber,
      businessAddress: business.businessAddress,
      timeZone: business.timeZone,
      latitude: business.latitude,
      longitude: business.longitude,
      areaServed: business.areaServed,
      businessHours: business.businessHours,
      offersInStorePickup: business.offersInStorePickup,
      pickupLocation: business.pickupLocation,
      pickupInstructions: business.pickupInstructions,
      siteContent: siteContent
        ? {
            heroTitle: siteContent.heroTitle,
            heroSubtitle: siteContent.heroSubtitle,
            heroImageUrl: siteContent.heroImageUrl,
            heroButtonText: siteContent.heroButtonText,
            heroButtonLink: siteContent.heroButtonLink,
            aboutTitle: siteContent.aboutTitle,
            aboutText: siteContent.aboutText,
            aboutImageUrl: siteContent.aboutImageUrl,
            features: siteContent.features,
            footerText: siteContent.footerText,
            socialLinks: siteContent.socialLinks,
            metaTitle: siteContent.metaTitle,
            metaDescription: siteContent.metaDescription,
            metaKeywords: siteContent.metaKeywords,
            ogImage: siteContent.ogImage,
            faviconUrl: siteContent.faviconUrl,
            seoBrandName: siteContent.seoBrandName,
            pageMeta: siteContent.pageMeta,
            logoUrl: siteContent.logoUrl,
            logoAltText: siteContent.logoAltText,
            primaryColor: siteContent.primaryColor,
            secondaryColor: siteContent.secondaryColor,
            accentColor: siteContent.accentColor,
            navigationItems: siteContent.navigationItems,
            footerNavigationItems: siteContent.footerNavigationItems,
            bannerConfig: siteContent.bannerConfig,
            popupConfig: siteContent.popupConfig,
            customFields: siteContent.customFields,
          }
        : null,
      theme: resolveThemeLabels(business.templateId, customFields),
    },
    registry: getFieldRegistry(business.templateId),
    customFields,
    timeZone: business.timeZone,
    galleryMap,
    serviceFieldInfo: getServiceFieldInfo,
  };
}
