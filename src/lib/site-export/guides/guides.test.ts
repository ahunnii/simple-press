import { describe, expect, it } from "vitest";
import { buildGuides, buildStartHere } from "./index";
import { existingPaths, linkedZipPaths, makeSummary } from "./fixtures";

const EXPECTED_GUIDES = [
  "Guides/Moving to WordPress.html",
  "Guides/Moving to Shopify.html",
  "Guides/Moving to Wix.html",
  "Guides/Moving to Squarespace.html",
  "Guides/Moving to Square Online.html",
  "Guides/Hiring a designer or developer.html",
  "Guides/Keeping your domain name.html",
  "Guides/Payments, customers and subscriptions.html",
];

const text = (f: { contents: string | Uint8Array }) => String(f.contents);

describe("buildGuides", () => {
  it("produces the eight guides at the documented paths", () => {
    expect(buildGuides(makeSummary()).map((f) => f.path)).toEqual(EXPECTED_GUIDES);
  });

  it("only links to paths that exist in the export", () => {
    const summary = makeSummary();
    const exists = existingPaths(summary, EXPECTED_GUIDES);
    for (const file of [...buildGuides(summary), buildStartHere(summary)]) {
      for (const p of linkedZipPaths(file.path, text(file))) {
        expect(exists, `${file.path} links to missing ${p}`).toContain(p);
      }
    }
  });

  it("does not link to import files that are absent", () => {
    const summary = makeSummary({ importFiles: [], documents: [] });
    const exists = existingPaths(summary, EXPECTED_GUIDES);
    for (const file of buildGuides(summary)) {
      const html = text(file);
      expect(html).not.toContain("Import%20files/");
      for (const p of linkedZipPaths(file.path, html)) expect(exists).toContain(p);
    }
    const shopify = text(buildGuides(summary)[1]!);
    expect(shopify).toContain("Add your products by hand");
    expect(shopify.toLowerCase()).not.toContain("upload and continue");
  });

  it("only links to the import files that exist", () => {
    const summary = makeSummary({ importFiles: ["Import files/Wix/products.csv"] });
    const guides = buildGuides(summary);
    expect(text(guides[2]!)).toContain("Import%20files/Wix/products.csv");
    expect(text(guides[1]!)).not.toContain("Shopify/products.csv");
    expect(text(guides[0]!)).not.toContain("content.wxr.xml");
  });

  it("escapes the business name everywhere", () => {
    const summary = makeSummary();
    for (const file of [...buildGuides(summary), buildStartHere(summary)]) {
      const html = text(file);
      expect(html).not.toContain("<Bakery>");
      expect(html).toContain("Tom &amp; Jerry&#39;s &lt;Bakery&gt;");
    }
  });

  it("uses breadcrumbs Guides to title", () => {
    const html = text(buildGuides(makeSummary())[0]!);
    expect(html).toContain("<span>Guides</span>");
    expect(html).toContain("<span>Moving to WordPress</span>");
  });

  it("handles the custom domain vs subdomain cases", () => {
    const withDomain = text(buildGuides(makeSummary())[6]!);
    expect(withDomain).toContain("tomjerrys.com");
    expect(withDomain).toContain("48 hours");
    const without = text(
      buildGuides(makeSummary({ hasCustomDomain: false, business: { ...makeSummary().business, customDomain: null } }))[6]!,
    );
    expect(without).toContain("https://tom-jerry.simplepress.example");
    expect(without).toContain("cannot be moved");
  });

  it("warns about subscriptions only when there are some, and explains Stripe", () => {
    const payments = text(buildGuides(makeSummary())[7]!);
    expect(payments).toContain("your own Stripe account");
    expect(payments).toContain("4 subscriptions");
    const none = text(
      buildGuides(makeSummary({ counts: { ...makeSummary().counts, subscriptions: 0 } }))[7]!,
    );
    expect(none).not.toContain("You have");
  });

  it("mentions AGPL-3.0 in the hiring guide", () => {
    expect(text(buildGuides(makeSummary())[5]!)).toContain("AGPL-3.0");
  });

  it("explains each platform's import caveats when its file is present", () => {
    const [, shopify, wix, squarespace, square] = buildGuides(makeSummary()).map(text);
    expect(shopify).toContain("Barcodes");
    expect(wix).toContain("weight unit");
    expect(squarespace).toContain("<strong>shop</strong>");
    expect(squarespace).toContain("<strong>Product Page</strong>");
    expect(squarespace).toContain("categories on the store page first");
    expect(squarespace).toContain(".jpg, .png or .gif");
    expect(squarespace).toContain("blank product template");
    expect(square).toContain("blank template");
    expect(square).toContain("pictures or stock counts");

    const none = buildGuides(makeSummary({ importFiles: [] })).map(text);
    expect(none[1]).not.toContain("Barcodes");
    expect(none[3]).not.toContain("blank product template");
    expect(none[4]).not.toContain("blank template");
  });
});

