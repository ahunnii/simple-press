import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";
import { ContentDashboard } from "~/app/admin/content/_components/content-dashboard";

import { TrailHeader } from "../_components/trail-header";

export default async function ContentPage() {
  const [policyPages, session, { flags }] = await Promise.all([
    api.content.getPages({ type: "policy" }),
    getSession(),
    getBusinessFlags(),
  ]);
  const isPlatformAdmin = session?.user.platformRole === "PLATFORM_ADMIN";

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Site Setup" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Site Setup</h1>
            <p>Brand, navigation, search listing, and policies.</p>
          </div>
        </div>

        <ContentDashboard
          policyCount={policyPages.length}
          isPlatformAdmin={isPlatformAdmin}
          flags={flags}
        />
      </div>
    </>
  );
}

export const metadata = {
  title: "Site Setup",
};
