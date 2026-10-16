import crypto from "node:crypto";
import { describe, expect, it } from "vitest";

import { isLibraryOwnedKey } from "~/lib/media/usage";

import { classifyKind } from "./list";
import { contentAddressedKey } from "./put";

const BYTES = Buffer.from("library-image-bytes");
const SHA8 = crypto
  .createHash("sha256")
  .update(BYTES)
  .digest("hex")
  .slice(0, 8);

describe("contentAddressedKey", () => {
  it("re-keys a plain image as image-{sha8}", () => {
    expect(
      contentAddressedKey(
        "bizB",
        "image",
        BYTES,
        ".jpg",
        "bizA/image-0123abcd.jpg",
      ),
    ).toBe(`bizB/image-${SHA8}.jpg`);
  });

  it("keeps the image- prefix when no source key is given", () => {
    expect(contentAddressedKey("bizB", "image", BYTES, ".jpg")).toBe(
      `bizB/image-${SHA8}.jpg`,
    );
  });

  it("keeps a Media Library image library-owned as library-{sha8}", () => {
    const key = contentAddressedKey(
      "bizB",
      "image",
      BYTES,
      ".png",
      "bizA/library-0123456789abcdef.png",
    );
    expect(key).toBe(`bizB/library-${SHA8}.png`);
    expect(isLibraryOwnedKey(key)).toBe(true);
    expect(classifyKind(key.slice("bizB/".length))).toBe("image");
  });

  it("is content-addressed for library images (same bytes → same key)", () => {
    expect(
      contentAddressedKey(
        "bizB",
        "image",
        BYTES,
        ".png",
        "bizA/library-aaaa.png",
      ),
    ).toBe(
      contentAddressedKey(
        "bizB",
        "image",
        BYTES,
        ".png",
        "bizC/library-bbbb.png",
      ),
    );
  });

  it("does not treat library-doc- sources as library images", () => {
    // A stray image under library-doc- is not a library image upload.
    expect(
      contentAddressedKey(
        "bizB",
        "image",
        BYTES,
        ".png",
        "bizA/library-doc-0123.png",
      ),
    ).toBe(`bizB/image-${SHA8}.png`);
  });

  it("only looks at the file name after the business prefix", () => {
    expect(
      contentAddressedKey(
        "bizB",
        "image",
        BYTES,
        ".png",
        "library-x/image-0123.png",
      ),
    ).toBe(`bizB/image-${SHA8}.png`);
  });

  it("still re-keys library PDFs as library-doc-{sha8}-{slug}", () => {
    expect(
      contentAddressedKey(
        "bizB",
        "document",
        BYTES,
        ".pdf",
        "bizA/library-doc-0123456789abcdef-annual-report.pdf",
      ),
    ).toBe(`bizB/library-doc-${SHA8}-annual-report.pdf`);
  });

  it("leaves gallery keys alone even with a library- source", () => {
    expect(
      contentAddressedKey(
        "bizB",
        "gallery",
        BYTES,
        ".jpg",
        "bizA/library-0123.jpg",
      ),
    ).toBe(`bizB/gallery-${SHA8}.jpg`);
  });
});
