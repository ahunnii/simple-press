import { notFound } from "next/navigation";

import { api, HydrateClient } from "~/trpc/server";
import { ContentDashboard } from "~/app/admin/content/_components/content-dashboard";

import { SiteHeader } from "../_components/site-header";

export default async function ContentPage() {
  const business = await api.business.secureGetContent();

  if (!business) {
    notFound();
  }

  return (
    <HydrateClient>
      <SiteHeader title="Site Content" />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Site Content</h1>
            <p>Manage your website content, pages, and navigation</p>
          </div>
        </div>

        <ContentDashboard business={business} />
      </div>
    </HydrateClient>
  );
}
