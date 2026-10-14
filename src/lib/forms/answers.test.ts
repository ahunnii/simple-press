import { describe, expect, it } from "vitest";

import type { FormAnswerSnapshot, FormQuantityItem } from "./answers";
import type { FormDefinition, FormField } from "~/lib/validators/form";
import { formDefinitionSchema } from "~/lib/validators/form";

import {
  answerLabels,
  FORM_REQUIRED_MESSAGE,
  formatAnswerForDisplay,
  formatAnswerOrDash,
  formatQuantityItems,
  formatTimeForDisplay,
  getConfirmationEmail,
  isQuantityItems,
  normalizeTime,
  parseAnswersJson,
  serializeAnswers,
  snapshotMatchesFieldFilter,
  snapshotMatchesSearch,
  stripAnswerCode,
  toAnswerSnapshot,
  validateFormAnswers,
} from "./answers";

const options = [
  { id: "o_red", label: "Red" },
  { id: "o_green", label: "Green" },
  { id: "o_blue", label: "Blue" },
];

const definition: FormDefinition = formDefinitionSchema.parse({
  version: 1,
  fields: [
    { id: "name", type: "text", label: "Name", required: true, maxLength: 10 },
    { id: "msg", type: "longtext", label: "Message", maxLength: 20 },
    { id: "email", type: "email", label: "Email" },
    { id: "phone", type: "phone", label: "Phone" },
    { id: "qty", type: "number", label: "Qty", min: 1, max: 10, step: 1 },
    { id: "color", type: "select", label: "Color", options },
    {
      id: "size",
      type: "radio",
      label: "Size",
      options: [
        { id: "s", label: "Small" },
        { id: "l", label: "Large" },
      ],
    },
    { id: "extras", type: "checkboxes", label: "Extras", options },
    { id: "agree", type: "checkbox", label: "I agree", required: true },
    { id: "when", type: "date", label: "When", minDate: "today" },
  ],
  settings: { confirmationFieldId: "email" },
});

// Time fields live in their own definition so the shared one's full-submission
// expectations above stay about the original ten types.
const timeFields = formDefinitionSchema.parse({
  version: 1,
  fields: [
    { id: "at", type: "time", label: "At" },
    { id: "needed", type: "time", label: "Needed", required: true },
  ],
}).fields;

const fields = definition.fields;
const field = (id: string) =>
  [...fields, ...timeFields].find((f) => f.id === id)!;

/** Validate one field in isolation. */
function one(
  id: string,
  value: unknown,
  opts?: Parameters<typeof validateFormAnswers>[2],
) {
  const result = validateFormAnswers([field(id)], { [id]: value }, opts);
  return result.ok
    ? { value: result.values[id] }
    : { error: result.errors[id] };
}

const validRaw = {
  name: "Ada",
  agree: true,
};

