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
    <div
      className={`${fontSerif.variable} ${fontSans.variable} ${fontMono.variable} elegant min-h-screen`}
      style={{
        background: "var(--el-cream, #f5f1ea)",
        color: "var(--el-ink, #1c1a17)",
        fontFamily: "var(--font-sans, Manrope, sans-serif)",
        /* No overflow-x here — it would create a scroll container and break position:sticky */
      }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:z-[9999] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:rounded focus:shadow-lg"
        style={{ background: "var(--el-paper, #fbf8f2)", color: "var(--el-ink, #1c1a17)" }}
      >
        Skip to main content
      </a>
      <ElegantHeader business={business} />
      {/* Wrapper adds nav clearance without creating a new scroll context */}
      <main id="main-content" style={{ paddingTop: 100 }}>
        {children}
      </main>
      <ElegantFooter business={business} />
    </div>
  );
}
