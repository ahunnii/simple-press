import type { Prisma } from "generated/prisma";

import { db } from "./db";

let seq = 0;
const uniq = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${seq++}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

export function createBusiness(opts: {
  subdomain?: string;
  templateId?: string;
  name?: string;
  customDomain?: string | null;
  status?: string;
} = {}) {
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
    },
  });
}

export async function createOwnerUser(
  businessId: string,
  opts: {
    email?: string;
    platformRole?: "BUSINESS_USER" | "PLATFORM_ADMIN";
    role?: "OWNER" | "MANAGER";
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
            additionalFields:
              opts.additionalFields as Prisma.InputJsonValue,
          }
        : {}),
    },
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
export function createOrder(
  businessId: string,
  opts: {
    customerId?: string;
    customerEmail?: string;
    subtotal?: number;
    total?: number;
    orderNumber?: number;
  } = {},
) {
  const subtotal = opts.subtotal ?? 1000;
  return db.order.create({
    data: {
      orderNumber: opts.orderNumber ?? ++orderNumber,
      businessId,
      customerId: opts.customerId ?? null,
      customerEmail: opts.customerEmail ?? "buyer@test.dev",
      subtotal,
      total: opts.total ?? subtotal,
    },
  });
}