describe("validateFormAnswers", () => {
  it("normalizes a full valid submission and ignores unknown keys", () => {
    const result = validateFormAnswers(
      fields,
      {
        name: "  Ada ",
        msg: "",
        email: "ada@example.com",
        phone: "+1 (555) 123-4567",
        qty: "3",
        color: "o_green",
        size: "l",
        extras: ["o_blue", "o_red"],
        agree: true,
        when: "2030-01-02",
        bogus: "ignored",
      },
      { today: "2026-09-23" },
    );
    expect(result).toEqual({
      ok: true,
      values: {
        name: "Ada",
        msg: null,
        email: "ada@example.com",
        phone: "+1 (555) 123-4567",
        qty: 3,
        color: "Green",
        size: "Large",
        extras: ["Red", "Blue"], // definition order
        agree: true,
        when: "2030-01-02",
      },
    });
  });

  it("reports required fields and leaves optional blanks as null", () => {
    const result = validateFormAnswers(fields, {});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual({
      name: "This field is required.",
      agree: "Please check this box to continue.",
    });

    const ok = validateFormAnswers(fields, validRaw);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.values.email).toBeNull();
  });

  it("relaxRequired skips required, required-checkbox and minDate checks", () => {
    const result = validateFormAnswers(
      fields,
      { agree: "no", when: "2001-01-01" },
      { relaxRequired: true, today: "2026-09-23" },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values.name).toBeNull();
      expect(result.values.agree).toBe(false);
      expect(result.values.when).toBe("2001-01-01");
    }
  });

  it("text / longtext enforce maxLength and reject non-strings", () => {
    expect(one("name", "x".repeat(11)).error).toMatch(/10 characters/);
    expect(one("msg", "y".repeat(21)).error).toMatch(/20 characters/);
    expect(one("msg", "short").value).toBe("short");
    expect(one("name", { nope: 1 }).error).toBeDefined();
  });

  it("email", () => {
    expect(one("email", " a@b.co ").value).toBe("a@b.co");
    expect(one("email", "not-an-email").error).toBe(
      "Enter a valid email address.",
    );
  });

  it("phone", () => {
    expect(one("phone", "555-1234").value).toBe("555-1234");
    expect(one("phone", "12345").error).toBe("Enter a valid phone number.");
    expect(one("phone", "call me maybe").error).toBeDefined();
    expect(one("phone", "1".repeat(33)).error).toBeDefined();
  });

  it("number coerces strings and enforces min/max/step", () => {
    expect(one("qty", 4).value).toBe(4);
    expect(one("qty", " 7 ").value).toBe(7);
    expect(one("qty", "abc").error).toBe("Enter a number.");
    expect(one("qty", 0).error).toBe("Enter 1 or more.");
    expect(one("qty", "11").error).toBe("Enter 10 or less.");
    expect(one("qty", 2.5).error).toMatch(/multiple of 1/);
    expect(one("qty", "").value).toBeNull();
  });

  it("select/radio match by id by default and store the label", () => {
    expect(one("color", "o_red").value).toBe("Red");
    expect(one("color", "Red").error).toBe("Pick one of the options.");
    expect(one("size", "s").value).toBe("Small");
  });

  it("select/radio match by label case-insensitively in label mode", () => {
    expect(one("color", " red ", { optionMatch: "label" }).value).toBe("Red");
    expect(one("color", "o_red", { optionMatch: "label" }).error).toBe(
      '"o_red" isn\'t one of the options.',
    );
  });

  it("checkboxes accept arrays or a '; ' string, dedupe, validate", () => {
    expect(one("extras", ["o_red", "o_red"]).value).toEqual(["Red"]);
    expect(one("extras", "blue; RED", { optionMatch: "label" }).value).toEqual([
      "Red",
      "Blue",
    ]);
    expect(one("extras", "Blue;Purple", { optionMatch: "label" }).error).toBe(
      '"Purple" isn\'t one of the options.',
    );
    expect(one("extras", []).value).toBeNull();
    expect(one("extras", [1, 2]).error).toBeDefined();
  });

  it("checkbox coerces boolean-ish values", () => {
    const relaxed = { relaxRequired: true };
    for (const truthy of [true, "true", "Yes", "1", "on", 1]) {
      expect(one("agree", truthy, relaxed).value).toBe(true);
    }
    for (const falsy of [false, "false", "NO", "0", "off", 0]) {
      expect(one("agree", falsy, relaxed).value).toBe(false);
    }
    expect(one("agree", "", relaxed).value).toBeNull();
    expect(one("agree", "maybe", relaxed).error).toBe("Answer yes or no.");
    // required → must be checked
    expect(one("agree", false).error).toBe(
      "Please check this box to continue.",
    );
    expect(one("agree", "yes").value).toBe(true);
  });

  it("date validates shape, existence and minDate today", () => {
    const today = { today: "2026-09-23" };
    expect(one("when", "2026-09-23", today).value).toBe("2026-09-23");
    expect(one("when", "2026-09-22", today).error).toBe(
      "Pick today or a later date.",
    );
    expect(one("when", "2026-02-30", today).error).toBe("Enter a valid date.");
    expect(one("when", "tomorrow", today).error).toBe("Enter a valid date.");
    // US-style dates (spreadsheets reformat) normalize to ISO
    expect(one("when", "12/5/2026", today).value).toBe("2026-12-05");
  });

  it("time normalizes 24h and 12h text to HH:mm", () => {
    expect(one("at", "14:30").value).toBe("14:30");
    expect(one("at", "09:05").value).toBe("09:05");
    expect(one("at", "9:05").value).toBe("09:05");
    expect(one("at", "14:30:00").value).toBe("14:30"); // browser seconds
    expect(one("at", " 2:30 PM ").value).toBe("14:30");
    expect(one("at", "2:30pm").value).toBe("14:30");
    expect(one("at", "2:30 p.m.").value).toBe("14:30");
    expect(one("at", "2 PM").value).toBe("14:00");
    expect(one("at", "12:00 AM").value).toBe("00:00");
    expect(one("at", "12:15 PM").value).toBe("12:15");
    expect(one("at", "12 am").value).toBe("00:00");
    expect(one("at", "00:00").value).toBe("00:00");
    expect(one("at", "23:59").value).toBe("23:59");
  });

  it("time rejects impossible or ambiguous values", () => {
    for (const bad of [
      "25:00",
      "24:00",
      "12:60",
      "abc",
      "14",
      "0 PM",
      "13:00 PM",
      "2:30 XM",
      "2:30:15 PM",
    ]) {
      expect(one("at", bad).error, bad).toBe("Enter a valid time.");
    }
    expect(one("at", ["14:30"]).error).toBe("Enter a valid answer.");
  });

  it("time treats blank as null, or required when the field is required", () => {
    expect(one("at", "").value).toBeNull();
    expect(one("at", undefined).value).toBeNull();
    expect(one("needed", "  ").error).toBe("This field is required.");
    expect(one("needed", "", { relaxRequired: true }).value).toBeNull();
    // relaxRequired still validates a present value
    expect(one("needed", "nope", { relaxRequired: true }).error).toBe(
      "Enter a valid time.",
    );
  });
});

