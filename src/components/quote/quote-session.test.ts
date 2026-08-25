import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { QuoteAnswerMap, QuoteContact } from "./quote-answers";
import type { PublicQuoteCalculatorDefinition } from "~/lib/validators/quote-calculator";

import {
  clearQuoteSession,
  hasQuoteSessionContent,
  loadQuoteSession,
  saveQuoteSession,
} from "./quote-session";

/**
 * Draft persistence, tested where the interesting failures actually are: the
 * READ path.
 *
 * A draft is written by one version of a calculator and read back by whatever
 * version exists when the visitor returns to the tab. Everything here is about
 * what happens when those two disagree — a deleted question, a renamed option,
 * a question whose type the owner changed — plus the storage failures every
 * function has to survive (no window at all, unreadable JSON, a version this
 * build has never heard of).
 *
 * Runs in the node environment, so there is no `window` and no `sessionStorage`
 * until one is stubbed in. That is deliberate: the first test asserts the SSR
 * guard using the environment as it comes, and the rest install a fake.
 */

const STORAGE_KEY = "sp-quote-session:calc-1";

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, value),
  };
}

let storage: ReturnType<typeof createMemoryStorage>;

/**
 * A definition with one question of each answer KIND, since that is what
 * `sanitizeAnswer` switches on: single (choice), multi (multiselect), value
 * (number) and address.
 */
const definition: Pick<PublicQuoteCalculatorDefinition, "screens"> = {
  screens: [
    {
      id: "s-1",
      title: null,
      description: null,
      questions: [
        {
          id: "q-move",
          type: "choice",
          title: "What kind of move?",
          description: null,
          required: true,
          showIf: null,
          options: [
            { id: "o-local", label: "Local", icon: null },
            { id: "o-long", label: "Long distance", icon: null },
          ],
        },
        {
          id: "q-extras",
          type: "multiselect",
          title: "Add-ons",
          description: null,
          required: false,
          showIf: null,
          options: [
            { id: "o-packing", label: "Packing", icon: null },
            { id: "o-storage", label: "Storage", icon: null },
          ],
        },
      ],
    },
    {
      id: "s-2",
      title: null,
      description: null,
      questions: [
        {
          id: "q-bedrooms",
          type: "number",
          title: "Bedrooms",
          description: null,
          required: true,
          showIf: null,
          min: 0,
          max: 20,
          unitLabel: null,
        },
        {
          id: "q-from",
          type: "address",
          title: "Pickup address",
          description: null,
          required: true,
          showIf: null,
        },
      ],
    },
  ],
};

const answers: QuoteAnswerMap = {
  "q-move": { kind: "single", optionId: "o-local" },
  "q-extras": { kind: "multi", optionIds: ["o-packing", "o-storage"] },
  "q-bedrooms": { kind: "value", raw: "3" },
  "q-from": {
    kind: "address",
    line1: "123 Main St",
    line2: "",
    city: "Saginaw",
    state: "MI",
    zip: "48601",
  },
};

const contact: QuoteContact = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "313-555-0143",
};

/** Write a raw payload the way a stale or hand-edited tab would have. */
function seed(payload: unknown) {
  storage.setItem(
    STORAGE_KEY,
    typeof payload === "string" ? payload : JSON.stringify(payload),
  );
}

describe("quote-session without a window", () => {
  it("no-ops rather than throwing when there is no storage at all", () => {
    // Server render, or a browser that refuses the property outright.
    expect(() => saveQuoteSession("calc-1", answers, contact)).not.toThrow();
    expect(() => clearQuoteSession("calc-1")).not.toThrow();
    expect(loadQuoteSession("calc-1", definition)).toBeNull();
  });
});

