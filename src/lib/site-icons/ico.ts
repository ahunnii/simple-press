/**
 * Minimal ICO container read/write. sharp can't decode ICO, so uploaded
 * favicons are unwrapped to their largest embedded PNG, and the generated
 * `favicon.ico` is written as PNG entries (valid since Vista; every current
 * browser and Google accept it).
 *
 * Layout: 6-byte ICONDIR (reserved 0, type 1, count) followed by one 16-byte
 * ICONDIRENTRY per image (width, height, colors, reserved, planes, bitcount,
 * byte length, offset). A width/height byte of 0 means 256.
 */

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const HEADER_SIZE = 6;
const ENTRY_SIZE = 16;

export function isIco(buf: Buffer): boolean {
  return (
    buf.length >= HEADER_SIZE &&
    buf[0] === 0 &&
    buf[1] === 0 &&
    buf[2] === 1 &&
    buf[3] === 0
  );
}

/**
 * The largest PNG-encoded image inside an ICO, or null when there is none
 * (classic BMP-only icons) or the directory is malformed.
 */
export function readIcoLargestPng(buf: Buffer): Buffer | null {
  if (!isIco(buf)) return null;
  const count = buf.readUInt16LE(4);
  let best: { dim: number; data: Buffer } | null = null;

  for (let i = 0; i < count; i++) {
    const at = HEADER_SIZE + i * ENTRY_SIZE;
    if (at + ENTRY_SIZE > buf.length) break;
    const dim = buf[at] === 0 ? 256 : buf[at]!;
    const length = buf.readUInt32LE(at + 8);
    const offset = buf.readUInt32LE(at + 12);
    if (offset + length > buf.length || length < PNG_SIGNATURE.length) continue;

    const data = buf.subarray(offset, offset + length);
    if (!data.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) continue;
    if (
      !best ||
      dim > best.dim ||
      (dim === best.dim && length > best.data.length)
    ) {
      best = { dim, data };
    }
  }
  return best ? Buffer.from(best.data) : null;
}

/** Wrap square PNGs (≤256px) in an ICO container. */
export function buildIco(pngs: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(HEADER_SIZE + pngs.length * ENTRY_SIZE);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);

  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const at = HEADER_SIZE + i * ENTRY_SIZE;
    const dimByte = size >= 256 ? 0 : size;
    header.writeUInt8(dimByte, at);
    header.writeUInt8(dimByte, at + 1);
    header.writeUInt8(0, at + 2); // palette colours
    header.writeUInt8(0, at + 3); // reserved
    header.writeUInt16LE(1, at + 4); // planes
    header.writeUInt16LE(32, at + 6); // bits per pixel
    header.writeUInt32LE(data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });

  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}
