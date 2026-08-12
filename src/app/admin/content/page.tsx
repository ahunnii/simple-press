import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";
import { ContentDashboard } from "~/app/admin/content/_components/content-dashboard";

import { TrailHeader } from "../_components/trail-header";

export default async function ContentPage() {
  const [pages, session, { flags }] = await Promise.all([
    api.content.getPages(),
    getSession(),
    getBusinessFlags(),
  ]);
  const isPlatformAdmin = session?.user.platformRole === "PLATFORM_ADMIN";

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Site Content" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Site Content</h1>
            <p>Manage your website content, pages, and navigation</p>
          </div>
        </div>

        <ContentDashboard
          pages={pages}
          isPlatformAdmin={isPlatformAdmin}
          flags={flags}
        />
      </div>
    </>
  );
}

export const metadata = {
  title: "Site Content",
};