describe("time helpers", () => {
  it("normalizeTime returns null for non-times", () => {
    expect(normalizeTime("14:30")).toBe("14:30");
    expect(normalizeTime("")).toBeNull();
    expect(normalizeTime("noon")).toBeNull();
  });

  it("formatTimeForDisplay renders 12h and passes junk through", () => {
    expect(formatTimeForDisplay("00:00")).toBe("12:00 AM");
    expect(formatTimeForDisplay("00:05")).toBe("12:05 AM");
    expect(formatTimeForDisplay("09:05")).toBe("9:05 AM");
    expect(formatTimeForDisplay("12:00")).toBe("12:00 PM");
    expect(formatTimeForDisplay("14:30")).toBe("2:30 PM");
    expect(formatTimeForDisplay("23:59")).toBe("11:59 PM");
    expect(formatTimeForDisplay("later")).toBe("later");
    expect(formatTimeForDisplay("25:00")).toBe("25:00");
  });
});

describe("snapshots + formatting", () => {
  const values = {
    name: "Ada",
    qty: 3,
    extras: ["Red", "Blue"],
    agree: true,
    email: null,
  };
  const snapshots = toAnswerSnapshot(fields, values);

  it("toAnswerSnapshot follows field order and fills nulls", () => {
    expect(snapshots.map((s) => s.fieldId)).toEqual(fields.map((f) => f.id));
    expect(snapshots[0]).toEqual({
      fieldId: "name",
      label: "Name",
      type: "text",
      value: "Ada",
    });
    expect(snapshots.find((s) => s.fieldId === "color")?.value).toBeNull();
  });

  it("formatAnswerForDisplay", () => {
    expect(formatAnswerForDisplay(null)).toBe("");
    expect(formatAnswerForDisplay(true)).toBe("Yes");
    expect(formatAnswerForDisplay(false)).toBe("No");
    expect(formatAnswerForDisplay(["a", "b"])).toBe("a; b");
    expect(formatAnswerForDisplay(4.5)).toBe("4.5");
    expect(formatAnswerForDisplay(snapshots[0]!)).toBe("Ada");
    expect(formatAnswerOrDash(null)).toBe("—");
    expect(formatAnswerOrDash("x")).toBe("x");
  });

  it("formatAnswerForDisplay shows a time snapshot in 12h, a bare value as stored", () => {
    const at: FormAnswerSnapshot = {
      fieldId: "at",
      label: "At",
      type: "time",
      value: "14:30",
    };
    expect(formatAnswerForDisplay(at)).toBe("2:30 PM");
    expect(formatAnswerOrDash(at)).toBe("2:30 PM");
    expect(formatAnswerForDisplay(at.value)).toBe("14:30"); // CSV export path
    expect(formatAnswerForDisplay({ ...at, value: null })).toBe("");
    expect(formatAnswerOrDash({ ...at, value: null })).toBe("—");
  });

  it("time answers are searchable and filterable by stored or displayed form", () => {
    const at: FormAnswerSnapshot[] = [
      { fieldId: "at", label: "At", type: "time", value: "14:30" },
    ];
    expect(snapshotMatchesSearch(at, "14:30")).toBe(true);
    expect(snapshotMatchesSearch(at, "2:30 pm")).toBe(true);
    expect(snapshotMatchesSearch(at, "3:30")).toBe(false);
    expect(snapshotMatchesFieldFilter(at, "at", "14:3")).toBe(true);
    expect(snapshotMatchesFieldFilter(at, "at", "2:30 PM")).toBe(true);
    expect(snapshotMatchesFieldFilter(at, "at", "9:00")).toBe(false);
  });

  it("serializeAnswers / parseAnswersJson round-trip and tolerate junk", () => {
    expect(parseAnswersJson(serializeAnswers(snapshots))).toEqual(snapshots);
    expect(parseAnswersJson("not json")).toEqual([]);
    expect(parseAnswersJson('{"a":1}')).toEqual([]);
    expect(parseAnswersJson(null)).toEqual([]);
    expect(
      parseAnswersJson(
        JSON.stringify([
          { fieldId: "x", label: "X", type: "text", value: "ok" },
          { fieldId: "y", label: "Y", type: "bogus", value: "dropped" },
          { fieldId: "z", label: "Z", type: "text", value: { no: 1 } },
        ]),
      ),
    ).toEqual([{ fieldId: "x", label: "X", type: "text", value: "ok" }]);
  });

  it("snapshotMatchesSearch covers labels and formatted values", () => {
    expect(snapshotMatchesSearch(snapshots, "")).toBe(true);
    expect(snapshotMatchesSearch(snapshots, "ADA")).toBe(true);
    expect(snapshotMatchesSearch(snapshots, "blue")).toBe(true);
    expect(snapshotMatchesSearch(snapshots, "yes")).toBe(true);
    expect(snapshotMatchesSearch(snapshots, "message")).toBe(true); // label
    expect(snapshotMatchesSearch(snapshots, "zebra")).toBe(false);
  });

  it("snapshotMatchesFieldFilter per type", () => {
    const withChoice: FormAnswerSnapshot[] = [
      ...snapshots.filter((s) => s.fieldId !== "color"),
      { fieldId: "color", label: "Color", type: "select", value: "Green" },
    ];
    expect(snapshotMatchesFieldFilter(withChoice, "color", "green")).toBe(true);
    expect(snapshotMatchesFieldFilter(withChoice, "color", "gre")).toBe(false);
    expect(snapshotMatchesFieldFilter(withChoice, "extras", "red")).toBe(true);
    expect(snapshotMatchesFieldFilter(withChoice, "extras", "green")).toBe(
      false,
    );
    expect(snapshotMatchesFieldFilter(withChoice, "agree", "Yes")).toBe(true);
    expect(snapshotMatchesFieldFilter(withChoice, "agree", "no")).toBe(false);
    expect(snapshotMatchesFieldFilter(withChoice, "name", "ad")).toBe(true);
    expect(snapshotMatchesFieldFilter(withChoice, "email", "x")).toBe(false);
    expect(snapshotMatchesFieldFilter(withChoice, "missing", "x")).toBe(false);
    expect(snapshotMatchesFieldFilter(withChoice, "missing", " ")).toBe(true);
  });
});

