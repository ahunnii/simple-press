import { describe, expect, it } from "vitest";

import type { FormField } from "~/lib/validators/form";
import { formDefinitionSchema } from "~/lib/validators/form";

import {
  buildPicturePrefillParam,
  parsePicturePrefill,
  PICTURE_PREFILL_PARAM,
} from "./prefill";

const tiles = [
  { id: "a", label: "A" },
  { id: "b", label: "B" },
  { id: "c", label: "C" },
  { id: "d", label: "D", hidden: true },
  { id: "e", label: "E" },
];

const fields: FormField[] = formDefinitionSchema.parse({
  version: 1,
  fields: [
    { id: "name", type: "text", label: "Name" },
    { id: "one", type: "picturechoice", label: "One", options: tiles },
    {
      id: "many",
      type: "picturechoice",
      label: "Many",
      selection: "many",
      maxTotal: 3,
      options: tiles,
    },
    {
      id: "free",
      type: "picturechoice",
      label: "Free",
      selection: "many",
      options: tiles,
    },
    {
      id: "qty",
      type: "picturechoice",
      label: "Qty",
      selection: "quantity",
      maxTotal: 2,
      options: tiles,
    },
    {
      id: "qtyfree",
      type: "picturechoice",
      label: "Qty free",
      selection: "quantity",
      options: tiles,
    },
  ],
}).fields;

describe("buildPicturePrefillParam", () => {
  it("joins the field id and option ids", () => {
    expect(buildPicturePrefillParam("many", ["a", "b"])).toBe("many:a,b");
    expect(buildPicturePrefillParam("one", [])).toBe("one:");
    expect(PICTURE_PREFILL_PARAM).toBe("pick");
  });

  it("round-trips through a URL query string", () => {
    const query = new URLSearchParams();
    query.append(
      PICTURE_PREFILL_PARAM,
      buildPicturePrefillParam("many", ["c", "a"]),
    );
    expect(parsePicturePrefill(`?${query.toString()}`, fields)).toEqual({
      many: ["a", "c"],
    });
  });
});

describe("parsePicturePrefill", () => {
  it("shapes values like the renderer's defaults, per selection mode", () => {
    const search = "pick=one:b,c&pick=many:a,b&pick=qtyfree:a,e&pick=free:e,a";
    expect(parsePicturePrefill(search, fields)).toEqual({
      one: "b", // first id
      many: ["a", "b"], // option ids
      qtyfree: { a: 1, e: 1 }, // { optionId: qty }
      free: ["a", "e"],
    });
  });

  it("accepts a string with or without '?' and a URLSearchParams", () => {
    const expected = { one: "a" };
    expect(parsePicturePrefill("pick=one:a", fields)).toEqual(expected);
    expect(parsePicturePrefill("?pick=one:a", fields)).toEqual(expected);
    expect(
      parsePicturePrefill(new URLSearchParams("pick=one%3Aa"), fields),
    ).toEqual(expected);
    expect(parsePicturePrefill("", fields)).toEqual({});
  });

  it("keeps ids in definition order, de-duplicated", () => {
    expect(parsePicturePrefill("pick=free:e,a,e,c,a", fields)).toEqual({
      free: ["a", "c", "e"],
    });
  });

  it("merges repeated params for one field", () => {
    expect(parsePicturePrefill("pick=free:e&pick=free:a,e", fields)).toEqual({
      free: ["a", "e"],
    });
  });

  it("drops unknown and hidden ids, and fields left with nothing", () => {
    expect(
      parsePicturePrefill("pick=free:zzz,d,b&pick=many:d,nope", fields),
    ).toEqual({ free: ["b"] });
    expect(parsePicturePrefill("pick=one:d", fields)).toEqual({});
  });

  it("ignores non-picture fields, unknown fields and malformed params", () => {
    expect(
      parsePicturePrefill(
        "pick=name:a&pick=nope:a&pick=nocolon&pick=:a&pick=one:",
        fields,
      ),
    ).toEqual({});
  });

  it("truncates to maxTotal in many mode and caps the quantity total", () => {
    expect(parsePicturePrefill("pick=many:a,b,c,e", fields)).toEqual({
      many: ["a", "b", "c"],
    });
    expect(parsePicturePrefill("pick=qty:a,b,c", fields)).toEqual({
      qty: { a: 1, b: 1 },
    });
  });

  it("keeps the ids listed first when it truncates, in definition order", () => {
    expect(parsePicturePrefill("pick=many:e,c,b,a", fields)).toEqual({
      many: ["b", "c", "e"],
    });
    expect(parsePicturePrefill("pick=one:e,a", fields)).toEqual({ one: "e" });
  });

  it("ignores a param value over 2000 characters", () => {
    const long = `free:a,${"x,".repeat(1000)}b`;
    expect(long.length).toBeGreaterThan(2000);
    expect(
      parsePicturePrefill(
        new URLSearchParams({ pick: long }).toString(),
        fields,
      ),
    ).toEqual({});
    // A short pick beside it still applies.
    const search = new URLSearchParams();
    search.append("pick", long);
    search.append("pick", "one:c");
    expect(parsePicturePrefill(search, fields)).toEqual({ one: "c" });
  });
});
