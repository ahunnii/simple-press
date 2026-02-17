import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { ContentDashboard } from "~/app/admin/content/_components/content-dashboard";

import { TrailHeader } from "../_components/trail-header";

export default async function ContentPage() {
  const business = await api.business.secureGetContent();

  if (!business) {
    notFound();
  }

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Content" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Site Content</h1>
            <p>Manage your website content, pages, and navigation</p>
          </div>
        </div>

        <ContentDashboard business={business} />
      </div>
    </>
  );
}

export const metadata = {
  title: "Content",
};
