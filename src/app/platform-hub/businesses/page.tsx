import { api } from "~/trpc/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { BusinessesTable } from "../_components/businesses-table";
import { CreateBusinessButton } from "../_components/create-business-button";
import { PlatformListFilters } from "../_components/platform-list-filters";
import { PlatformListPagination } from "../_components/platform-list-pagination";
import { PlatformTrailHeader } from "../_components/platform-trail-header";

const PAGE_SIZE = 25;

type Props = {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
};

export default async function PlatformBusinessesPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const { businesses, total } = await api.platform.listBusinesses({
    search: params.search,
    limit: PAGE_SIZE,
    offset,
  });

  return (
    <>
      <PlatformTrailHeader breadcrumbs={[{ label: "Businesses" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Platform Businesses</h1>
            <p>Manage all businesses across the platform</p>
          </div>
          <CreateBusinessButton />
        </div>

        <PlatformListFilters
          total={total}
          placeholder="Search by name, subdomain, or domain..."
        />

        {businesses.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No businesses found</CardTitle>
              <CardDescription>
                {params.search
                  ? "Try a different search term."
                  : "No businesses have been created on the platform yet."}
              </CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ) : (
          <>
            <BusinessesTable businesses={businesses} />
            <PlatformListPagination
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
            />
          </>
        )}
      </div>
    </>
  );
}

export const metadata = {
  title: "Platform Businesses",
};
