"use client";

import { useMemo, useState } from "react";
import { encode } from "uqr";

/**
 * A scannable QR code with an optional logo knocked out of its center.
 *
 * Encoding stays local and synchronous, and the value is converted to a
 * boolean matrix before the path is built, so the input can never become
 * markup or an SVG attribute. All coordinates below are in module units, which
 * is what the view box measures.
 */
export function BrandedQrCode({
  value,
  logoUrl,
  className,
  style,
}: {
  /** URL to encode. */
  value: string;
  /** Center logo; renders a plain QR code when absent. */
  logoUrl?: string | null;
  /** Sizing, e.g. `size-44`. */
  className?: string;
  /** Template border etc. */
  style?: React.CSSProperties;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = !!logoUrl && !logoFailed;

  const { size, path } = useMemo(() => {
    // `border` and `ecc` are passed explicitly because uqr defaults to
    // `border: 1, ecc: "L"` — the four-module border preserves the quiet zone
    // phone cameras need, and a logo covers modules, so the overlay case needs
    // the highest error correction to stay scannable. Keyed off `logoUrl`
    // rather than `showLogo` so a failed image load doesn't re-encode; an
    // ecc-H code with no overlay scans fine.
    const qr = encode(value, { ecc: logoUrl ? "H" : "M", border: 4 });

    const parts: string[] = [];
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (qr.data[y]?.[x]) parts.push(`M${x} ${y}h1v1h-1z`);
      }
    }

    return { size: qr.size, path: parts.join("") };
  }, [value, logoUrl]);

  // Whole modules for the knockout so its edges land on module boundaries.
  const knockoutSpan = Math.ceil(size * 0.26);
  const knockoutOffset = (size - knockoutSpan) / 2;
  const logoSpan = size * 0.2;
  const logoOffset = (size - logoSpan) / 2;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={style}
    >
      <path fill="white" d={`M0 0h${size}v${size}H0z`} />
      <path fill="black" d={path} shapeRendering="crispEdges" />
      {showLogo && (
        <>
          <rect
            x={knockoutOffset}
            y={knockoutOffset}
            width={knockoutSpan}
            height={knockoutSpan}
            rx={1}
            fill="white"
          />
          {/* A raw SVG `image` rather than `next/image`, which can't render
              inside an SVG. Display-only, so there's no CORS concern. */}
          <image
            href={logoUrl}
            x={logoOffset}
            y={logoOffset}
            width={logoSpan}
            height={logoSpan}
            preserveAspectRatio="xMidYMid meet"
            onError={() => setLogoFailed(true)}
          />
        </>
      )}
    </svg>
  );
}
