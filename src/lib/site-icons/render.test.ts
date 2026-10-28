import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { buildIco } from "./ico";
import {
  renderIconPng,
  renderIconVariant,
  renderOgFallbackCard,
} from "./render";

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

describe("renderOgFallbackCard", () => {
  async function pixel(buf: Buffer, left: number, top: number) {
    const { data } = await sharp(buf)
      .extract({ left, top, width: 1, height: 1 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return [...data];
  }

  it.each(["png", "webp", "gif", "avif"] as const)(
    "turns a %s logo into a 1200x630 PNG with the logo centred",
    async (format) => {
      const logo = await sharp({
        create: {
          width: 400,
          height: 400,
          channels: 4,
          background: { r: 200, g: 0, b: 0, alpha: 1 },
        },
      })
        [format]()
        .toBuffer();
      const out = await renderOgFallbackCard(logo);
      expect(await dims(out)).toEqual({
        format: "png",
        width: 1200,
        height: 630,
      });
      // Padding: corner is the card background; the middle is the logo.
      expect(await pixel(out, 5, 5)).toEqual([200, 0, 0]);
      // (opaque source: the card takes the logo's own background, so the
      // whole card is that colour)
      expect(await pixel(out, 600, 315)).toEqual([200, 0, 0]);
    },
  );

  it("uses white behind a transparent logo and keeps generous padding", async () => {
    const logo = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 200,
              height: 200,
              channels: 3,
              background: "#0000ff",
            },
          })
            .png()
            .toBuffer(),
          gravity: "centre",
        },
      ])
      .png()
      .toBuffer();
    const out = await renderOgFallbackCard(logo);
    expect(await pixel(out, 5, 5)).toEqual([255, 255, 255]);
    expect(await pixel(out, 600, 315)).toEqual([0, 0, 255]);
    // 400px logo fits the 390px-tall box: blue square is 195px, so 150px from
    // the vertical middle is still white.
    expect(await pixel(out, 600, 315 - 150)).toEqual([255, 255, 255]);
  });

  it("renders an SVG logo", async () => {
    const out = await renderOgFallbackCard(svg);
    expect(await dims(out)).toEqual({
      format: "png",
      width: 1200,
      height: 630,
    });
    expect(await pixel(out, 600, 315)).toEqual([0x12, 0x34, 0x56]);
  });
});
