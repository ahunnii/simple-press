import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createCustomer,
  createMembership,
  createOrder,
  createOwnerUser,
  createProduct,
  createUser,
} from "../helpers/factories";

// Procedures resolve the tenant from the request host via `next/headers`. Mock it
// with a mutable host so we can act as different tenants in one process.
const reqHost = vi.hoisted(() => ({ value: "tenant-a.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

describe("multi-tenant isolation", () => {
  beforeEach(resetDb);

  it("scopes order reads to the caller's own business", async () => {
    const businessA = await createBusiness({ subdomain: "tenant-a" });
    const businessB = await createBusiness({ subdomain: "tenant-b" });
    const ownerA = await createOwnerUser(businessA.id);

    const orderA = await createOrder(businessA.id, {
      customerEmail: "a@test.dev",
    });
    const orderB = await createOrder(businessB.id, {
      customerEmail: "b@test.dev",
    });

    // Act as tenant A's owner.
    reqHost.value = "tenant-a.simplepress.test";
    const callerA = createTestCaller({ userId: ownerA.id });

    // A's own order is visible.
    const ownOrder = await callerA.order.getById(orderA.id);
    expect(ownOrder?.id).toBe(orderA.id);

    // B's order is invisible to A even with a valid id — businessId scoping.
    const foreignOrder = await callerA.order.getById(orderB.id);
    expect(foreignOrder).toBeNull();

    // Listing returns only A's orders, never B's.
    const all = await callerA.order.getAll({});
    expect(all.orders.map((o) => o.id)).toEqual([orderA.id]);
  });

  it("blocks a user who is not a member of the resolved business", async () => {
    // Business A must exist so the host resolves; the test acts as B's owner.
    await createBusiness({ subdomain: "tenant-a" });
    const businessB = await createBusiness({ subdomain: "tenant-b" });
    const ownerB = await createOwnerUser(businessB.id);

    reqHost.value = "tenant-a.simplepress.test";
    const caller = createTestCaller({ userId: ownerB.id });

    await expect(caller.order.getAll({})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("search.all scopes orders/customers/products to the caller's own business, and re-derives role from the DB for STAFF", async () => {
    const businessA = await createBusiness({ subdomain: "tenant-a" });
    const businessB = await createBusiness({ subdomain: "tenant-b" });
    const ownerA = await createOwnerUser(businessA.id);

    // Same "needle" value planted in both businesses so a leak would be
    // detectable — the assertions below must only ever see business A's rows.
    const productA = await createProduct(businessA.id, { name: "Needle Widget" });
    await createProduct(businessB.id, { name: "Needle Widget" });
    const customerA = await createCustomer(businessA.id, {
      email: "needle-a@test.dev",
    });
    await createCustomer(businessB.id, { email: "needle-b@test.dev" });
    await createOrder(businessA.id, { customerName: "Needle Customer" });
    await createOrder(businessB.id, { customerName: "Needle Customer" });

    reqHost.value = "tenant-a.simplepress.test";
    const callerA = createTestCaller({ userId: ownerA.id });

    const results = await callerA.search.all({ query: "Needle" });
    expect(results.products.map((p) => p.id)).toEqual([productA.id]);
    expect(results.customers.map((c) => c.id)).toEqual([customerA.id]);
    expect(results.orders.length).toBe(1);

    // STAFF caller: role is re-read from the DB for the resolved business —
    // orders/customers are still visible, but product search is skipped.
    const staffUser = await createUser();
    await createMembership(businessA.id, staffUser.id, "STAFF");
    const staffCaller = createTestCaller({ userId: staffUser.id });

    const staffResults = await staffCaller.search.all({ query: "Needle" });
    expect(staffResults.customers.map((c) => c.id)).toEqual([customerA.id]);
    expect(staffResults.orders.length).toBe(1);
    expect(staffResults.products).toEqual([]);
  });

  it("export.exportProducts excludes a foreign-business product id (scoped by businessId, not just id)", async () => {
    const businessA = await createBusiness({ subdomain: "tenant-a" });
    const businessB = await createBusiness({ subdomain: "tenant-b" });
    const ownerA = await createOwnerUser(businessA.id);
    const foreignProduct = await createProduct(businessB.id);

    reqHost.value = "tenant-a.simplepress.test";
    const callerA = createTestCaller({ userId: ownerA.id });

    // The id is real, just not owned by A's business — must be excluded, not 500.
    await expect(
      callerA.export.exportProducts({ productIds: [foreignProduct.id] }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("export.exportOrders only includes the caller's own business's orders, with cents formatted as dollars", async () => {
    const businessA = await createBusiness({ subdomain: "tenant-a" });
    const businessB = await createBusiness({ subdomain: "tenant-b" });
    const ownerA = await createOwnerUser(businessA.id);

    const orderA = await createOrder(businessA.id, {
      orderNumber: 50001,
      subtotal: 2000,
      tax: 200,
      shipping: 300,
      total: 2500,
    });
    const orderB = await createOrder(businessB.id, {
      orderNumber: 60002,
      total: 9999,
    });

    reqHost.value = "tenant-a.simplepress.test";
    const callerA = createTestCaller({ userId: ownerA.id });

    const result = await callerA.export.exportOrders({});
    expect(result.orderCount).toBe(1);
    expect(result.csv).toContain(String(orderA.orderNumber));
    expect(result.csv).not.toContain(String(orderB.orderNumber));
    // Money fields: cents (2500) formatted as dollars ("25.00").
    expect(result.csv).toContain("25.00");
    expect(result.csv).toContain("20.00");
    expect(result.csv).toContain("2.00");
    expect(result.csv).toContain("3.00");
  });

  it("marketing.listRecipients only counts the caller's own business's opted-in customers", async () => {
    const businessA = await createBusiness({ subdomain: "tenant-a" });
    const businessB = await createBusiness({ subdomain: "tenant-b" });
    const ownerA = await createOwnerUser(businessA.id);

    await db.customer.create({
      data: {
        businessId: businessA.id,
        email: "optin-a@test.dev",
        acceptsMarketing: true,
      },
    });
    await db.customer.create({
      data: {
        businessId: businessB.id,
        email: "optin-b@test.dev",
        acceptsMarketing: true,
      },
    });

    reqHost.value = "tenant-a.simplepress.test";
    const callerA = createTestCaller({ userId: ownerA.id });

    const result = await callerA.marketing.listRecipients();
    expect(result.count).toBe(1);
  });

  it("customer.getById returns null for a foreign-business customer id", async () => {
    const businessA = await createBusiness({ subdomain: "tenant-a" });
    const businessB = await createBusiness({ subdomain: "tenant-b" });
    const ownerA = await createOwnerUser(businessA.id);
    const customerB = await createCustomer(businessB.id);

    reqHost.value = "tenant-a.simplepress.test";
    const callerA = createTestCaller({ userId: ownerA.id });

    const result = await callerA.customer.getById(customerB.id);
    expect(result).toBeNull();
  });

  it("customer.updateAddress rejects mutating an address owned by another business's customer", async () => {
    const businessA = await createBusiness({ subdomain: "tenant-a" });
    const businessB = await createBusiness({ subdomain: "tenant-b" });
    const userX = await createUser({ email: "userx@test.dev" });
    const customerX = await createCustomer(businessA.id, {
      email: "userx@test.dev",
      userId: userX.id,
    });
    const customerY = await createCustomer(businessB.id, {
      email: "customer-y@test.dev",
    });
    const addressY = await db.shippingAddress.create({
      data: {
        customerId: customerY.id,
        firstName: "Y",
        lastName: "Customer",
        address1: "1 Foreign St",
        city: "Elsewhere",
        country: "US",
        zip: "00000",
      },
    });
    const addressX = await db.shippingAddress.create({
      data: {
        customerId: customerX.id,
        firstName: "X",
        lastName: "Customer",
        address1: "1 Home St",
        city: "Home",
        country: "US",
        zip: "11111",
      },
    });

    // userX is browsing business A's storefront.
    reqHost.value = "tenant-a.simplepress.test";
    const callerX = createTestCaller({ userId: userX.id, email: userX.email });

    await expect(
      callerX.customer.updateAddress({ id: addressY.id, firstName: "Hacked" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // Sanity: the same caller CAN update their own address.
    const updated = await callerX.customer.updateAddress({
      id: addressX.id,
      firstName: "Updated",
    });
    expect(updated.firstName).toBe("Updated");
  });

  it("back-in-stock.subscribe creates no row for a product that belongs to a different business than the resolved host", async () => {
    const businessA = await createBusiness({ subdomain: "tenant-a" });
    const businessB = await createBusiness({ subdomain: "tenant-b" });
    const productA = await createProduct(businessA.id, { published: true });

    // Host resolves to business B, but the productId belongs to business A.
    reqHost.value = "tenant-b.simplepress.test";
    const caller = createTestCaller({});

    const result = await caller.backInStock.subscribe({
      email: "shopper@test.dev",
      productId: productA.id,
    });
    // Always returns success — no enumeration signal either way.
    expect(result.success).toBe(true);

    const rows = await db.backInStockRequest.findMany({
      where: { businessId: businessB.id },
    });
    expect(rows).toHaveLength(0);
    const crossTenantRows = await db.backInStockRequest.findMany({
      where: { productId: productA.id },
    });
    expect(crossTenantRows).toHaveLength(0);
  });
});
