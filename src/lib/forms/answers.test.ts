import { describe, expect, it } from "vitest";

import type { FormAnswerSnapshot } from "./answers";
import type { FormDefinition, FormField } from "~/lib/validators/form";
import { formDefinitionSchema } from "~/lib/validators/form";

import {
  formatAnswerForDisplay,
  formatAnswerOrDash,
  getConfirmationEmail,
  parseAnswersJson,
  serializeAnswers,
  snapshotMatchesFieldFilter,
  snapshotMatchesSearch,
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

const fields = definition.fields;
const field = (id: string) => fields.find((f) => f.id === id)!;

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
