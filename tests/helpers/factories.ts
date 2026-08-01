import type { Prisma } from "generated/prisma";

import { db } from "./db";

let seq = 0;
const uniq = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${seq++}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

export function createBusiness(
  opts: {
    subdomain?: string;
    templateId?: string;
    name?: string;
    customDomain?: string | null;
    status?: string;
    /** Overrides on top of the feature registry defaults (e.g. `{ blog: true }`). */
    featureFlags?: Record<string, boolean>;
    /** Defaults to the schema column default ("America/Detroit") when omitted. */
    timeZone?: string;
  } = {},
) {
  const sub = opts.subdomain ?? uniq("biz");
  return db.business.create({
    data: {
      name: opts.name ?? "Test Store",
      slug: sub,
      subdomain: sub,
      customDomain: opts.customDomain ?? null,
      ownerEmail: `owner-${sub}@test.dev`,
      status: opts.status ?? "active",
      templateId: opts.templateId ?? "modern",
      ...(opts.featureFlags !== undefined
        ? { featureFlags: opts.featureFlags as Prisma.InputJsonValue }
        : {}),
      ...(opts.timeZone !== undefined ? { timeZone: opts.timeZone } : {}),
    },
  });
}

export async function createOwnerUser(
  businessId: string,
  opts: {
    email?: string;
    platformRole?: "BUSINESS_USER" | "PLATFORM_ADMIN";
    role?: "OWNER" | "MANAGER" | "STAFF";
  } = {},
) {
  const user = await db.user.create({
    data: {
      name: "Test Owner",
      email: opts.email ?? `${uniq("owner")}@test.dev`,
      emailVerified: true,
      platformRole: opts.platformRole ?? "BUSINESS_USER",
    },
  });
  await db.businessMembership.create({
    data: { userId: user.id, businessId, role: opts.role ?? "OWNER" },
  });
  return user;
}

/** A plain platform user with no business membership. */
export function createUser(
  opts: {
    email?: string;
    name?: string;
    platformRole?: "BUSINESS_USER" | "PLATFORM_ADMIN";
  } = {},
) {
  return db.user.create({
    data: {
      name: opts.name ?? "Test User",
      email: opts.email ?? `${uniq("user")}@test.dev`,
      emailVerified: true,
      platformRole: opts.platformRole ?? "BUSINESS_USER",
    },
  });
}

/** Adds an existing user as a member of a business with the given role. */
export function createMembership(
  businessId: string,
  userId: string,
  role: "OWNER" | "MANAGER" | "STAFF" = "MANAGER",
) {
  return db.businessMembership.create({
    data: { userId, businessId, role },
  });
}

export function createProduct(
  businessId: string,
  opts: {
    name?: string;
    price?: number;
    published?: boolean;
    trackInventory?: boolean;
    allowBackorders?: boolean;
    inventoryQty?: number;
    reservedQty?: number;
    additionalFields?: Record<string, unknown>;
  } = {},
) {
  return db.product.create({
    data: {
      name: opts.name ?? "Test Product",
      slug: uniq("prod"),
      price: opts.price ?? 1000,
      businessId,
      published: opts.published ?? true,
      trackInventory: opts.trackInventory ?? true,
      allowBackorders: opts.allowBackorders ?? false,
      inventoryQty: opts.inventoryQty ?? 10,
      reservedQty: opts.reservedQty ?? 0,
      ...(opts.additionalFields !== undefined
        ? {
            additionalFields: opts.additionalFields as Prisma.InputJsonValue,
          }
        : {}),
    },
  });
}

export function createVariant(
  productId: string,
  opts: {
    name?: string;
    sku?: string | null;
    price?: number | null;
    inventoryQty?: number;
    reservedQty?: number;
    options?: Record<string, string>;
  } = {},
) {
  return db.productVariant.create({
    data: {
      productId,
      name: opts.name ?? "Default Variant",
      sku: opts.sku ?? uniq("sku"),
      price: opts.price ?? 1000,
      inventoryQty: opts.inventoryQty ?? 10,
      reservedQty: opts.reservedQty ?? 0,
      options: (opts.options ?? { size: "M" }) as Prisma.InputJsonValue,
    },
  });
}

