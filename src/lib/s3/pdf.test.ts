import { describe, expect, it } from "vitest";

import {
  documentDisplayName,
  documentLinkText,
  documentSlugFromKey,
  hasPdfSignature,
  isLibraryDocumentKey,
  libraryDocumentKey,
  libraryDocumentSlug,
  pdfExtOrNull,
} from "./pdf";

describe("pdfExtOrNull", () => {
  it("accepts .pdf in any case and nothing else", () => {
    expect(pdfExtOrNull("menu.pdf")).toBe(".pdf");
    expect(pdfExtOrNull("MENU.PDF")).toBe(".pdf");
    expect(pdfExtOrNull("menu.pdf.exe")).toBeNull();
    expect(pdfExtOrNull("menu.html")).toBeNull();
    expect(pdfExtOrNull("pdf")).toBeNull();
  });
});

describe("isLibraryDocumentKey", () => {
  it("matches only {biz}/library-doc-*.pdf keys", () => {
    expect(isLibraryDocumentKey("biz1/library-doc-0123abcd.pdf")).toBe(true);
    expect(isLibraryDocumentKey("biz1/library-doc-0123abcd.PDF")).toBe(true);
    expect(isLibraryDocumentKey("biz1/library-0123abcd.pdf")).toBe(false);
    expect(isLibraryDocumentKey("biz1/library-doc-0123abcd.png")).toBe(false);
    expect(isLibraryDocumentKey("library-doc-0123abcd.pdf")).toBe(false);
  });

  it("accepts keys with and without a name slug", () => {
    expect(
      isLibraryDocumentKey(
        "biz1/library-doc-0123456789abcdef-annual-report.pdf",
      ),
    ).toBe(true);
    expect(isLibraryDocumentKey("biz1/library-doc-0123456789abcdef.pdf")).toBe(
      true,
    );
  });
});

describe("hasPdfSignature", () => {
  it("checks the %PDF- magic bytes", () => {
    expect(hasPdfSignature(new TextEncoder().encode("%PDF-1.7\n"))).toBe(true);
    expect(hasPdfSignature(new TextEncoder().encode("<html>"))).toBe(false);
    expect(hasPdfSignature(new TextEncoder().encode("%PDF"))).toBe(false);
    expect(hasPdfSignature(new Uint8Array())).toBe(false);
  });
});

describe("libraryDocumentSlug", () => {
  it("lowercases, strips the extension and dashes out spaces and punctuation", () => {
    expect(libraryDocumentSlug("Annual Report (2025).pdf")).toBe(
      "annual-report-2025",
    );
    expect(libraryDocumentSlug("  --Menu___v2--.PDF")).toBe("menu-v2");
    expect(libraryDocumentSlug("report.final.pdf")).toBe("report-final");
  });

  it("strips accents to ASCII", () => {
    expect(libraryDocumentSlug("Café Menú Été.pdf")).toBe("cafe-menu-ete");
  });

  it("is empty when nothing usable is left", () => {
    expect(libraryDocumentSlug("")).toBe("");
    expect(libraryDocumentSlug(".pdf")).toBe("");
    expect(libraryDocumentSlug("日本語.pdf")).toBe("");
    expect(libraryDocumentSlug("***.pdf")).toBe("");
  });

  it("caps at 60 characters without a trailing dash", () => {
    const slug = libraryDocumentSlug(`${"word ".repeat(30)}.pdf`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
    expect(libraryDocumentSlug(`${"a".repeat(100)}.pdf`)).toBe("a".repeat(60));
  });
});

describe("libraryDocumentKey", () => {
  it("builds {biz}/library-doc-{hex}-{slug}.pdf", () => {
    expect(
      libraryDocumentKey("biz1", "Annual Report 2025.pdf", "0123456789abcdef"),
    ).toBe("biz1/library-doc-0123456789abcdef-annual-report-2025.pdf");
  });

  it("omits the slug when the name yields none", () => {
    expect(libraryDocumentKey("biz1", "日本語.pdf", "0123456789abcdef")).toBe(
      "biz1/library-doc-0123456789abcdef.pdf",
    );
  });

  it("generates 16 random hex chars by default and a valid library doc key", () => {
    const key = libraryDocumentKey("biz1", "menu.pdf");
    expect(key).toMatch(/^biz1\/library-doc-[0-9a-f]{16}-menu\.pdf$/);
    expect(isLibraryDocumentKey(key)).toBe(true);
  });
});

describe("documentDisplayName", () => {
  it("turns a slugged key into the readable name", () => {
    expect(
      documentDisplayName(
        "biz1/library-doc-0123456789abcdef-annual-report-2025.pdf",
      ),
    ).toBe("annual-report-2025.pdf");
    expect(documentSlugFromKey("library-doc-ab12-menu-v2.pdf")).toBe("menu-v2");
  });

  it("falls back to Document.pdf without a slug", () => {
    expect(documentDisplayName("biz1/library-doc-0123456789abcdef.pdf")).toBe(
      "Document.pdf",
    );
    expect(documentSlugFromKey("biz1/library-doc-0123456789abcdef.pdf")).toBe(
      "",
    );
  });

  it("leaves other keys as their plain file name", () => {
    expect(documentDisplayName("biz1/image-abc.png")).toBe("image-abc.png");
  });
});

describe("documentLinkText", () => {
  it("turns a key slug into readable words", () => {
    expect(documentLinkText("annual-report-2025.pdf")).toBe(
      "Annual report 2025",
    );
  });

  it("keeps a freshly uploaded file's own name", () => {
    expect(documentLinkText("QA Impact Report 2025.pdf")).toBe(
      "QA Impact Report 2025",
    );
  });

  it("falls back to Document when there is no name", () => {
    expect(documentLinkText("Document.pdf")).toBe("Document");
    expect(documentLinkText(".pdf")).toBe("Document");
  });
});
