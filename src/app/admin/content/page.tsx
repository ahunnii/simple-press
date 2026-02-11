import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { ContentDashboard } from "~/app/admin/content/_components/content-dashboard";

export default async function ContentPage() {
  const business = await api.business.secureGetContent();

  if (!business) {
    notFound();
  }

  return <ContentDashboard business={business} />;
}
