import { describe, expect, it } from "vitest";

import type { DeliveryReturnsFormValues } from "./shipping";

import {
  createLocalDeliveryFormSchema,
  deliveryReturnsFormDefaults,
  deliveryReturnsFormSchema,
  deliveryReturnsFormToInput,
  deliveryReturnsInputSchema,
  localDeliveryFormDefaults,
  localDeliveryFormToInput,
  localDeliveryInputSchema,
} from "./shipping";

const blankForm: DeliveryReturnsFormValues = {
  handlingDaysMin: "",
  handlingDaysMax: "",
  transitDaysMin: "",
  transitDaysMax: "",
  returnsMode: "unset",
  returnWindowDays: "",
  returnFees: "",
  returnShippingFeeDollars: "",
  returnMethod: "",
};

const form = (over: Partial<DeliveryReturnsFormValues>) => ({
  ...blankForm,
  ...over,
});

const acceptForm = (over: Partial<DeliveryReturnsFormValues> = {}) =>
  form({
    returnsMode: "accept",
    returnWindowDays: "30",
    returnFees: "free",
    returnMethod: "by_mail",
    ...over,
  });

/** field path -> first message */
function formErrors(values: DeliveryReturnsFormValues) {
  const r = deliveryReturnsFormSchema.safeParse(values);
  if (r.success) return {};
  return Object.fromEntries(
    r.error.issues.map((i) => [i.path.join("."), i.message]),
  );
}

describe("deliveryReturnsFormSchema", () => {
  it("accepts a fully blank form (everything optional / unset)", () => {
    expect(formErrors(blankForm)).toEqual({});
  });

  it("accepts valid handling + transit ranges, including 0 and equal min/max", () => {
    expect(
      formErrors(
        form({
          handlingDaysMin: "0",
          handlingDaysMax: "2",
          transitDaysMin: "3",
          transitDaysMax: "3",
        }),
      ),
    ).toEqual({});
  });

  it("requires both or neither of each min/max pair", () => {
    const e = formErrors(form({ handlingDaysMin: "1", transitDaysMax: "5" }));
    expect(e.handlingDaysMax).toMatch(/maximum/i);
    expect(e.transitDaysMin).toMatch(/minimum/i);
  });

  it("rejects min greater than max", () => {
    const e = formErrors(form({ transitDaysMin: "5", transitDaysMax: "3" }));
    expect(e.transitDaysMax).toMatch(/at least the minimum/i);
  });

  it("enforces handling 0-30 and transit 0-60", () => {
    expect(
      formErrors(form({ handlingDaysMin: "1", handlingDaysMax: "31" }))
        .handlingDaysMax,
    ).toMatch(/0–30/);
    expect(
      formErrors(form({ transitDaysMin: "1", transitDaysMax: "60" })),
    ).toEqual({});
    expect(
      formErrors(form({ transitDaysMin: "1", transitDaysMax: "61" }))
        .transitDaysMax,
    ).toMatch(/0–60/);
  });

  it("rejects non-integer days", () => {
    expect(
      formErrors(form({ handlingDaysMin: "1.5", handlingDaysMax: "3" }))
        .handlingDaysMin,
    ).toMatch(/whole number/i);
    expect(
      formErrors(form({ transitDaysMin: "-1", transitDaysMax: "3" }))
        .transitDaysMin,
    ).toMatch(/whole number/i);
    expect(
      formErrors(form({ transitDaysMin: "abc", transitDaysMax: "3" }))
        .transitDaysMin,
    ).toMatch(/whole number/i);
  });

  it("'No returns' needs nothing else", () => {
    expect(formErrors(form({ returnsMode: "none" }))).toEqual({});
  });

  it("accepting requires a 1-365 window", () => {
    expect(
      formErrors(acceptForm({ returnWindowDays: "" })).returnWindowDays,
    ).toBeDefined();
    expect(
      formErrors(acceptForm({ returnWindowDays: "0" })).returnWindowDays,
    ).toMatch(/1–365/);
    expect(
      formErrors(acceptForm({ returnWindowDays: "366" })).returnWindowDays,
    ).toMatch(/1–365/);
    expect(formErrors(acceptForm({ returnWindowDays: "365" }))).toEqual({});
    expect(formErrors(acceptForm({ returnWindowDays: "1" }))).toEqual({});
  });

  it("accepting requires returnFees and returnMethod", () => {
    const e = formErrors(acceptForm({ returnFees: "", returnMethod: "" }));
    expect(e.returnFees).toBeDefined();
    expect(e.returnMethod).toBeDefined();
  });

  it("flat fee requires an amount greater than 0", () => {
    expect(
      formErrors(acceptForm({ returnFees: "flat_fee" }))
        .returnShippingFeeDollars,
    ).toMatch(/greater than \$0/);
    expect(
      formErrors(
        acceptForm({ returnFees: "flat_fee", returnShippingFeeDollars: "0" }),
      ).returnShippingFeeDollars,
    ).toMatch(/greater than \$0/);
    expect(
      formErrors(
        acceptForm({ returnFees: "flat_fee", returnShippingFeeDollars: "-3" }),
      ).returnShippingFeeDollars,
    ).toBeDefined();
    expect(
      formErrors(
        acceptForm({
          returnFees: "flat_fee",
          returnShippingFeeDollars: "6.99",
        }),
      ),
    ).toEqual({});
  });

  it("ignores stale accept-mode fields when mode is not 'accept'", () => {
    expect(
      formErrors(
        form({
          returnsMode: "none",
          returnWindowDays: "999",
          returnFees: "flat_fee",
          returnShippingFeeDollars: "-1",
        }),
      ),
    ).toEqual({});
  });
});