export function createCollection(
  businessId: string,
  opts: {
    name?: string;
    slug?: string;
    /** Mirrors the schema default — Collection.published defaults to true. */
    published?: boolean;
    sortOrder?: number;
  } = {},
) {
  return db.collection.create({
    data: {
      businessId,
      name: opts.name ?? "Test Collection",
      slug: opts.slug ?? uniq("coll"),
      published: opts.published ?? true,
      sortOrder: opts.sortOrder ?? 0,
    },
  });
}

/** Joins a product into a collection (the CollectionProduct pivot row). */
export function createCollectionProduct(
  collectionId: string,
  productId: string,
  opts: { sortOrder?: number } = {},
) {
  return db.collectionProduct.create({
    data: { collectionId, productId, sortOrder: opts.sortOrder ?? 0 },
  });
}

export function createCustomer(
  businessId: string,
  opts: { email?: string; userId?: string } = {},
) {
  return db.customer.create({
    data: {
      email: opts.email ?? `${uniq("cust")}@test.dev`,
      businessId,
      userId: opts.userId ?? null,
    },
  });
}

let orderNumber = 1000;

export type CreateOrderItemInput = {
  productId?: string | null;
  productVariantId?: string | null;
  productName?: string;
  variantName?: string | null;
  sku?: string | null;
  price?: number;
  quantity?: number;
  total?: number;
  fulfilledQuantity?: number;
};

export function createOrder(
  businessId: string,
  opts: {
    customerId?: string;
    customerEmail?: string;
    customerName?: string;
    subtotal?: number;
    total?: number;
    tax?: number;
    shipping?: number;
    discount?: number;
    orderNumber?: number;
    status?: string;
    paymentStatus?: string;
    fulfillmentStatus?: string;
    stripePaymentIntentId?: string | null;
    stripeSessionId?: string | null;
    refundAmountCents?: number | null;
    createdAt?: Date;
    items?: CreateOrderItemInput[];
  } = {},
) {
  const subtotal = opts.subtotal ?? 1000;
  return db.order.create({
    data: {
      orderNumber: opts.orderNumber ?? ++orderNumber,
      businessId,
      customerId: opts.customerId ?? null,
      customerEmail: opts.customerEmail ?? "buyer@test.dev",
      customerName: opts.customerName,
      subtotal,
      total: opts.total ?? subtotal,
      tax: opts.tax ?? 0,
      shipping: opts.shipping ?? 0,
      discount: opts.discount ?? 0,
      status: opts.status ?? "open",
      paymentStatus: opts.paymentStatus ?? "paid",
      fulfillmentStatus: opts.fulfillmentStatus ?? "unfulfilled",
      stripePaymentIntentId:
        opts.stripePaymentIntentId === undefined
          ? `pi_${uniq("test")}`
          : opts.stripePaymentIntentId,
      stripeSessionId: opts.stripeSessionId ?? null,
      refundAmountCents: opts.refundAmountCents ?? null,
      ...(opts.createdAt !== undefined ? { createdAt: opts.createdAt } : {}),
      ...(opts.items
        ? {
            items: {
              create: opts.items.map((item) => ({
                productId: item.productId ?? null,
                productVariantId: item.productVariantId ?? null,
                productName: item.productName ?? "Test Product",
                variantName: item.variantName ?? null,
                sku: item.sku ?? null,
                price: item.price ?? 1000,
                quantity: item.quantity ?? 1,
                total:
                  item.total ?? (item.price ?? 1000) * (item.quantity ?? 1),
                fulfilledQuantity: item.fulfilledQuantity ?? 0,
              })),
            },
          }
        : {}),
    },
    include: { items: true },
  });
}

