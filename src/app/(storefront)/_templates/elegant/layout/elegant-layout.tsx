import { Cormorant_Garamond, JetBrains_Mono, Manrope } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";

import { ElegantFooter } from "./elegant-footer";
import { ElegantHeader } from "./elegant-header";

const fontSerif = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

const fontSans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export function ElegantLayout({
  business,
  children,
}: DefaultLayoutTemplateProps) {
  return (
    <main
      className={`${fontSerif.variable} ${fontSans.variable} ${fontMono.variable} elegant min-h-screen`}
      style={{
        background: "var(--el-cream, #f5f1ea)",
        color: "var(--el-ink, #1c1a17)",
        fontFamily: "var(--font-sans, Manrope, sans-serif)",
        /* No overflow-x here — it would create a scroll container and break position:sticky */
      }}
    >
      <ElegantHeader business={business} />
      {/* Wrapper adds nav clearance without creating a new scroll context */}
      <div style={{ paddingTop: 100 }}>{children}</div>
      <ElegantFooter business={business} />
    </main>
  );
}
