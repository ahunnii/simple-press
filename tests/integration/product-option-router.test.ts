import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createOwnerUser,
  createProduct,
  createVariant,
} from "../helpers/factories";

/**
 * `productOption` admin router: tenant isolation on every read/write, the
 * value-id-preserving upsert, link validation (same business, variant
 * required when the product has variants), attach / detach / reorder, the
 * feature gate, and the delete-warning usage count.
 *
 * Tenant resolution reads the request host through `next/headers` — mocked
 * with a mutable host (same idiom as `invoice-activity.test.ts`).
 */
const reqHost = vi.hoisted(() => ({ value: "options.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

async function setup(
  featureFlags: Record<string, boolean> = { productOptions: true },
) {
  const business = await createBusiness({ featureFlags });
  const owner = await createOwnerUser(business.id);
  const caller = createTestCaller({ userId: owner.id, email: owner.email });
  const switchHost = () => {
    reqHost.value = `${business.subdomain}.simplepress.test`;
  };
  switchHost();
  return { business, owner, caller, switchHost };
}

const choiceGroup = (overrides: Record<string, unknown> = {}) => ({
  name: "Charms",
  kind: "choice" as const,
  required: false,
  minSelections: 0,
  maxSelections: 3,
  includedCount: 1,
  display: "tiles" as const,
  textPriceCents: 0,
  ...overrides,
});

const plainValue = (label: string, extra: Record<string, unknown> = {}) => ({
  label,
  priceDelta: 500,
  available: true,
  ...extra,
});

describe("productOption router", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates a group, then updates it keeping value ids and deleting dropped ones", async () => {
    const { caller } = await setup();
    const { id } = await caller.productOption.upsertGroup({
      group: choiceGroup(),
      values: [plainValue("Star"), plainValue("Moon"), plainValue("Sun")],
    });

    const first = await caller.productOption.getGroup({ id });
    expect(first.values.map((v) => v.label)).toEqual(["Star", "Moon", "Sun"]);
    const [star, moon] = first.values;

    await caller.productOption.upsertGroup({
      group: { ...choiceGroup({ name: "Charms!" }), id },
      values: [
        plainValue("Moon (renamed)", { id: moon!.id }),
        plainValue("Heart"),
        plainValue("Star", { id: star!.id, priceDelta: 900 }),
      ],
    });

    const second = await caller.productOption.getGroup({ id });
    expect(second.name).toBe("Charms!");
    expect(second.values.map((v) => v.label)).toEqual([
      "Moon (renamed)",
      "Heart",
      "Star",
    ]);
    const ids = second.values.map((v) => v.id);
    expect(ids[0]).toBe(moon!.id);
    expect(ids[2]).toBe(star!.id);
    expect(second.values[2]!.priceDelta).toBe(900);
    expect(await db.productOptionValue.count({ where: { groupId: id } })).toBe(
      3,
    );
  });

  it("rejects a text group with values, and a choice group with none", async () => {
    const { caller } = await setup();
    await expect(
      caller.productOption.upsertGroup({
        group: choiceGroup({ kind: "text", name: "Engraving" }),
        values: [plainValue("x")],
      }),
    ).rejects.toThrow(TRPCError);
    await expect(
      caller.productOption.upsertGroup({ group: choiceGroup(), values: [] }),
    ).rejects.toThrow(/at least one choice/i);

    const { id } = await caller.productOption.upsertGroup({
      group: choiceGroup({
        kind: "text",
        name: "Engraving",
        maxLength: 12,
        textPriceCents: 800,
      }),
      values: [],
    });
    const group = await caller.productOption.getGroup({ id });
    expect(group.kind).toBe("text");
    expect(group.maxLength).toBe(12);
    expect(group.textPriceCents).toBe(800);
    expect(group.values).toEqual([]);
  });

  it("validates linked products: same business, variant required when the product has variants", async () => {
    const { business, caller } = await setup();
    const other = await createBusiness({
      featureFlags: { productOptions: true },
    });
    const foreign = await createProduct(other.id, { name: "Foreign" });
    const plain = await createProduct(business.id, {
      name: "Plain charm",
      published: false,
    });
    const withVariants = await createProduct(business.id, { name: "Chain" });
    const gold = await createVariant(withVariants.id, {
      name: "Gold",
      price: 2500,
    });
    const foreignVariant = await createVariant(foreign.id, { name: "Nope" });

    const save = (value: Record<string, unknown>) =>
      caller.productOption.upsertGroup({
        group: choiceGroup(),
        values: [plainValue("L", value)],
      });

    await expect(save({ linkedProductId: foreign.id })).rejects.toThrow(
      /doesn't exist/i,
    );
    await expect(save({ linkedProductId: withVariants.id })).rejects.toThrow(
      /has variants/i,
    );
    await expect(
      save({
        linkedProductId: withVariants.id,
        linkedVariantId: foreignVariant.id,
      }),
    ).rejects.toThrow(/variant that isn't part of/i);
    await expect(
      save({
        linkedProductId: plain.id,
        priceOverride: undefined,
        linkedVariantId: gold.id,
      }),
    ).rejects.toThrow(/variant that isn't part of/i);

    const { id } = await save({
      linkedProductId: plain.id,
      priceOverride: 100,
    });
    const group = await caller.productOption.getGroup({ id });
    expect(group.values[0]).toMatchObject({
      priceDelta: 0,
      priceOverride: 100,
      linked: { productId: plain.id, published: false, priceCents: 1000 },
    });

    const second = await caller.productOption.upsertGroup({
      group: choiceGroup({ name: "Chains" }),
      values: [
        plainValue("Gold", {
          linkedProductId: withVariants.id,
          linkedVariantId: gold.id,
        }),
      ],
    });
    const chains = await caller.productOption.getGroup({ id: second.id });
    expect(chains.values[0]!.linked).toMatchObject({
      variantId: gold.id,
      priceCents: 2500,
    });
  });

  it("is tenant-isolated for every procedure", async () => {
    const a = await setup();
    const aProduct = await createProduct(a.business.id);
    const { id: aGroup } = await a.caller.productOption.upsertGroup({
      group: choiceGroup(),
      values: [plainValue("Star")],
    });
    await a.caller.productOption.attach({
      productId: aProduct.id,
      groupId: aGroup,
    });

    const b = await setup();
    const bProduct = await createProduct(b.business.id);
    const { id: bGroup } = await b.caller.productOption.upsertGroup({
      group: choiceGroup({ name: "Mine" }),
      values: [plainValue("Mine")],
    });
    b.switchHost();

    expect(
      (await b.caller.productOption.listGroups()).map((g) => g.id),
    ).toEqual([bGroup]);
    await expect(
      b.caller.productOption.getGroup({ id: aGroup }),
    ).rejects.toThrow(/NOT_FOUND|not found/i);
    await expect(
      b.caller.productOption.upsertGroup({
        group: { ...choiceGroup(), id: aGroup },
        values: [plainValue("hijack")],
      }),
    ).rejects.toThrow();
    await expect(
      b.caller.productOption.deleteGroup({ id: aGroup }),
    ).rejects.toThrow();
    await expect(
      b.caller.productOption.attach({
        productId: bProduct.id,
        groupId: aGroup,
      }),
    ).rejects.toThrow();
    await expect(
      b.caller.productOption.attach({
        productId: aProduct.id,
        groupId: bGroup,
      }),
    ).rejects.toThrow();
    await expect(
      b.caller.productOption.listForProduct({ productId: aProduct.id }),
    ).rejects.toThrow();
    await b.caller.productOption.detach({
      productId: aProduct.id,
      groupId: aGroup,
    });
    expect(
      await db.productOptionGroupOnProduct.count({
        where: { productId: aProduct.id },
      }),
    ).toBe(1);
    const found = await b.caller.productOption.searchLinkTargets({ query: "" });
    expect(found.map((p) => p.id)).toEqual([bProduct.id]);
    expect(
      await b.caller.productOption.usageForProduct({ productId: aProduct.id }),
    ).toEqual({
      valueCount: 0,
      groupCount: 0,
      productCount: 0,
    });
    expect(await db.productOptionGroup.count({ where: { id: aGroup } })).toBe(
      1,
    );
  });

  it("attaches idempotently, reorders, and detaches", async () => {
    const { business, caller } = await setup();
    const product = await createProduct(business.id);
    const make = async (name: string) =>
      (
        await caller.productOption.upsertGroup({
          group: choiceGroup({ name }),
          values: [plainValue("v")],
        })
      ).id;
    const [g1, g2, g3] = [
      await make("One"),
      await make("Two"),
      await make("Three"),
    ];
    for (const groupId of [g1, g2, g3, g2]) {
      await caller.productOption.attach({ productId: product.id, groupId });
    }
    let list = await caller.productOption.listForProduct({
      productId: product.id,
    });
    expect(list.map((g) => g.name)).toEqual(["One", "Two", "Three"]);

    await caller.productOption.reorder({
      productId: product.id,
      groupIds: [g3, g1, g2],
    });
    list = await caller.productOption.listForProduct({ productId: product.id });
    expect(list.map((g) => g.name)).toEqual(["Three", "One", "Two"]);

    await expect(
      caller.productOption.reorder({
        productId: product.id,
        groupIds: [g3, g1],
      }),
    ).rejects.toThrow(/changed/i);

    await caller.productOption.detach({ productId: product.id, groupId: g1 });
    list = await caller.productOption.listForProduct({ productId: product.id });
    expect(list.map((g) => g.name)).toEqual(["Three", "Two"]);
    // Detaching never deletes the shared group.
    expect(await db.productOptionGroup.count({ where: { id: g1 } })).toBe(1);
    expect(list[0]!.productCount).toBe(1);
  });

  it("counts linked usage across the products that offer the option", async () => {
    const { business, caller } = await setup();
    const charm = await createProduct(business.id, {
      name: "Charm",
      published: false,
    });
    const gloveA = await createProduct(business.id, { name: "Glove A" });
    const gloveB = await createProduct(business.id, { name: "Glove B" });
    const { id } = await caller.productOption.upsertGroup({
      group: choiceGroup(),
      values: [plainValue("Charm", { linkedProductId: charm.id })],
    });
    expect(
      await caller.productOption.usageForProduct({ productId: charm.id }),
    ).toMatchObject({
      valueCount: 1,
      productCount: 0,
    });
    await caller.productOption.attach({ productId: gloveA.id, groupId: id });
    await caller.productOption.attach({ productId: gloveB.id, groupId: id });
    expect(
      await caller.productOption.usageForProduct({ productId: charm.id }),
    ).toEqual({
      valueCount: 1,
      groupCount: 1,
      productCount: 2,
    });
    // Bulk delete: products deleted together don't count as losing it.
    expect(
      await caller.productOption.usageForProducts({
        productIds: [charm.id, gloveA.id],
      }),
    ).toEqual({
      valueCount: 1,
      groupCount: 1,
      productCount: 1,
      usedCount: 1,
    });
    expect(
      await caller.productOption.usageForProducts({
        productIds: [gloveA.id, gloveB.id],
      }),
    ).toMatchObject({ usedCount: 0, productCount: 0 });

    const hits = await caller.productOption.searchLinkTargets({
      query: "charm",
    });
    expect(hits).toMatchObject([
      { id: charm.id, published: false, priceCents: 1000, variants: [] },
    ]);
  });

  it("is blocked when the productOptions flag is off (usage stays readable)", async () => {
    const { business, caller } = await setup({ productOptions: false });
    const product = await createProduct(business.id);
    await expect(caller.productOption.listGroups()).rejects.toThrow(
      /not enabled/i,
    );
    await expect(
      caller.productOption.upsertGroup({
        group: choiceGroup(),
        values: [plainValue("v")],
      }),
    ).rejects.toThrow(/not enabled/i);
    expect(
      await caller.productOption.usageForProduct({ productId: product.id }),
    ).toMatchObject({
      valueCount: 0,
    });
  });
});
