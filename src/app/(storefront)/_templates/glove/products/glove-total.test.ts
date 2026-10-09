import { describe, expect, it } from "vitest";

import { gloveConfiguredTotal } from "./glove-total";

const chains = [
  { id: "gold", unitPrice: 1500 },
  { id: "silver", unitPrice: 2000 },
];
const charms = [
  { id: "a", unitPrice: 500 },
  { id: "b", unitPrice: 600 },
  { id: "c", unitPrice: 0 },
];

const base = { chains, charms, quantity: 1, gloveAmount: 4000 };

describe("gloveConfiguredTotal", () => {
  it("is just the glove with nothing chosen", () => {
    const t = gloveConfiguredTotal({ ...base, chainId: null, charmIds: [] });
    expect(t).toMatchObject({
      hasAddOns: false,
      addOnsAmount: 0,
      total: 4000,
      chain: null,
      charms: [],
    });
  });

  it("adds the chain and every chosen charm", () => {
    const t = gloveConfiguredTotal({
      ...base,
      chainId: "gold",
      charmIds: ["a", "b"],
    });
    expect(t.hasAddOns).toBe(true);
    expect(t.chainAmount).toBe(1500);
    expect(t.charmAmounts).toEqual([500, 600]);
    expect(t.addOnsAmount).toBe(2600);
    expect(t.total).toBe(6600);
  });

  it("counts a free charm as chosen without changing the total", () => {
    const t = gloveConfiguredTotal({ ...base, chainId: null, charmIds: ["c"] });
    expect(t.hasAddOns).toBe(true);
    expect(t.addOnsAmount).toBe(0);
    expect(t.total).toBe(4000);
  });

  it("multiplies add-ons by quantity (the caller passes the glove line)", () => {
    const t = gloveConfiguredTotal({
      ...base,
      quantity: 3,
      gloveAmount: 4000 * 3,
      chainId: "silver",
      charmIds: ["a"],
    });
    expect(t.chainAmount).toBe(6000);
    expect(t.charmAmounts).toEqual([1500]);
    expect(t.total).toBe(12000 + 6000 + 1500);
  });

  it("ignores ids that are not offered", () => {
    const t = gloveConfiguredTotal({
      ...base,
      chainId: "gone",
      charmIds: ["nope"],
    });
    expect(t.hasAddOns).toBe(false);
    expect(t.total).toBe(4000);
  });
});
