import Link from "next/link";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { AnnouncementsEditor } from "./_components/announcements-editor";

export default async function AnnouncementsPage() {
  const [bannerConfig, popupConfig, flags] = await Promise.all([
    api.content.getBannerConfig(),
    api.content.getPopupConfig(),
    getBusinessFlags(),
  ]);

  // `getBusinessFlags()` returns `{ flags, isEnabled }` as siblings — the local
  // name here holds the whole result, so `flags.isEnabled` is that sibling.
  const bannersEnabled = flags.isEnabled("banners");
  const popupsEnabled = flags.isEnabled("popups");
  // Must be gated: `media.list` is flag-gated server-side and throws when off.
  const mediaEnabled = flags.isEnabled("media");

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Site Setup", href: "/admin/content" },
          { label: "Banner & Popup" },
        ]}
      />
      <HubSubNav hub="content" />

      {!bannersEnabled && !popupsEnabled ? (
        <div className="admin-container">
          <div className="admin-header">
            <h1>Banner &amp; Popup</h1>
          </div>
          <div className="border-border rounded-lg border border-dashed p-12 text-center">
            <p className="mb-2 text-lg font-medium">
              Banners &amp; Popups are not enabled
            </p>
            <p className="text-muted-foreground mb-6">
              Enable the &ldquo;Announcement Banner&rdquo; and/or
              &ldquo;Homepage Popup&rdquo; features to start using this section.
            </p>
            <Button asChild>
              <Link href="/admin/settings/features">
                Go to Settings → Features
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <AnnouncementsEditor
          banner={bannerConfig}
          popup={popupConfig}
          bannersEnabled={bannersEnabled}
          popupsEnabled={popupsEnabled}
          mediaEnabled={mediaEnabled}
        />
      )}
    </>
  );
}

export const metadata = {
  title: "Banner & Popup",
};