describe("quote-session", () => {
  beforeEach(() => {
    storage = createMemoryStorage();
    vi.stubGlobal("window", { sessionStorage: storage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips every answer kind and the contact details", () => {
    saveQuoteSession("calc-1", answers, contact);

    expect(loadQuoteSession("calc-1", definition)).toEqual({
      answers,
      contact,
    });
  });

  it("keeps one draft per calculator", () => {
    saveQuoteSession("calc-1", answers, contact);

    // A page can embed two calculators; neither may read the other's draft.
    expect(loadQuoteSession("calc-2", definition)).toBeNull();
  });

  it("clears the key on request", () => {
    saveQuoteSession("calc-1", answers, contact);
    clearQuoteSession("calc-1");

    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadQuoteSession("calc-1", definition)).toBeNull();
  });

  it("drops an answer whose question no longer exists", () => {
    seed({
      v: 1,
      answers: {
        ...answers,
        "q-deleted": { kind: "value", raw: "orphan" },
      },
      contact,
    });

    const restored = loadQuoteSession("calc-1", definition);
    expect(restored?.answers).toEqual(answers);
  });

  it("drops an answer whose kind no longer matches the question type", () => {
    // The owner turned "What kind of move?" from a choice into something the
    // runner reads as a raw value. Restoring the old `single` answer would put
    // an option id into a text box.
    seed({
      v: 1,
      answers: { ...answers, "q-move": { kind: "value", raw: "o-local" } },
      contact,
    });

    const restored = loadQuoteSession("calc-1", definition);
    expect(restored?.answers["q-move"]).toBeUndefined();
    expect(restored?.answers["q-bedrooms"]).toEqual({
      kind: "value",
      raw: "3",
    });
  });

  it("drops a single-choice answer pointing at a deleted option", () => {
    seed({
      v: 1,
      answers: { ...answers, "q-move": { kind: "single", optionId: "o-gone" } },
      contact,
    });

    const restored = loadQuoteSession("calc-1", definition);
    // Silently unselected rather than restored: the server would refuse the
    // submission as `unknown-option`, and the card would render nothing
    // selected while the answer map insisted otherwise.
    expect(restored?.answers["q-move"]).toBeUndefined();
  });

  it("filters a multiselect down to the options that still exist", () => {
    seed({
      v: 1,
      answers: {
        ...answers,
        "q-extras": {
          kind: "multi",
          optionIds: ["o-packing", "o-gone", "o-packing"],
        },
      },
      contact,
    });

    const restored = loadQuoteSession("calc-1", definition);
    // One deleted add-on must not cost the visitor the one they still have.
    expect(restored?.answers["q-extras"]).toEqual({
      kind: "multi",
      optionIds: ["o-packing"],
    });
  });

  it("drops a multiselect left with nothing after filtering", () => {
    seed({
      v: 1,
      answers: { ...answers, "q-extras": { kind: "multi", optionIds: ["x"] } },
      contact,
    });

    expect(loadQuoteSession("calc-1", definition)?.answers["q-extras"]).toBe(
      undefined,
    );
  });

  it("returns null for unreadable JSON", () => {
    seed("{ not json at all");

    expect(loadQuoteSession("calc-1", definition)).toBeNull();
  });

  it("returns null for a version this build does not know", () => {
    seed({ v: 2, answers, contact });

    expect(loadQuoteSession("calc-1", definition)).toBeNull();
  });

  it("returns null for a payload that is not a session at all", () => {
    seed(["not", "a", "session"]);
    expect(loadQuoteSession("calc-1", definition)).toBeNull();

    seed({ v: 1, answers: "nope", contact });
    expect(loadQuoteSession("calc-1", definition)).toBeNull();
  });

  it("returns null when nothing at all survived validation", () => {
    // Every answer belongs to a deleted question and the contact is blank, so
    // there is no draft left to restore — the caller must not be handed an
    // empty one to "restore".
    seed({
      v: 1,
      answers: { "q-deleted": { kind: "value", raw: "x" } },
      contact: { name: "", email: "", phone: "" },
    });

    expect(loadQuoteSession("calc-1", definition)).toBeNull();
  });

  it("trims and caps the contact details to the submit schema's maxima", () => {
    seed({
      v: 1,
      answers,
      contact: {
        name: `  ${"a".repeat(200)}  `,
        email: "  ada@example.com  ",
        phone: "1".repeat(60),
      },
    });

    const restored = loadQuoteSession("calc-1", definition);
    // 120 / 254 / 30 — the same bounds `quoteSubmitSchema` enforces, applied
    // here so a restored draft can never be the reason a submission is refused.
    expect(restored?.contact.name).toHaveLength(120);
    expect(restored?.contact.email).toBe("ada@example.com");
    expect(restored?.contact.phone).toHaveLength(30);
  });

  it("caps a free-text answer and the address subfields", () => {
    seed({
      v: 1,
      answers: {
        "q-bedrooms": { kind: "value", raw: "9".repeat(5000) },
        "q-from": {
          kind: "address",
          line1: "x".repeat(500),
          line2: 42,
          city: "y".repeat(500),
          state: "michigan",
          zip: "486011234567890",
        },
      },
      contact,
    });

    const restored = loadQuoteSession("calc-1", definition);
    const bedrooms = restored?.answers["q-bedrooms"];
    expect(bedrooms?.kind === "value" && bedrooms.raw).toHaveLength(2000);

    const address = restored?.answers["q-from"];
    expect(address?.kind === "address" && address.line1).toHaveLength(120);
    // A non-string subfield degrades to "" rather than poisoning the field.
    expect(address?.kind === "address" && address.line2).toBe("");
    expect(address?.kind === "address" && address.city).toHaveLength(80);
    expect(address?.kind === "address" && address.state).toBe("mi");
    expect(address?.kind === "address" && address.zip).toHaveLength(10);
  });

  it("survives a storage that throws on write", () => {
    vi.stubGlobal("window", {
      sessionStorage: {
        ...storage,
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
      },
    });

    // Safari private mode. A draft that cannot be saved is not an error the
    // visitor should ever hear about.
    expect(() => saveQuoteSession("calc-1", answers, contact)).not.toThrow();
  });
});

describe("hasQuoteSessionContent", () => {
  const blank: QuoteContact = { name: "", email: "", phone: "" };

  it("is false for an empty draft", () => {
    expect(hasQuoteSessionContent({}, blank)).toBe(false);
  });

  it("is false for answers that are present but empty", () => {
    // Typing into a field and deleting it again leaves a key behind. That is
    // not something a visitor would be annoyed to lose, so "Start over" stays
    // hidden and no draft is written.
    expect(
      hasQuoteSessionContent(
        {
          "q-bedrooms": { kind: "value", raw: "   " },
          "q-move": { kind: "single", optionId: "" },
          "q-extras": { kind: "multi", optionIds: [] },
          "q-from": {
            kind: "address",
            line1: "",
            line2: "",
            city: "",
            state: "",
            zip: "",
          },
        },
        blank,
      ),
    ).toBe(false);
  });

  it("is true for any real answer", () => {
    expect(
      hasQuoteSessionContent(
        { "q-move": { kind: "single", optionId: "o-local" } },
        blank,
      ),
    ).toBe(true);
  });

  it("is true for contact details alone", () => {
    expect(hasQuoteSessionContent({}, { ...blank, email: "a@b.co" })).toBe(
      true,
    );
  });
});
