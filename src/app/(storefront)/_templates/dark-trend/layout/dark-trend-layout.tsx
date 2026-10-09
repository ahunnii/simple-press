import type { DefaultLayoutTemplateProps } from "../../types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveBanner } from "~/lib/site-banner/resolve";

import { DarkTrendAnnouncementBar } from "./dark-trend-announcement-bar";
import { DarkTrendFooter } from "./dark-trend-footer";
import { DarkTrendHeader } from "./dark-trend-header";
import { DarkTrendRouteAnnouncer } from "./dark-trend-route-announcer";

export async function DarkTrendLayout({
  business,
  children,
}: DefaultLayoutTemplateProps) {
  const { isEnabled } = await getBusinessFlags();
  const banner = resolveBanner(business.siteContent, isEnabled);

  return (
    <div className="dark-trend bg-background text-foreground min-h-screen font-sans antialiased">
      {/* Skip link — visible on keyboard focus, hidden otherwise (WCAG 2.4.1) */}
      <a href="#main-content" className="dt-skip-link">
        Skip to main content
      </a>
      <DarkTrendRouteAnnouncer />
      {banner && <DarkTrendAnnouncementBar banner={banner} />}
      <DarkTrendHeader business={business} />
      <main id="main-content">{children}</main>
      <DarkTrendFooter business={business} />
    </div>
  );
}
