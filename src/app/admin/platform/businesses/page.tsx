import { api } from "~/trpc/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { TrailHeader } from "../../_components/trail-header";
import { BusinessesTable } from "../_components/businesses-table";

export default async function BusinessesPage() {
  const { businesses } = await api.platform.listBusinesses();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Platform Admin", href: "/admin/platform/users" },
          { label: "Businesses" },
        ]}
      />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Platform Businesses</h1>
            <p>Manage all businesses across the platform</p>
          </div>
        </div>

        {businesses.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No businesses found</CardTitle>
              <CardDescription>
                No businesses have been created on the platform yet
              </CardDescription>
            </CardHeader>
            <CardContent></CardContent>
          </Card>
        ) : (
          <BusinessesTable businesses={businesses} />
        )}
      </div>
    </>
  );
}

export const metadata = {
  title: "Platform Businesses",
};
