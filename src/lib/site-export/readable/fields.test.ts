import { describe, expect, it } from "vitest";

import { ctx } from "./fixtures";
import {
  isEmptyFieldValue,
  renderFieldPage,
  renderFieldValue,
  selectFieldPages,
} from "./fields";
import type { FieldRegistry } from "./types";

const registry: FieldRegistry = {
  templateId: "t",
  templateLabel: "T",
  resolved: true,
  groupTitles: { "homepage.hero": "Hero", "homepage.steps": "Steps" },
  pageTitles: { homepage: "Homepage", about: "About" },
  retiredKeys: new Set(["t.old.key"]),
  fields: [
    { key: "t.homepage.hero-title", label: "Headline", type: "text", page: "homepage", group: "homepage.hero" },
    { key: "t.homepage.hero-sub", label: "Subhead", type: "textarea", page: "homepage", group: "homepage.hero" },
    { key: "t.homepage.hero-image", label: "Hero photo", type: "image", page: "homepage", group: "homepage.hero" },
    {
      key: "t.homepage.steps",
      label: "Steps",
      type: "list",
      page: "homepage",
      group: "homepage.steps",
      itemSchema: [
        { key: "title", label: "Step title", type: "text" },
        { key: "image", label: "Step photo", type: "image" },
        { key: "note", label: "Note", type: "text" },
      ],
    },
    { key: "t.about.body", label: "Story", type: "richtext", page: "about" },
    { key: "t.about.empty", label: "Unused", type: "text", page: "about" },
  ],
};

const saved = {
  _sp: { sections: {} },
  "t.homepage.hero-title": "Dream it <b>big</b>",
  "t.homepage.hero-sub": "   ",
  "t.homepage.hero-image": "https://cdn.example.com/b/hero.jpg",
  "t.homepage.steps": [
    { _id: "a", title: "One", image: "https://cdn.example.com/b/hero.jpg", note: "" },
    { _id: "b", title: "", image: "", note: "" },
    { _id: "c", title: "Three", image: "", note: "" },
  ],
  "t.about.body": {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Our story" }] }],
  },
  "t.about.empty": "",
  "t.old.key": "retired value",
  "other.thing.label": "Leftover",
};

describe("selectFieldPages", () => {
  const pages = selectFieldPages(registry, saved);

  it("keeps only pages/fields with content, homepage first, plus an 'other' page", () => {
    expect(pages.map((p) => p.title)).toEqual([
      "Home page sections",
      "About page sections",
      "Other saved content",
    ]);
    const hero = pages[0]!.groups.find((g) => g.id === "homepage.hero")!;
    expect(hero.title).toBe("Hero");
    expect(hero.fields.map((f) => f.def.label)).toEqual(["Headline", "Hero photo"]);
  });

  it("skips retired keys and editor metadata but keeps unknown keys", () => {
    const other = pages[2]!;
    const labels = other.groups.flatMap((g) => g.fields.map((f) => f.def.label));
    expect(labels).toEqual(["Label"]);
    expect(other.groups[0]!.title).toBe("Other › Thing");
  });

  it("falls back to inferred labels when the template is unresolved", () => {
    const out = selectFieldPages(
      { ...registry, fields: [], resolved: false },
      { "dream.homepage.hero-heading": "Hi" },
    );
    expect(out).toHaveLength(1);
    expect(out[0]!.note).toContain("could not be matched");
    expect(out[0]!.groups[0]!.title).toBe("Dream › Homepage");
    expect(out[0]!.groups[0]!.fields[0]!.def.label).toBe("Hero heading");
  });
});

