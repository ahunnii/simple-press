import { api } from "~/trpc/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { UsersTable } from "~/app/admin/platform/_components/users-table";

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

export default async function PlatformUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const { users, total } = await api.platform.listUsers({
    search: params.search,
    limit: PAGE_SIZE,
    offset,
  });

  return (
    <>
      <PlatformTrailHeader breadcrumbs={[{ label: "Users" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Platform Users</h1>
            <p>Manage all users across the platform</p>
          </div>
        </div>

        <PlatformListFilters
          total={total}
          placeholder="Search by name or email..."
        />

        {users.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No users found</CardTitle>
              <CardDescription>
                {params.search
                  ? "Try a different search term."
                  : "No users have been created on the platform yet."}
              </CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ) : (
          <>
            <UsersTable users={users} />
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
  title: "Platform Users",
};
