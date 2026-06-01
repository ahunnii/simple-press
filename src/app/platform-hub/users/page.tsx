import { api } from "~/trpc/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { UsersTable } from "~/app/admin/platform/_components/users-table";

import { PlatformTrailHeader } from "../_components/platform-trail-header";

export default async function PlatformUsersPage() {
  const { users } = await api.platform.listUsers();

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

        {users.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No users found</CardTitle>
              <CardDescription>
                No users have been created on the platform yet
              </CardDescription>
            </CardHeader>
            <CardContent />
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
