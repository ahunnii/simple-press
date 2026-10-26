import { describe, expect, it } from "vitest";

import { detectHevc, formatVideoDuration } from "./video-prep";

/** One ISO BMFF box: 32-bit size + fourcc + payload. */
function box(type: string, payload: Uint8Array = new Uint8Array()): Uint8Array {
  const out = new Uint8Array(8 + payload.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, out.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(payload, 8);
  return out;
}

/** Same box with the 64-bit "largesize" header (size field = 1). */
function largeBox(type: string, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(16 + payload.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, 1);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  view.setUint32(8, 0);
  view.setUint32(12, out.length);
  out.set(payload, 16);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

const ftyp = box("ftyp", new TextEncoder().encode("isom\0\0\0\0isomavc1"));

/** moov → trak → mdia → minf → stbl → stsd → <sample entry fourcc> */
function moovWith(sampleEntry: string): Uint8Array {
  const stsd = box("stsd", concat(new Uint8Array(8), box(sampleEntry)));
  return box("moov", box("trak", box("mdia", box("minf", box("stbl", stsd)))));
}

describe("detectHevc", () => {
  it("flags an hvc1 sample entry", () => {
    expect(detectHevc(concat(ftyp, moovWith("hvc1"), box("mdat")))).toBe(true);
  });

  it("flags an hev1 sample entry", () => {
    expect(detectHevc(concat(ftyp, moovWith("hev1")))).toBe(true);
  });

  it("passes H.264 (avc1)", () => {
    expect(detectHevc(concat(ftyp, moovWith("avc1"), box("mdat")))).toBe(false);
  });

  it("finds moov after a large mdat (non-faststart file)", () => {
    const mdat = largeBox("mdat", new Uint8Array(64));
    expect(detectHevc(concat(ftyp, mdat, moovWith("hvc1")))).toBe(true);
  });

  it("ignores the fourcc appearing in media data, not track metadata", () => {
    const noise = new TextEncoder().encode("....hvc1....hev1....");
    expect(detectHevc(concat(ftyp, box("mdat", noise), moovWith("avc1")))).toBe(
      false,
    );
  });

  it("returns false for non-MP4 input (e.g. WebM's EBML header)", () => {
    const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86]);
    expect(detectHevc(webm)).toBe(false);
    expect(detectHevc(new Uint8Array())).toBe(false);
  });

  it("returns false for a garbage box size instead of looping", () => {
    const bad = new Uint8Array([0, 0, 0, 4, 0x6d, 0x6f, 0x6f, 0x76]);
    expect(detectHevc(bad)).toBe(false);
  });
});

describe("formatVideoDuration", () => {
  it("formats m:ss", () => {
    expect(formatVideoDuration(7.4)).toBe("0:07");
    expect(formatVideoDuration(83)).toBe("1:23");
    expect(formatVideoDuration(-1)).toBe("0:00");
  });
});