/** Adds a line item to an existing order (for cases where items are added after order creation). */
export function createOrderItem(
  orderId: string,
  opts: CreateOrderItemInput = {},
) {
  return db.orderItem.create({
    data: {
      orderId,
      productId: opts.productId ?? null,
      productVariantId: opts.productVariantId ?? null,
      productName: opts.productName ?? "Test Product",
      variantName: opts.variantName ?? null,
      sku: opts.sku ?? null,
      price: opts.price ?? 1000,
      quantity: opts.quantity ?? 1,
      total: opts.total ?? (opts.price ?? 1000) * (opts.quantity ?? 1),
      fulfilledQuantity: opts.fulfilledQuantity ?? 0,
    },
  });
}

export function createDiscount(
  businessId: string,
  opts: {
    code?: string;
    type?: string;
    value?: number;
    active?: boolean;
    usageLimit?: number | null;
    usageCount?: number;
    perCustomerLimit?: number | null;
    minPurchase?: number | null;
    maxDiscount?: number | null;
  } = {},
) {
  return db.discountCode.create({
    data: {
      businessId,
      code: opts.code ?? uniq("CODE").toUpperCase(),
      type: opts.type ?? "percentage",
      value: opts.value ?? 10,
      active: opts.active ?? true,
      usageLimit: opts.usageLimit ?? null,
      usageCount: opts.usageCount ?? 0,
      perCustomerLimit: opts.perCustomerLimit ?? null,
      minPurchase: opts.minPurchase ?? null,
      maxDiscount: opts.maxDiscount ?? null,
    },
  });
}

/** A small, valid TipTap doc literal — good enough for content/excerpt round-trip tests. */
const TEST_TIPTAP_DOC = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Test content" }],
    },
  ],
};

export function createPage(
  businessId: string,
  opts: {
    slug?: string;
    title?: string;
    type?: "page" | "policy" | "blog" | "custom";
    published?: boolean;
    content?: Prisma.InputJsonValue;
    excerpt?: string | null;
    previewDraft?: Prisma.InputJsonValue;
    previewDraftUpdatedAt?: Date | null;
    publishedAt?: Date | null;
  } = {},
) {
  return db.page.create({
    data: {
      businessId,
      slug: opts.slug ?? uniq("page"),
      title: opts.title ?? "Test Page",
      type: opts.type ?? "page",
      published: opts.published ?? true,
      content: (opts.content ?? TEST_TIPTAP_DOC) as Prisma.InputJsonValue,
      excerpt: opts.excerpt ?? null,
      ...(opts.previewDraft !== undefined
        ? { previewDraft: opts.previewDraft }
        : {}),
      ...(opts.previewDraftUpdatedAt !== undefined
        ? { previewDraftUpdatedAt: opts.previewDraftUpdatedAt }
        : {}),
      ...(opts.publishedAt !== undefined
        ? { publishedAt: opts.publishedAt }
        : {}),
    },
  });
}

export function createEvent(
  businessId: string,
  opts: {
    name?: string;
    startAt?: Date;
    endAt?: Date | null;
    allDay?: boolean;
    published?: boolean;
    isArchived?: boolean;
    sortOrder?: number;
  } = {},
) {
  return db.event.create({
    data: {
      businessId,
      name: opts.name ?? "Test Event",
      startAt: opts.startAt ?? new Date(),
      endAt: opts.endAt === undefined ? null : opts.endAt,
      allDay: opts.allDay ?? false,
      published: opts.published ?? true,
      isArchived: opts.isArchived ?? false,
      sortOrder: opts.sortOrder ?? 0,
    },
  });
}

export function createBaseInventoryUnit(
  businessId: string,
  opts: {
    name?: string;
    description?: string;
    inventoryQty?: number;
    lowInventoryThreshold?: number | null;
    allowBackorders?: boolean;
  } = {},
) {
  return db.baseInventoryUnit.create({
    data: {
      businessId,
      name: opts.name ?? "Test Inventory Unit",
      description: opts.description ?? null,
      inventoryQty: opts.inventoryQty ?? 0,
      lowInventoryThreshold: opts.lowInventoryThreshold ?? null,
      allowBackorders: opts.allowBackorders ?? false,
    },
  });
}
