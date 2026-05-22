import { Inter, Poppins } from "next/font/google";

import type { DefaultLayoutTemplateProps } from "../../types";

import { DefaultFooter } from "./default-footer";
import { DefaultHeader } from "./default-header";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export async function DefaultLayout({
  business,
  children,
}: DefaultLayoutTemplateProps) {
  return (
    <div
      className={`${inter.variable} ${poppins.variable} default-template flex min-h-screen flex-col`}
    >
      <DefaultHeader business={business} />
      <main className="flex-1">{children}</main>
      <DefaultFooter business={business} />
    </div>
  );
}
