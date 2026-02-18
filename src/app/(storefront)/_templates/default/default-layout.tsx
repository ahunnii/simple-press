import type { DefaultLayoutTemplateProps } from "../types";

import { DefaultFooter } from "./default-footer";
import { DefaultHeader } from "./default-header";

export async function DefaultLayout({
  business,
  children,
}: DefaultLayoutTemplateProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <DefaultHeader business={business} />
      <main className="flex-1">{children}</main>
      <DefaultFooter business={business} />
    </div>
  );
}