describe("picturechoice answers", () => {
  const tiles = [
    { id: "t_red", label: "Red", color: "#ff0000" },
    { id: "t_gold", label: "Gold", imageUrl: "https://cdn.example.com/g.jpg" },
    { id: "t_box", label: "2 x 4" }, // a label that itself contains " x "
    { id: "t_blue", label: "Blue" },
  ];
  const pictureFields = formDefinitionSchema.parse({
    version: 1,
    fields: [
      { id: "pick", type: "picturechoice", label: "Pick", options: tiles },
      {
        id: "picks",
        type: "picturechoice",
        label: "Picks",
        selection: "many",
        minTotal: 2,
        maxTotal: 3,
        options: tiles,
      },
      {
        id: "qty",
        type: "picturechoice",
        label: "Balloons",
        selection: "quantity",
        options: tiles,
      },
      {
        id: "dozen",
        type: "picturechoice",
        label: "Dozen",
        selection: "quantity",
        required: true,
        minTotal: 12,
        maxTotal: 12,
        options: tiles,
      },
      {
        id: "need",
        type: "picturechoice",
        label: "Need",
        selection: "many",
        required: true,
        options: tiles,
      },
    ],
  }).fields;

  function pic(
    id: string,
    value: unknown,
    opts?: Parameters<typeof validateFormAnswers>[2],
  ) {
    const target = pictureFields.find((f) => f.id === id)!;
    const result = validateFormAnswers([target], { [id]: value }, opts);
    return result.ok
      ? { value: result.values[id] }
      : { error: result.errors[id] };
  }
  const byLabel = { optionMatch: "label" } as const;

  describe("'one' mode (like radio)", () => {
    it("stores the label, matched by id or label", () => {
      expect(pic("pick", "t_gold")).toEqual({ value: "Gold" });
      expect(pic("pick", " gold ", byLabel)).toEqual({ value: "Gold" });
      expect(pic("pick", "")).toEqual({ value: null });
    });

    it("rejects unknown options and non-strings", () => {
      expect(pic("pick", "Gold")).toEqual({
        error: "Pick one of the options.",
      });
      expect(pic("pick", "Pink", byLabel)).toEqual({
        error: '"Pink" isn\'t one of the options.',
      });
      expect(pic("pick", ["t_red"])).toEqual({
        error: "Pick one of the options.",
      });
    });
  });

  describe("'many' mode (like checkboxes)", () => {
    it("stores labels in option order, deduped", () => {
      expect(pic("picks", ["t_blue", "t_red", "t_blue"])).toEqual({
        value: ["Red", "Blue"],
      });
      expect(pic("picks", "Blue; red", byLabel)).toEqual({
        value: ["Red", "Blue"],
      });
    });

    it("enforces the pick count only on a given answer", () => {
      expect(pic("picks", ["t_red"])).toEqual({
        error: "Pick at least 2 options.",
      });
      expect(pic("picks", ["t_red", "t_gold", "t_box", "t_blue"])).toEqual({
        error: "Pick no more than 3 options.",
      });
      expect(pic("picks", [])).toEqual({ value: null });
    });

    it("required means at least one pick (relaxed for import)", () => {
      expect(pic("need", [])).toEqual({ error: FORM_REQUIRED_MESSAGE });
      expect(pic("need", "", { relaxRequired: true })).toEqual({
        value: null,
      });
      expect(pic("need", ["t_box"])).toEqual({ value: ["2 x 4"] });
    });
  });

  describe("'quantity' mode", () => {
    it("accepts {option, quantity}[] by id, in option order, zeros dropped", () => {
      expect(
        pic("qty", [
          { option: "t_blue", quantity: 2 },
          { option: "t_red", quantity: 3 },
          { option: "t_gold", quantity: 0 },
        ]),
      ).toEqual({
        value: [
          { option: "Red", quantity: 3 },
          { option: "Blue", quantity: 2 },
        ],
      });
    });

    it("accepts a record keyed by id (zeros skipped) or by label", () => {
      expect(pic("qty", { t_red: 1, t_gold: 0, t_blue: "4" })).toEqual({
        value: [
          { option: "Red", quantity: 1 },
          { option: "Blue", quantity: 4 },
        ],
      });
      expect(pic("qty", { gold: 2 }, byLabel)).toEqual({
        value: [{ option: "Gold", quantity: 2 }],
      });
    });

    it("sums repeats of one option", () => {
      expect(
        pic("qty", [
          { option: "t_red", quantity: 2 },
          { option: "t_red", quantity: 5 },
        ]),
      ).toEqual({ value: [{ option: "Red", quantity: 7 }] });
      expect(pic("qty", "Red x 1; red × 2", byLabel)).toEqual({
        value: [{ option: "Red", quantity: 3 }],
      });
    });

    it("parses CSV text with x or ×, and labels containing ' x '", () => {
      expect(
        pic("qty", "Gold × 2; 2 x 4 x 3; Red X 1; Blue ×10", byLabel),
      ).toEqual({
        value: [
          { option: "Red", quantity: 1 },
          { option: "Gold", quantity: 2 },
          { option: "2 x 4", quantity: 3 },
          { option: "Blue", quantity: 10 },
        ],
      });
      expect(pic("qty", "Red", byLabel)).toEqual({
        error: '"Red" needs a quantity, like "Red x 2".',
      });
      expect(pic("qty", "Pink x 2", byLabel)).toEqual({
        error: '"Pink" isn\'t one of the options.',
      });
    });

    it("rejects bad quantities and shapes", () => {
      const bad = "Enter a whole number from 1 to 999 for Red.";
      expect(pic("qty", [{ option: "t_red", quantity: 1.5 }])).toEqual({
        error: bad,
      });
      expect(pic("qty", [{ option: "t_red", quantity: -1 }])).toEqual({
        error: bad,
      });
      expect(pic("qty", [{ option: "t_red", quantity: 1000 }])).toEqual({
        error: bad,
      });
      expect(pic("qty", { t_red: "two" })).toEqual({ error: bad });
      expect(
        pic("qty", [
          { option: "t_red", quantity: 600 },
          { option: "t_red", quantity: 600 },
        ]),
      ).toEqual({ error: "Enter 999 or fewer for Red." });
      const shape = "Choose quantities from the listed options.";
      expect(pic("qty", [{ option: "Red", quantity: 1 }])).toEqual({
        error: shape,
      }); // label sent where an id is expected
      expect(pic("qty", ["Red x 1"])).toEqual({ error: shape });
      expect(pic("qty", 5)).toEqual({ error: shape });
    });

    it("enforces the total and required", () => {
      expect(pic("dozen", { t_red: 6, t_gold: 5 })).toEqual({
        error: "Choose at least 12 in total.",
      });
      expect(pic("dozen", { t_red: 6, t_gold: 7 })).toEqual({
        error: "Choose no more than 12 in total.",
      });
      expect(pic("dozen", { t_red: 6, t_gold: 6 })).toEqual({
        value: [
          { option: "Red", quantity: 6 },
          { option: "Gold", quantity: 6 },
        ],
      });
      expect(pic("dozen", {})).toEqual({ error: FORM_REQUIRED_MESSAGE });
      expect(pic("dozen", { t_red: 0 })).toEqual({
        error: FORM_REQUIRED_MESSAGE,
      });
      expect(pic("dozen", null, { relaxRequired: true })).toEqual({
        value: null,
      });
      expect(pic("qty", undefined)).toEqual({ value: null });
    });
  });

  describe("formatting, filters and storage", () => {
    const items: FormQuantityItem[] = [
      { option: "Red", quantity: 3 },
      { option: "2 x 4", quantity: 2 },
    ];
    const snapshots: FormAnswerSnapshot[] = [
      { fieldId: "pick", label: "Pick", type: "picturechoice", value: "Gold" },
      {
        fieldId: "picks",
        label: "Picks",
        type: "picturechoice",
        value: ["Red", "Blue"],
      },
      {
        fieldId: "qty",
        label: "Balloons",
        type: "picturechoice",
        value: items,
      },
    ];

    it("formats quantity items as 'Label × N; …'", () => {
      expect(formatQuantityItems(items)).toBe("Red × 3; 2 x 4 × 2");
      expect(formatAnswerForDisplay(items)).toBe("Red × 3; 2 x 4 × 2");
      expect(formatAnswerForDisplay(snapshots[2]!)).toBe("Red × 3; 2 x 4 × 2");
      expect(formatAnswerOrDash([])).toBe("—");
      expect(formatAnswerForDisplay(snapshots[1]!)).toBe("Red; Blue");
    });

    it("formatted quantity text validates back to the same items", () => {
      expect(pic("qty", formatAnswerForDisplay(items), byLabel)).toEqual({
        value: [
          { option: "Red", quantity: 3 },
          { option: "2 x 4", quantity: 2 },
        ],
      });
    });

    it("isQuantityItems / answerLabels tell the shapes apart", () => {
      expect(isQuantityItems(items)).toBe(true);
      expect(isQuantityItems(["Red"])).toBe(false);
      expect(isQuantityItems([])).toBe(false);
      expect(isQuantityItems("Red")).toBe(false);
      expect(answerLabels(items)).toEqual(["Red", "2 x 4"]);
      expect(answerLabels(["Red", "Blue"])).toEqual(["Red", "Blue"]);
      expect(answerLabels("Gold")).toEqual(["Gold"]);
      expect(answerLabels(true)).toEqual([]);
    });

    it("filters match a picked label in every mode", () => {
      expect(snapshotMatchesFieldFilter(snapshots, "pick", "gold")).toBe(true);
      expect(snapshotMatchesFieldFilter(snapshots, "pick", "gol")).toBe(false);
      expect(snapshotMatchesFieldFilter(snapshots, "picks", "BLUE")).toBe(true);
      expect(snapshotMatchesFieldFilter(snapshots, "picks", "gold")).toBe(
        false,
      );
      expect(snapshotMatchesFieldFilter(snapshots, "qty", "2 x 4")).toBe(true);
      expect(snapshotMatchesFieldFilter(snapshots, "qty", "blue")).toBe(false);
    });

    it("search covers quantity labels and the formatted text", () => {
      expect(snapshotMatchesSearch(snapshots, "red × 3")).toBe(true);
      expect(snapshotMatchesSearch(snapshots, "2 x 4")).toBe(true);
      expect(snapshotMatchesSearch(snapshots, "pink")).toBe(false);
    });

    it("parseAnswersJson keeps quantity items (and still drops junk)", () => {
      expect(parseAnswersJson(serializeAnswers(snapshots))).toEqual(snapshots);
      expect(
        parseAnswersJson(
          JSON.stringify([
            {
              fieldId: "q",
              label: "Q",
              type: "picturechoice",
              value: [{ option: "Red", quantity: "3" }],
            },
          ]),
        ),
      ).toEqual([]);
    });
  });
});

