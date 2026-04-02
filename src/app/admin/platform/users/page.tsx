import { api } from "~/trpc/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { UsersTable } from "../_components/users-table";
import { TrailHeader } from "../../_components/trail-header";

export default async function UsersPage() {
  const { users } = await api.platform.listUsers();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Platform Admin", href: "/admin/platform/users" },
          { label: "Users" },
        ]}
      />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Platform Users</h1>
            <p>Manage all users across the platform</p>
          </div>
        </div>

        {users.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No users found</CardTitle>
              <CardDescription>
                No users have been created on the platform yet
              </CardDescription>
            </CardHeader>
            <CardContent></CardContent>
          </Card>
        ) : (
          <UsersTable users={users} />
        )}
      </div>
    </>
  );
}

export const metadata = {
  title: "Platform Users",
};