describe("deliveryReturnsInputSchema", () => {
  const ok = {
    handlingDaysMin: null,
    handlingDaysMax: null,
    transitDaysMin: null,
    transitDaysMax: null,
    returnWindowDays: null,
    returnFees: null,
    returnShippingFeeCents: null,
    returnMethod: null,
  };

  it("accepts the all-null payload", () => {
    expect(deliveryReturnsInputSchema.safeParse(ok).success).toBe(true);
  });

  it("accepts 0 as 'no returns' without fees or method", () => {
    expect(
      deliveryReturnsInputSchema.safeParse({ ...ok, returnWindowDays: 0 })
        .success,
    ).toBe(true);
  });

  it("applies the same pair, order and range rules", () => {
    expect(
      deliveryReturnsInputSchema.safeParse({ ...ok, handlingDaysMin: 1 })
        .success,
    ).toBe(false);
    expect(
      deliveryReturnsInputSchema.safeParse({
        ...ok,
        transitDaysMin: 5,
        transitDaysMax: 2,
      }).success,
    ).toBe(false);
    expect(
      deliveryReturnsInputSchema.safeParse({
        ...ok,
        handlingDaysMin: 0,
        handlingDaysMax: 31,
      }).success,
    ).toBe(false);
    expect(
      deliveryReturnsInputSchema.safeParse({
        ...ok,
        transitDaysMin: 0,
        transitDaysMax: 61,
      }).success,
    ).toBe(false);
    expect(
      deliveryReturnsInputSchema.safeParse({ ...ok, returnWindowDays: 366 })
        .success,
    ).toBe(false);
    expect(
      deliveryReturnsInputSchema.safeParse({
        ...ok,
        handlingDaysMin: 1.5,
        handlingDaysMax: 2,
      }).success,
    ).toBe(false);
  });

  it("a positive window requires fees and method; flat_fee requires cents > 0", () => {
    expect(
      deliveryReturnsInputSchema.safeParse({ ...ok, returnWindowDays: 30 })
        .success,
    ).toBe(false);
    expect(
      deliveryReturnsInputSchema.safeParse({
        ...ok,
        returnWindowDays: 30,
        returnFees: "free",
        returnMethod: "either",
      }).success,
    ).toBe(true);
    expect(
      deliveryReturnsInputSchema.safeParse({
        ...ok,
        returnWindowDays: 30,
        returnFees: "flat_fee",
        returnShippingFeeCents: 0,
        returnMethod: "either",
      }).success,
    ).toBe(false);
    expect(
      deliveryReturnsInputSchema.safeParse({
        ...ok,
        returnWindowDays: 30,
        returnFees: "flat_fee",
        returnShippingFeeCents: 699,
        returnMethod: "in_store",
      }).success,
    ).toBe(true);
  });
});