describe("renderFieldPage", () => {
  const pages = selectFieldPages(registry, saved);
  const home = renderFieldPage(pages[0]!, ctx, "Pages/Home page sections.html");

  it("renders label → value rows, escaped, with empty values dropped", () => {
    expect(home).toContain("<h2>Hero</h2>");
    expect(home).toContain("Dream it &lt;b&gt;big&lt;/b&gt;");
    expect(home).not.toContain("Subhead");
  });

  it("rewrites image fields to local relative paths", () => {
    expect(home).toContain('src="../Photos/Pages/hero.jpg"');
  });

  it("renders list fields as tables without empty rows or columns", () => {
    expect(home).toContain("<h3>Steps</h3><table>");
    expect(home).toContain('<th scope="col">Step title</th>');
    expect(home).toContain('<th scope="col">Step photo</th>');
    expect(home).not.toContain("Note</th>");
    expect(home).toContain("<td>One</td>");
    expect(home).toContain("<td>Three</td>");
    const table = home.slice(home.indexOf("<h3>Steps</h3>"));
    expect((table.match(/<tr>/g) ?? []).length).toBe(3); // header + 2 rows
  });

  it("renders rich text fields as HTML", () => {
    const about = renderFieldPage(pages[1]!, ctx, "Pages/About page sections.html");
    expect(about).toContain("<h3>Story</h3>");
    expect(about).toContain("Our story");
  });
});

describe("isEmptyFieldValue", () => {
  it("handles each value shape", () => {
    expect(isEmptyFieldValue({ key: "k", label: "k", type: "text" }, " ")).toBe(true);
    expect(isEmptyFieldValue({ key: "k", label: "k", type: "list" }, [{ _id: "x", a: "" }])).toBe(true);
    expect(isEmptyFieldValue({ key: "k", label: "k", type: "list" }, [{ a: "x" }])).toBe(false);
    expect(
      isEmptyFieldValue({ key: "k", label: "k", type: "richtext" }, { type: "doc", content: [{ type: "paragraph" }] }),
    ).toBe(true);
    expect(isEmptyFieldValue({ key: "k", label: "k", type: "boolean" }, "false")).toBe(false);
  });
});

describe("url fields", () => {
  const urlRegistry: FieldRegistry = {
    ...registry,
    fields: [
      { key: "t.about.cta-link", label: "Button link", type: "url", page: "about" },
      { key: "t.about.ext-link", label: "Partner link", type: "url", page: "about" },
      { key: "t.about.proto-link", label: "CDN link", type: "url", page: "about" },
    ],
  };
  const page = selectFieldPages(urlRegistry, {
    "t.about.cta-link": "/shop",
    "t.about.ext-link": "https://partner.example.com/x",
    "t.about.proto-link": "//cdn.example.com/a",
  })[0]!;
  const html = renderFieldPage(page, ctx, "Pages/About page sections.html");

  it("points site-relative links at the live site, keeping the typed text", () => {
    expect(html).toContain(`href="${ctx.business.siteUrl}/shop">/shop</a>`);
  });

  it("leaves absolute and protocol-relative links alone", () => {
    expect(html).toContain('href="https://partner.example.com/x"');
    expect(html).not.toContain(`${ctx.business.siteUrl}//cdn.example.com`);
  });
});

describe("formpicture fields", () => {
  const def = {
    key: "dream-balloons.color-source",
    label: "Colors from",
    type: "formpicture",
  };
  const refCtx = {
    ...ctx,
    refs: {
      galleries: new Map(),
      collections: new Map(),
      faqs: new Map(),
      forms: new Map([
        [
          "form1",
          {
            name: "Estimate Quote request",
            fields: new Map([["balloon-colors", "Balloon colors"]]),
          },
        ],
      ]),
    },
  };

  it("prints the form and question names", () => {
    expect(
      renderFieldValue(def, "form1:balloon-colors", refCtx, "x.html")?.html,
    ).toBe("Estimate Quote request → Balloon colors");
  });

  it("falls back to the form name, then a generic note", () => {
    expect(renderFieldValue(def, "form1:gone", refCtx, "x.html")?.html).toBe(
      "Estimate Quote request",
    );
    expect(renderFieldValue(def, "nope:gone", refCtx, "x.html")?.html).toBe(
      "A question on one of your forms",
    );
    expect(renderFieldValue(def, "", refCtx, "x.html")).toBeNull();
  });
});
