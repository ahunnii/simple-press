/**
 * `loadDreamBalloonStudio` decides whether the Balloons page shows its color
 * studio or degrades to a plain Lane page. DB + flags are mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const flags = { forms: true };

vi.mock("~/server/db", () => ({ db: { form: { findUnique } } }));
vi.mock("~/lib/features/get-business-flags", () => ({
  getBusinessFlags: async () => ({
    isEnabled: (key: string) => (key === "forms" ? flags.forms : true),
  }),
}));

const { loadDreamBalloonStudio } =
  await import("./dream-balloons-service-page");

const SOURCE = { "dream-balloons.color-source": "form1:balloon-colors" };

function option(id: string, over: Record<string, unknown> = {}) {
  return { id, label: id.toUpperCase(), ...over };
}

function definition(fieldOver: Record<string, unknown> = {}) {
  return {
    version: 1,
    fields: [
      { type: "text", id: "name", label: "Name", required: false },
      {
        type: "picturechoice",
        id: "balloon-colors",
        label: "Balloon colors",
        required: false,
        selection: "many",
        maxTotal: 2,
        groups: [
          { id: "pearl", label: "Pearl", description: "Soft sheen." },
          { id: "std", label: "Standard" },
        ],
        options: [
          option("a", {
            groupId: "pearl",
            code: "610",
            color: "#d4af37",
            family: "Metallics",
          }),
          option("b", {
            groupId: "std",
            imageUrl: "https://cdn.example.com/b.webp",
          }),
          option("c", { hidden: true }),
        ],
        ...fieldOver,
      },
    ],
  };
}

beforeEach(() => {
  findUnique.mockReset();
  flags.forms = true;
  findUnique.mockResolvedValue({
    id: "form1",
    published: true,
    definition: definition(),
  });
});

describe("loadDreamBalloonStudio", () => {
  it("builds the studio from the form's visible tiles and groups", async () => {
    const studio = await loadDreamBalloonStudio("biz1", SOURCE);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "form1", businessId: "biz1" } }),
    );
    expect(studio).not.toBeNull();
    expect(studio!.fieldId).toBe("balloon-colors");
    expect(studio!.tiles.map((t) => t.id)).toEqual(["a", "b"]); // hidden "c" dropped
    expect(studio!.tiles[0]).toEqual({
      id: "a",
      label: "A",
      code: "610",
      color: "#d4af37",
      imageUrl: null,
      family: "Metallics",
      groupId: "pearl",
    });
    expect(studio!.groups).toEqual([
      {
        id: "pearl",
        label: "Pearl",
        description: "Soft sheen.",
        finish: "pearl",
      },
      { id: "std", label: "Standard", description: null, finish: "standard" },
    ]);
    // min(palette-max 6, maxTotal 2)
    expect(studio!.max).toBe(2);
    expect(studio!.heading).toBe("Build your balloon palette");
    expect(studio!.ctaUrl).toBe("/estimate");
    expect(studio!.storageKey).toBe(
      "dream-balloon-palette:form1:balloon-colors",
    );
  });

  it("caps the palette by palette-max and maxTotal", async () => {
    findUnique.mockResolvedValue({
      id: "form1",
      published: true,
      definition: definition({
        maxTotal: 3,
        options: Array.from({ length: 10 }, (_, i) => option(`t${i}`)),
      }),
    });
    expect(
      (await loadDreamBalloonStudio("biz1", {
        ...SOURCE,
        "dream-balloons.palette-max": "5",
      }))!.max,
    ).toBe(3);
    expect(
      (await loadDreamBalloonStudio("biz1", {
        ...SOURCE,
        "dream-balloons.palette-max": "2",
      }))!.max,
    ).toBe(2);
  });

  it.each([
    [
      "the switch is off",
      { ...SOURCE, "dream-balloons.studio-visible": "false" },
    ],
    ["no color source is picked", {}],
    [
      "the color source is malformed",
      { "dream-balloons.color-source": "form1" },
    ],
  ])("returns null when %s", async (_label, fields) => {
    expect(await loadDreamBalloonStudio("biz1", fields)).toBeNull();
  });

  it("returns null when Forms is off", async () => {
    flags.forms = false;
    expect(await loadDreamBalloonStudio("biz1", SOURCE)).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns null for a missing or unpublished form", async () => {
    findUnique.mockResolvedValueOnce(null);
    expect(await loadDreamBalloonStudio("biz1", SOURCE)).toBeNull();
    findUnique.mockResolvedValueOnce({
      id: "form1",
      published: false,
      definition: definition(),
    });
    expect(await loadDreamBalloonStudio("biz1", SOURCE)).toBeNull();
  });

  it("returns null when the field is gone or isn't picture choice", async () => {
    expect(
      await loadDreamBalloonStudio("biz1", {
        "dream-balloons.color-source": "form1:gone",
      }),
    ).toBeNull();
    expect(
      await loadDreamBalloonStudio("biz1", {
        "dream-balloons.color-source": "form1:name",
      }),
    ).toBeNull();
  });

  it("returns null for a corrupt definition", async () => {
    findUnique.mockResolvedValueOnce({
      id: "form1",
      published: true,
      definition: { fields: "nope" },
    });
    expect(await loadDreamBalloonStudio("biz1", SOURCE)).toBeNull();
  });
});
