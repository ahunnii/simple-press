import { describe, expect, it } from "vitest";

import type { PictureChoiceFieldInput } from "./builder-shared";
import {
  formCreateSchema,
  makeEmptyFormScreening,
} from "~/lib/validators/form";

import {
  convertFieldType,
  describeFieldTypeChangeImpact,
  makeEmptyBuilderDefinition,
  makeField,
  makePictureOption,
  makeScreeningLink,
  makeScreeningQuestion,
  normalizeBuilderDefinition,
  pictureGroupChangeDestination,
  pictureMoveWithinSection,
  pictureOptionMatches,
  pictureSectionIndexes,
  pictureSectionKey,
  UNGROUPED_KEY,
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

/** A catalog-shaped field: two finishes plus a loose tile, interleaved. */
function catalogField(): PictureChoiceFieldInput {
  return {
    id: "balloons",
    type: "picturechoice",
    label: "Balloon colors",
    required: false,
    selection: "many",
    imageFit: "contain",
    groups: [
      { id: "pearl", label: "Pearl", description: "Soft shimmer" },
      { id: "standard", label: "Standard" },
    ],
    options: [
      {
        id: "p1",
        label: "Pearl Gold",
        code: "610",
        family: "Golds",
        groupId: "pearl",
      },
      { id: "s1", label: "White", code: "001", groupId: "standard" },
      {
        id: "p2",
        label: "Pearl Rose",
        code: "612",
        groupId: "pearl",
        hidden: true,
      },
      { id: "u1", label: "Confetti" },
    ],
  };
}

describe("picture choice groups", () => {
  const groupIds = new Set(["pearl", "standard"]);

  it("makePictureOption only writes groupId when it has one", () => {
    expect(Object.keys(makePictureOption("Red")).sort()).toEqual([
      "color",
      "id",
      "imageUrl",
      "label",
    ]);
    expect(makePictureOption("Red", "pearl").groupId).toBe("pearl");
  });

  it("files tiles with a missing or dangling group under ungrouped", () => {
    expect(pictureSectionKey({ groupId: "pearl" }, groupIds)).toBe("pearl");
    expect(pictureSectionKey({}, groupIds)).toBe(UNGROUPED_KEY);
    expect(pictureSectionKey({ groupId: null }, groupIds)).toBe(UNGROUPED_KEY);
    expect(pictureSectionKey({ groupId: "gone" }, groupIds)).toBe(
      UNGROUPED_KEY,
    );
    const { options } = catalogField();
    expect(pictureSectionIndexes(options, "pearl", groupIds)).toEqual([0, 2]);
    expect(pictureSectionIndexes(options, UNGROUPED_KEY, groupIds)).toEqual([
      3,
    ]);
  });

  it("moves within a group by swapping with the same group's neighbour", () => {
    const { options } = catalogField();
    expect(pictureMoveWithinSection(options, 2, -1, groupIds)).toEqual({
      from: 2,
      to: 0,
    });
    expect(pictureMoveWithinSection(options, 0, 1, groupIds)).toEqual({
      from: 0,
      to: 2,
    });
    expect(pictureMoveWithinSection(options, 0, -1, groupIds)).toBeNull();
    expect(pictureMoveWithinSection(options, 1, 1, groupIds)).toBeNull();
    expect(pictureMoveWithinSection(options, 3, -1, groupIds)).toBeNull();
  });

  it("a tile changing group lands at the end of that group's run", () => {
    const { options } = catalogField();
    // Confetti (3) → Pearl: after Pearl Rose (2), i.e. stays at 3.
    expect(pictureGroupChangeDestination(options, 3, "pearl", groupIds)).toBe(
      3,
    );
    // Pearl Gold (0) → Standard: after White (1) → move(0, 1).
    expect(
      pictureGroupChangeDestination(options, 0, "standard", groupIds),
    ).toBe(1);
    // White (1) → ungrouped: after Confetti (3) → move(1, 3).
    expect(
      pictureGroupChangeDestination(options, 1, UNGROUPED_KEY, groupIds),
    ).toBe(3);
    // Into an empty group: to the very end.
    expect(
      pictureGroupChangeDestination(options, 0, "empty", new Set(["empty"])),
    ).toBe(3);
  });

  it("filters on label or code, with or without the #", () => {
    const tile = { label: "Pearl Gold", code: "610" };
    expect(pictureOptionMatches(tile, "gold")).toBe(true);
    expect(pictureOptionMatches(tile, "#61")).toBe(true);
    expect(pictureOptionMatches(tile, "610")).toBe(true);
    expect(pictureOptionMatches(tile, "#")).toBe(false);
    expect(pictureOptionMatches({ label: "Red" }, "610")).toBe(false);
    expect(pictureOptionMatches(tile, "  ")).toBe(true);
  });

  it("changing type drops codes, families, groups, hidden and image fit", () => {
    const field = catalogField();
    const radio = convertFieldType(field, "radio");
    if (radio.type !== "radio") throw new Error("wrong type");
    expect(radio.options).toEqual([
      { id: "p1", label: "Pearl Gold" },
      { id: "s1", label: "White" },
      { id: "p2", label: "Pearl Rose" },
      { id: "u1", label: "Confetti" },
    ]);
    expect("groups" in radio).toBe(false);
    expect("imageFit" in radio).toBe(false);

    const text = convertFieldType(field, "text");
    expect("options" in text).toBe(false);
    expect("groups" in text).toBe(false);

    expect(describeFieldTypeChangeImpact(field, "select", null)).toEqual({
      optionsDiscarded: false,
      picturesDiscarded: true,
      hiddenRevealed: true,
      tooManyOptions: false,
      wasConfirmationTarget: false,
    });
  });

  it("a catalog too long for a dropdown converts, then fails validation (no crash)", () => {
    const field = catalogField();
    field.options = Array.from({ length: 106 }, (_, i) => ({
      id: `c${i}`,
      label: `Color ${i}`,
      code: String(i).padStart(3, "0"),
      groupId: i % 2 ? "pearl" : "standard",
    }));
    expect(
      describeFieldTypeChangeImpact(field, "checkboxes", null).tooManyOptions,
    ).toBe(true);

    const converted = convertFieldType(field, "checkboxes");
    if (converted.type !== "checkboxes") throw new Error("wrong type");
    expect(converted.options).toHaveLength(106);

    const definition = makeEmptyBuilderDefinition();
    definition.fields = [converted];
    const result = formCreateSchema.safeParse({
      name: "Quote",
      published: false,
      definition,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toContain(
      "A field can have at most 30 options",
    );
  });

  it("normalize leaves the new optional keys alone (no undefined keys)", () => {
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
    if (field?.type !== "picturechoice") throw new Error("wrong type");
    for (const key of ["groups", "imageFit"]) expect(key in field).toBe(false);
    for (const option of field.options) {
      for (const key of ["code", "family", "groupId", "hidden"]) {
        expect(key in option).toBe(false);
      }
    }
  });

  it("a grouped catalog field passes the create schema", () => {
    const definition = makeEmptyBuilderDefinition();
    definition.fields = [catalogField()];
    expect(
      formCreateSchema.safeParse({ name: "Q", published: false, definition })
        .success,
    ).toBe(true);
  });
});

describe("screening in the builder", () => {
  it("a fresh definition carries a disabled, fully-filled screening block", () => {
    expect(makeEmptyBuilderDefinition().settings?.screening).toEqual(
      makeEmptyFormScreening(),
    );
  });

  it("normalize fills screening on a stored definition that predates it", () => {
    const definition = makeEmptyBuilderDefinition();
    const settings = { ...definition.settings };
    delete settings.screening;
    const stored = { ...definition, settings };
    const screening = normalizeBuilderDefinition(stored).settings?.screening;
    expect(screening).toEqual(makeEmptyFormScreening());
  });

  it("normalize keeps stored screening and fills missing question keys", () => {
    const definition = makeEmptyBuilderDefinition();
    definition.settings = {
      ...definition.settings,
      screening: {
        ...makeEmptyFormScreening(),
        enabled: true,
        intro: "Hi",
        questions: [
          {
            id: "q1",
            prompt: "Over 18?",
            passAnswer: "no",
            failMessage: "",
            failLinks: [{ label: "Help", href: "/help" }],
          },
        ],
      },
    };
    const screening =
      normalizeBuilderDefinition(definition).settings?.screening;
    expect(screening).toMatchObject({ enabled: true, intro: "Hi" });
    expect(screening?.questions?.[0]).toMatchObject({
      id: "q1",
      passAnswer: "no",
      failLinks: [{ label: "Help", href: "/help" }],
    });
  });

  it("a new question is explicit and unique; a link starts blank", () => {
    const first = makeScreeningQuestion();
    expect(first).toMatchObject({
      prompt: "",
      passAnswer: "yes",
      failMessage: "",
      failLinks: [],
    });
    expect(makeScreeningQuestion().id).not.toBe(first.id);
    expect(makeScreeningLink()).toEqual({ label: "", href: "" });
  });

  it("enabled screening with no questions fails at the questions path", () => {
    const definition = makeEmptyBuilderDefinition();
    definition.fields = [makeField("text")];
    if (definition.fields[0]) definition.fields[0].label = "Name";
    definition.settings = {
      ...definition.settings,
      screening: { ...makeEmptyFormScreening(), enabled: true },
    };
    const result = formCreateSchema.safeParse({
      name: "Q",
      published: false,
      definition,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain(
      "definition.settings.screening.questions",
    );
  });
});
