import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { buildIco } from "./ico";
import { renderIconPng, renderIconVariant } from "./render";

const wide = { width: 300, height: 120 };

function create(format: "png" | "webp" | "gif") {
  const img = sharp({
    create: {
      ...wide,
      channels: 4,
      background: { r: 200, g: 40, b: 90, alpha: 1 },
    },
  });
  return img[format]().toBuffer();
}

const svg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="16"><rect width="40" height="16" fill="#123456"/></svg>`,
);

async function dims(buf: Buffer) {
  const meta = await sharp(buf).metadata();
  return { format: meta.format, width: meta.width, height: meta.height };
}

describe("renderIconPng", () => {
  it.each(["png", "webp", "gif"] as const)(
    "squares a non-square %s to exactly size×size",
    async (format) => {
      const out = await renderIconPng(await create(format), 192);
      expect(await dims(out)).toEqual({
        format: "png",
        width: 192,
        height: 192,
      });
    },
  );

  it("squares an SVG", async () => {
    expect(await dims(await renderIconPng(svg, 512))).toEqual({
      format: "png",
      width: 512,
      height: 512,
    });
  });

  it("pads on an opaque background and keeps the exact size", async () => {
    const out = await renderIconPng(await create("png"), 180, {
      background: { r: 255, g: 255, b: 255, alpha: 1 },
      paddingPct: 0.08,
    });
    expect(await dims(out)).toEqual({ format: "png", width: 180, height: 180 });
    const { data, info } = await sharp(out)
      .raw()
      .toBuffer({ resolveWithObject: true });
    // Top-left corner is padding → opaque white.
    expect([...data.subarray(0, info.channels)].slice(0, 3)).toEqual([
      255, 255, 255,
    ]);
    if (info.channels === 4) expect(data[3]).toBe(255);
  });

  it("reads a PNG-bearing ICO and rejects a BMP-only one", async () => {
    const png = await create("png");
    const ico = buildIco([{ size: 0, data: png }]);
    expect(await dims(await renderIconPng(ico, 48))).toMatchObject({
      width: 48,
      height: 48,
    });

    const bmpOnly = Buffer.alloc(22 + 40);
    bmpOnly.writeUInt16LE(1, 2);
    bmpOnly.writeUInt16LE(1, 4);
    bmpOnly.writeUInt32LE(40, 6 + 8);
    bmpOnly.writeUInt32LE(22, 6 + 12);
    await expect(renderIconPng(bmpOnly, 48)).rejects.toThrow();
  });
});

describe("renderIconVariant", () => {
  it("builds a 16/32/48 favicon.ico", async () => {
    const ico = await renderIconVariant(await create("png"), "favicon.ico");
    expect(ico.readUInt16LE(4)).toBe(3);
    expect([ico[6], ico[22], ico[38]]).toEqual([16, 32, 48]);
  });
});
