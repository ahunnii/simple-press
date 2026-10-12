import { describe, expect, it } from "vitest";

import { isFilenameAltText, meaningfulAltText } from "./alt-text";

describe("isFilenameAltText", () => {
  it.each([
    "download-9.png",
    "IMG_1234.JPG",
    "a9fe57_faf3d13345b74dd18294d9b2a01c54edmv2.webp",
    "photo.jpeg",
    "  spaced-around.gif  ",
    "logo.SVG",
    "scan.tif",
    "scan.tiff",
    "shot.heic",
    "shot.avif",
    "icon.bmp",
  ])("treats %j as a file name", (alt) => {
    expect(isFilenameAltText(alt)).toBe(true);
  });

  it.each([
    "A red mug",
    "Our shop front.png banner",
    "A photo of our shop.png",
    "png",
    "download-9",
    "report.pdf",
    "",
    "   ",
    null,
    undefined,
  ])("does not treat %j as a file name", (alt) => {
    expect(isFilenameAltText(alt)).toBe(false);
  });
});

describe("meaningfulAltText", () => {
  it("returns the trimmed description", () => {
    expect(meaningfulAltText("  A red mug ")).toBe("A red mug");
  });

  it("returns null for missing values", () => {
    expect(meaningfulAltText("")).toBeNull();
    expect(meaningfulAltText("   ")).toBeNull();
    expect(meaningfulAltText(null)).toBeNull();
    expect(meaningfulAltText(undefined)).toBeNull();
  });

  it("returns null for file names", () => {
    expect(meaningfulAltText("download-9.png")).toBeNull();
    expect(meaningfulAltText(" IMG_1234.JPG ")).toBeNull();
  });

  it("keeps prose that merely contains an extension", () => {
    expect(meaningfulAltText("Our shop front.png banner")).toBe(
      "Our shop front.png banner",
    );
  });
});