describe("buildStartHere", () => {
  it("is START HERE.html with counts, decision table and links", () => {
    const f = buildStartHere(makeSummary());
    expect(f.path).toBe("START HERE.html");
    const html = text(f);
    expect(html).toContain("ready to take anywhere");
    expect(html).toContain("23 products");
    expect(html).toContain("3 collections");
    expect(html).toContain("112 photos");
    expect(html).toContain("Which option is right for me?");
    for (const name of ["Square Online", "Wix", "Squarespace", "Shopify", "WordPress", "Hire someone"]) {
      expect(html).toContain(name);
    }
    expect(html).toContain("Guides/Moving%20to%20Square%20Online.html");
  });

  it("includes the privacy callout about customers' personal information", () => {
    const html = text(buildStartHere(makeSummary()));
    expect(html).toContain("personal information");
    expect(html).toContain("do not share it publicly");
  });

  it("lists external images with a rights warning, escaped", () => {
    const html = text(buildStartHere(makeSummary()));
    expect(html).toContain("right to reuse");
    expect(html).toContain("https://images.example.com/a.jpg?x=1&amp;y=2");
    expect(html).toContain("https://images.example.com/b.jpg");
    expect(html).toContain("not saved");
  });

  it("shows notes, escaped", () => {
    const html = text(buildStartHere(makeSummary()));
    expect(html).toContain("3 photos could not be downloaded &lt;check&gt;");
  });

  it("omits empty sections cleanly", () => {
    const html = text(
      buildStartHere(
        makeSummary({ documents: [], spreadsheets: [], notes: [], externalImages: [], importFiles: [] }),
      ),
    );
    expect(html).not.toContain("Your readable documents");
    expect(html).not.toContain("Pictures from other websites");
    expect(html).not.toContain("<h2>Notes</h2>");
  });
});

describe("extraFolders (sp-site-snapshot pictures)", () => {
  const extraFolders = [
    {
      dir: "Website pictures",
      what: "Pictures of every page of your website.",
      links: [
        { label: "the site book", path: "Website pictures/site-book.pdf" },
        { label: "the style guide", path: "Website pictures/style-guide.pdf" },
      ],
    },
  ];

  it("lists the folder on START HERE and links its files", () => {
    const summary = makeSummary({ extraFolders });
    const start = buildStartHere(summary);
    const html = String(start.contents);
    expect(html).toContain("<strong>Website pictures</strong>");
    const linked = linkedZipPaths(start.path, html);
    expect(linked).toContain("Website pictures/site-book.pdf");
    expect(linked).toContain("Website pictures/style-guide.pdf");
  });

  it("mentions the folder in the hiring guide", () => {
    const summary = makeSummary({ extraFolders });
    const hiring = buildGuides(summary).find((f) => f.path.includes("Hiring"))!;
    expect(linkedZipPaths(hiring.path, String(hiring.contents))).toContain(
      "Website pictures/style-guide.pdf",
    );
  });

  it("adds nothing when there are no extra folders", () => {
    const html = String(buildStartHere(makeSummary()).contents);
    expect(html).not.toContain("Website pictures");
  });
});