describe("picturechoice answers with catalog codes and hidden tiles", () => {
  const tiles = [
    { id: "t_gold", label: "Pearl Gold", code: "610" },
    { id: "t_red", label: "Red", code: "010" },
    { id: "t_old", label: "Retired Teal", code: "092", hidden: true },
    { id: "t_plain", label: "Plain" },
  ];
  const fields = formDefinitionSchema.parse({
    version: 1,
    fields: [
      { id: "one", type: "picturechoice", label: "One", options: tiles },
      {
        id: "many",
        type: "picturechoice",
        label: "Many",
        selection: "many",
        options: tiles,
      },
      {
        id: "qty",
        type: "picturechoice",
        label: "Qty",
        selection: "quantity",
        options: tiles,
      },
    ],
  }).fields;

  function pic(
    id: string,
    value: unknown,
    opts?: Parameters<typeof validateFormAnswers>[2],
  ) {
    const target = fields.find((f) => f.id === id)!;
    const result = validateFormAnswers([target], { [id]: value }, opts);
    return result.ok
      ? { value: result.values[id] }
      : { error: result.errors[id] };
  }
  const byLabel = { optionMatch: "label" } as const;

  it("stores a coded tile as 'Label (#code)' in every mode", () => {
    expect(pic("one", "t_gold")).toEqual({ value: "Pearl Gold (#610)" });
    expect(pic("one", "t_plain")).toEqual({ value: "Plain" });
    expect(pic("many", ["t_plain", "t_red", "t_gold"])).toEqual({
      value: ["Pearl Gold (#610)", "Red (#010)", "Plain"],
    });
    expect(pic("qty", { t_gold: 2, t_plain: "1" })).toEqual({
      value: [
        { option: "Pearl Gold (#610)", quantity: 2 },
        { option: "Plain", quantity: 1 },
      ],
    });
  });

  it("rejects a hidden tile in id mode, even when its id is posted", () => {
    expect(pic("one", "t_old")).toEqual({ error: "Pick one of the options." });
    expect(pic("many", ["t_red", "t_old"])).toEqual({
      error: "Pick from the listed options.",
    });
    expect(pic("qty", { t_old: 1 })).toEqual({
      error: "Choose quantities from the listed options.",
    });
  });

  it("label mode accepts the plain label, the answer label, and hidden tiles", () => {
    expect(pic("one", "pearl gold", byLabel)).toEqual({
      value: "Pearl Gold (#610)",
    });
    expect(pic("one", " Pearl Gold (#610) ", byLabel)).toEqual({
      value: "Pearl Gold (#610)",
    });
    expect(pic("one", "pearl gold (#610)", byLabel)).toEqual({
      value: "Pearl Gold (#610)",
    });
    expect(pic("one", "Retired Teal (#092)", byLabel)).toEqual({
      value: "Retired Teal (#092)",
    });
    expect(pic("many", "Pearl Gold; Red (#010)", byLabel)).toEqual({
      value: ["Pearl Gold (#610)", "Red (#010)"],
    });
    expect(pic("one", "Pearl Gold (#999)", byLabel)).toEqual({
      error: '"Pearl Gold (#999)" isn\'t one of the options.',
    });
  });

  it("round-trips the quantity cell 'Pearl Gold (#610) × 2'", () => {
    const items = [
      { option: "Pearl Gold (#610)", quantity: 2 },
      { option: "Plain", quantity: 1 },
    ];
    const text = formatAnswerForDisplay(items);
    expect(text).toBe("Pearl Gold (#610) × 2; Plain × 1");
    expect(pic("qty", text, byLabel)).toEqual({ value: items });
    // The plain-label form (an entry from before the tile had a code) too.
    expect(pic("qty", "Pearl Gold x 2; Plain x 1", byLabel)).toEqual({
      value: items,
    });
  });

  it("filters resolve old (plain) and new (coded) entries either way", () => {
    const newEntry: FormAnswerSnapshot[] = [
      {
        fieldId: "many",
        label: "Many",
        type: "picturechoice",
        value: ["Pearl Gold (#610)"],
      },
    ];
    const oldEntry: FormAnswerSnapshot[] = [
      {
        fieldId: "many",
        label: "Many",
        type: "picturechoice",
        value: ["Pearl Gold"],
      },
    ];
    for (const entry of [newEntry, oldEntry]) {
      expect(
        snapshotMatchesFieldFilter(entry, "many", "Pearl Gold (#610)"),
      ).toBe(true);
      expect(snapshotMatchesFieldFilter(entry, "many", "pearl gold")).toBe(
        true,
      );
      expect(snapshotMatchesFieldFilter(entry, "many", "Red (#010)")).toBe(
        false,
      );
    }
    expect(stripAnswerCode("Pearl Gold (#610)")).toBe("Pearl Gold");
    expect(stripAnswerCode("Pearl Gold")).toBe("Pearl Gold");
    expect(stripAnswerCode("Pearl (#1) Gold")).toBe("Pearl (#1) Gold");
  });
});

describe("getConfirmationEmail", () => {
  it("returns the confirmation field's answer", () => {
    expect(getConfirmationEmail(definition, { email: "a@b.co" })).toBe(
      "a@b.co",
    );
    expect(getConfirmationEmail(definition, { email: null })).toBeNull();
  });

  it("returns null when no confirmation field is set", () => {
    const noConfirm: FormDefinition = {
      ...definition,
      settings: { ...definition.settings, confirmationFieldId: null },
    };
    expect(getConfirmationEmail(noConfirm, { email: "a@b.co" })).toBeNull();
  });

  it("returns null when the field is not an email field", () => {
    const wrong: FormDefinition = {
      ...definition,
      fields: fields.map(
        (f): FormField =>
          f.id === "email" ? { ...f, type: "text", maxLength: 500 } : f,
      ),
    };
    expect(getConfirmationEmail(wrong, { email: "a@b.co" })).toBeNull();
  });
});
