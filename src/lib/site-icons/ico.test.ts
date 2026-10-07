import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { buildIco, isIco, readIcoLargestPng } from "./ico";

async function solidPng(size: number) {
  return sharp({
    create: { width: size, height: size, channels: 4, background: "#c0ffee" },
  })
    .png()
    .toBuffer();
}

describe("buildIco", () => {
  it("writes a valid header and directory", async () => {
    const pngs = await Promise.all(
      [16, 32, 256].map(async (size) => ({ size, data: await solidPng(size) })),
    );
    const ico = buildIco(pngs);

    expect(isIco(ico)).toBe(true);
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(3);

    let expectedOffset = 6 + 3 * 16;
    pngs.forEach(({ size, data }, i) => {
      const at = 6 + i * 16;
      const dimByte = size === 256 ? 0 : size;
      expect(ico[at]).toBe(dimByte);
      expect(ico[at + 1]).toBe(dimByte);
      expect(ico.readUInt16LE(at + 4)).toBe(1);
      expect(ico.readUInt16LE(at + 6)).toBe(32);
      expect(ico.readUInt32LE(at + 8)).toBe(data.length);
      expect(ico.readUInt32LE(at + 12)).toBe(expectedOffset);
      expect(
        ico.subarray(expectedOffset, expectedOffset + data.length).equals(data),
      ).toBe(true);
      expectedOffset += data.length;
    });
    expect(ico.length).toBe(expectedOffset);
  });
});

describe("readIcoLargestPng", () => {
  it("round-trips the largest entry out of buildIco", async () => {
    const pngs = await Promise.all(
      [16, 48, 32].map(async (size) => ({ size, data: await solidPng(size) })),
    );
    const largest = readIcoLargestPng(buildIco(pngs));
    expect(largest?.equals(pngs[1]!.data)).toBe(true);
    expect((await sharp(largest!).metadata()).width).toBe(48);
  });

  it("returns null for a BMP-only icon", () => {
    // One 16x16 entry whose payload is a BITMAPINFOHEADER, not a PNG.
    const bmp = Buffer.alloc(40 + 16 * 16 * 4);
    bmp.writeUInt32LE(40, 0);
    const ico = Buffer.concat([Buffer.alloc(22), bmp]);
    ico.writeUInt16LE(1, 2);
    ico.writeUInt16LE(1, 4);
    ico.writeUInt8(16, 6);
    ico.writeUInt8(16, 7);
    ico.writeUInt32LE(bmp.length, 6 + 8);
    ico.writeUInt32LE(22, 6 + 12);

    expect(isIco(ico)).toBe(true);
    expect(readIcoLargestPng(ico)).toBeNull();
  });

  it("returns null for non-ICO input and out-of-range entries", async () => {
    expect(readIcoLargestPng(await solidPng(16))).toBeNull();
    const broken = buildIco([{ size: 16, data: await solidPng(16) }]);
    broken.writeUInt32LE(9_999_999, 6 + 12);
    expect(readIcoLargestPng(broken)).toBeNull();
  });
});
