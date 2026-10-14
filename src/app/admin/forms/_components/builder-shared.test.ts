import { describe, expect, it } from "vitest";

import { formCreateSchema } from "~/lib/validators/form";

import {
  convertFieldType,
  describeFieldTypeChangeImpact,
  makeEmptyBuilderDefinition,
  makeField,
  normalizeBuilderDefinition,
} from "./builder-shared";

describe("picture choice in the builder", () => {
  it("makeField starts with two labelled tiles and explicit nulls", () => {
    const field = makeField("picturechoice");
    if (field.type !== "picturechoice") throw new Error("wrong type");
    expect(field.options).toHaveLength(2);
    expect(field.options[0]).toMatchObject({
      label: "Option 1",
      color: null,
      imageUrl: null,
    });
    expect(field.selection).toBe("one");
    expect(field.minTotal).toBeNull();
  });

  it("converts choice <-> picture choice keeping ids and labels", () => {
    const radio = makeField("radio");
    if (radio.type !== "radio") throw new Error("wrong type");
    radio.options = [
      { id: "a", label: "Red" },
      { id: "b", label: "Gold" },
    ];

    const picture = convertFieldType(radio, "picturechoice");
    if (picture.type !== "picturechoice") throw new Error("wrong type");
    expect(picture.options).toEqual([
      { id: "a", label: "Red", color: null, imageUrl: null },
      { id: "b", label: "Gold", color: null, imageUrl: null },
    ]);
    expect(picture.id).toBe(radio.id);

    picture.options[0] = { ...picture.options[0]!, color: "#ff0000" };
    const back = convertFieldType(picture, "checkboxes");
    if (back.type !== "checkboxes") throw new Error("wrong type");
    expect(back.options).toEqual([
      { id: "a", label: "Red" },
      { id: "b", label: "Gold" },
    ]);
  });

  it("starts from fresh tiles when converting a text field", () => {
    const next = convertFieldType(makeField("text"), "picturechoice");
    if (next.type !== "picturechoice") throw new Error("wrong type");
    expect(next.options).toHaveLength(2);
  });

  it("warns about colors and photos only when leaving for a choice type", () => {
    const picture = makeField("picturechoice");
    expect(describeFieldTypeChangeImpact(picture, "radio", null)).toMatchObject(
      { picturesDiscarded: true, optionsDiscarded: false },
    );
    expect(describeFieldTypeChangeImpact(picture, "text", null)).toMatchObject({
      picturesDiscarded: false,
      optionsDiscarded: true,
    });
    expect(
      describeFieldTypeChangeImpact(makeField("radio"), "picturechoice", null),
    ).toMatchObject({ picturesDiscarded: false, optionsDiscarded: false });
  });

  it("normalize fills the keys a stored definition drops", () => {
    const definition = makeEmptyBuilderDefinition();
    definition.fields = [
      {
        id: "f1",
        type: "picturechoice",
        label: "Colors",
        required: false,
        options: [
          { id: "a", label: "Red" },
          { id: "b", label: "Gold" },
        ],
      },
    ];
    const [field] = normalizeBuilderDefinition(definition).fields;
    expect(field).toMatchObject({
      selection: "one",
      tileSize: "small",
      showLabels: true,
      referenceImageUrl: null,
      minTotal: null,
      maxTotal: null,
    });
    if (field?.type !== "picturechoice") throw new Error("wrong type");
    expect(field.options[0]).toMatchObject({ color: null, imageUrl: null });
  });

  it("a freshly made field passes the create schema once labelled", () => {
    const definition = makeEmptyBuilderDefinition();
    definition.fields = [{ ...makeField("picturechoice"), label: "Colors" }];
    const result = formCreateSchema.safeParse({
      name: "Test",
      published: false,
      definition,
    });
    expect(result.success).toBe(true);
  });
});