describe("deliveryReturnsFormDefaults", () => {
  it("maps a never-set row to unset + blanks", () => {
    expect(deliveryReturnsFormDefaults({})).toEqual(blankForm);
  });

  it("maps window 0 to 'none' and drops stale fee/method", () => {
    const d = deliveryReturnsFormDefaults({
      returnWindowDays: 0,
      returnFees: "free",
      returnMethod: "by_mail",
    });
    expect(d.returnsMode).toBe("none");
    expect(d.returnFees).toBe("");
    expect(d.returnMethod).toBe("");
  });

  it("maps an accepting row, with cents shown as dollars", () => {
    const d = deliveryReturnsFormDefaults({
      handlingDaysMin: 1,
      handlingDaysMax: 3,
      transitDaysMin: 2,
      transitDaysMax: 5,
      returnWindowDays: 30,
      returnFees: "flat_fee",
      returnShippingFeeCents: 699,
      returnMethod: "either",
    });
    expect(d).toEqual({
      handlingDaysMin: "1",
      handlingDaysMax: "3",
      transitDaysMin: "2",
      transitDaysMax: "5",
      returnsMode: "accept",
      returnWindowDays: "30",
      returnFees: "flat_fee",
      returnShippingFeeDollars: "6.99",
      returnMethod: "either",
    });
  });

  it("falls back to blank on unknown stored enum strings", () => {
    const d = deliveryReturnsFormDefaults({
      returnWindowDays: 14,
      returnFees: "bogus",
      returnMethod: "carrier_pigeon",
    });
    expect(d.returnFees).toBe("");
    expect(d.returnMethod).toBe("");
  });
});

describe("deliveryReturnsFormToInput", () => {
  it("unset → all nulls", () => {
    expect(deliveryReturnsFormToInput(blankForm)).toEqual({
      handlingDaysMin: null,
      handlingDaysMax: null,
      transitDaysMin: null,
      transitDaysMax: null,
      returnWindowDays: null,
      returnFees: null,
      returnShippingFeeCents: null,
      returnMethod: null,
    });
  });

  it("none → window 0 and everything else null, even with stale fields", () => {
    const out = deliveryReturnsFormToInput(
      form({
        returnsMode: "none",
        returnWindowDays: "30",
        returnFees: "flat_fee",
        returnShippingFeeDollars: "5",
        returnMethod: "either",
      }),
    );
    expect(out.returnWindowDays).toBe(0);
    expect(out.returnFees).toBeNull();
    expect(out.returnShippingFeeCents).toBeNull();
    expect(out.returnMethod).toBeNull();
  });

  it("accept + flat_fee converts dollars to cents; other fee types null the cents", () => {
    const flat = deliveryReturnsFormToInput(
      acceptForm({
        returnFees: "flat_fee",
        returnShippingFeeDollars: "6.99",
        handlingDaysMin: "1",
        handlingDaysMax: "2",
      }),
    );
    expect(flat).toMatchObject({
      returnWindowDays: 30,
      returnFees: "flat_fee",
      returnShippingFeeCents: 699,
      returnMethod: "by_mail",
      handlingDaysMin: 1,
      handlingDaysMax: 2,
    });
    const free = deliveryReturnsFormToInput(
      acceptForm({ returnShippingFeeDollars: "6.99" }),
    );
    expect(free.returnShippingFeeCents).toBeNull();
  });

  it("round-trips through defaults and satisfies the wire schema", () => {
    const original = acceptForm({
      returnFees: "flat_fee",
      returnShippingFeeDollars: "4.50",
      transitDaysMin: "2",
      transitDaysMax: "6",
    });
    const input = deliveryReturnsFormToInput(original);
    expect(deliveryReturnsInputSchema.safeParse(input).success).toBe(true);
    expect(deliveryReturnsFormDefaults(input)).toEqual({
      ...original,
      handlingDaysMin: "",
      handlingDaysMax: "",
    });
  });
});

