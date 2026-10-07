import { describe, expect, it } from "vitest";

import type { DeliveryReturnsFormValues } from "./shipping";

import {
  deliveryReturnsFormDefaults,
  deliveryReturnsFormSchema,
  deliveryReturnsFormToInput,
  deliveryReturnsInputSchema,
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