describe("local delivery validators", () => {
  const on = {
    offersLocalDelivery: true,
    originZip: "",
    radiusMiles: "15",
    feeDollars: "0.00",
    bands: [] as { upToMiles: string; feeDollars: string }[],
    minOrderDollars: "",
    instructions: "",
  };
  const messages = (
    values: typeof on,
    fallbackZip: string | null = "48104",
  ) => {
    const r = createLocalDeliveryFormSchema(fallbackZip).safeParse(values);
    return r.success ? [] : r.error.issues.map((i) => i.message);
  };

  it("accepts a complete form that falls back to the business ZIP", () => {
    expect(messages(on)).toEqual([]);
  });

  it("requires a radius only when delivery is on", () => {
    expect(messages({ ...on, radiusMiles: "" })).toHaveLength(1);
    expect(
      messages({ ...on, offersLocalDelivery: false, radiusMiles: "" }),
    ).toEqual([]);
  });

  it("rejects a radius outside 1-100 or non-integer", () => {
    for (const radiusMiles of ["0", "101", "2.5", "abc"]) {
      expect(messages({ ...on, radiusMiles })).toHaveLength(1);
    }
  });

  it("needs an origin from the form or the business address", () => {
    expect(messages(on, null)).toHaveLength(1);
    expect(messages({ ...on, originZip: "48104" }, null)).toEqual([]);
  });

  it("rejects a malformed ZIP and bad money", () => {
    expect(messages({ ...on, originZip: "4810" })).toHaveLength(1);
    expect(messages({ ...on, feeDollars: "-1" })).toHaveLength(1);
    expect(messages({ ...on, minOrderDollars: "abc" })).toHaveLength(1);
  });

  it("converts to the wire shape in cents ($0 = free)", () => {
    const input = localDeliveryFormToInput({
      ...on,
      minOrderDollars: "$30",
      instructions: "  Tue/Thu  ",
    });
    expect(input).toEqual({
      offersLocalDelivery: true,
      originZip: null,
      radiusMiles: 15,
      feeCents: 0,
      bands: [],
      minOrderCents: 3000,
      instructions: "Tue/Thu",
    });
    expect(localDeliveryInputSchema.safeParse(input).success).toBe(true);
  });

  it("requires a radius on the wire when on", () => {
    expect(
      localDeliveryInputSchema.safeParse({
        offersLocalDelivery: true,
        originZip: null,
        radiusMiles: null,
        feeCents: 0,
        minOrderCents: null,
        instructions: null,
      }).success,
    ).toBe(false);
  });

  it("hydrates defaults from the row", () => {
    expect(
      localDeliveryFormDefaults({
        offersLocalDelivery: true,
        localDeliveryOriginZip: "48104",
        localDeliveryRadiusMiles: 12,
        localDeliveryFeeCents: 500,
        localDeliveryMinOrderCents: null,
        localDeliveryInstructions: "Evenings",
      }),
    ).toEqual({
      offersLocalDelivery: true,
      originZip: "48104",
      radiusMiles: "12",
      feeDollars: "5.00",
      bands: [],
      minOrderDollars: "",
      instructions: "Evenings",
    });
  });

  describe("closer prices (bands)", () => {
    const withBands = (bands: { upToMiles: string; feeDollars: string }[]) => ({
      ...on,
      feeDollars: "5.00",
      bands,
    });

    it("accepts valid rows in any order and sorts them on the wire", () => {
      const values = withBands([
        { upToMiles: "10", feeDollars: "3.00" },
        { upToMiles: "5", feeDollars: "0" },
      ]);
      expect(messages(values)).toEqual([]);
      const input = localDeliveryFormToInput(values);
      expect(input.bands).toEqual([
        { upToMiles: 5, feeCents: 0 },
        { upToMiles: 10, feeCents: 300 },
      ]);
      expect(localDeliveryInputSchema.safeParse(input).success).toBe(true);
    });

    it("rejects a distance at or beyond the radius", () => {
      expect(
        messages(withBands([{ upToMiles: "15", feeDollars: "1" }])),
      ).toEqual(["Must be less than your 15-mile radius."]);
      expect(
        messages(withBands([{ upToMiles: "20", feeDollars: "1" }])),
      ).toEqual(["Must be less than your 15-mile radius."]);
    });

    it("rejects duplicates, bad miles and missing or negative prices", () => {
      expect(
        messages(
          withBands([
            { upToMiles: "5", feeDollars: "1" },
            { upToMiles: "5", feeDollars: "2" },
          ]),
        ),
      ).toEqual(["Each distance can only be used once."]);
      for (const upToMiles of ["", "0", "2.5", "abc"]) {
        expect(
          messages(withBands([{ upToMiles, feeDollars: "1" }])),
        ).toHaveLength(1);
      }
      for (const feeDollars of ["", "-1", "abc"]) {
        expect(
          messages(withBands([{ upToMiles: "5", feeDollars }])),
        ).toHaveLength(1);
      }
    });

    it("allows at most 3 rows", () => {
      const rows = [2, 4, 6, 8].map((m) => ({
        upToMiles: String(m),
        feeDollars: "1",
      }));
      expect(messages(withBands(rows.slice(0, 3)))).toEqual([]);
      expect(messages(withBands(rows))).toHaveLength(1);
    });

    it("needs a radius before a row can be checked", () => {
      expect(
        messages({
          ...withBands([{ upToMiles: "5", feeDollars: "1" }]),
          offersLocalDelivery: false,
          radiusMiles: "",
        }),
      ).toEqual(["Enter your delivery radius first."]);
    });

    it("enforces the same rules on the wire and defaults to no bands", () => {
      const wire = {
        offersLocalDelivery: true,
        originZip: null,
        radiusMiles: 15,
        feeCents: 500,
        minOrderCents: null,
        instructions: null,
      };
      const parsed = localDeliveryInputSchema.parse(wire);
      expect(parsed.bands).toEqual([]);

      const bad = (bands: unknown) =>
        localDeliveryInputSchema.safeParse({ ...wire, bands }).success;
      expect(bad([{ upToMiles: 15, feeCents: 0 }])).toBe(false);
      expect(
        bad([
          { upToMiles: 5, feeCents: 0 },
          { upToMiles: 5, feeCents: 100 },
        ]),
      ).toBe(false);
      expect(bad([{ upToMiles: 5, feeCents: -1 }])).toBe(false);
      expect(
        bad([2, 4, 6, 8].map((m) => ({ upToMiles: m, feeCents: 0 }))),
      ).toBe(false);

      const sorted = localDeliveryInputSchema.parse({
        ...wire,
        bands: [
          { upToMiles: 10, feeCents: 300 },
          { upToMiles: 5, feeCents: 0 },
        ],
      });
      expect(sorted.bands.map((b) => b.upToMiles)).toEqual([5, 10]);
    });

    it("hydrates defaults through the shared parser (drops bad rows)", () => {
      const defaults = localDeliveryFormDefaults({
        offersLocalDelivery: true,
        localDeliveryRadiusMiles: 15,
        localDeliveryFeeCents: 500,
        localDeliveryBands: [
          { upToMiles: 10, feeCents: 300 },
          { upToMiles: 5, feeCents: 0 },
          { upToMiles: 30, feeCents: 0 },
          "junk",
        ],
      });
      expect(defaults.bands).toEqual([
        { upToMiles: "5", feeDollars: "0.00" },
        { upToMiles: "10", feeDollars: "3.00" },
      ]);
      expect(
        localDeliveryFormDefaults({ localDeliveryBands: null }).bands,
      ).toEqual([]);
    });
  });
});
