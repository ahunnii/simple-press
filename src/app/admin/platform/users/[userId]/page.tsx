import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { AddMembershipButton } from "../../_components/add-membership-button";
import { UserMembershipsTable } from "../../_components/user-memberships-table";
import { TrailHeader } from "../../../_components/trail-header";

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function UserDetailPage({ params }: Props) {
  const { userId } = await params;
  const user = await api.platform.getUser(userId).catch(() => null);

  if (!user) {
    notFound();
  }

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Platform Admin", href: "/admin/platform/users" },
          { label: "Users", href: "/admin/platform/users" },
          { label: user.name },
        ]}
      />
      <div className="admin-container">
        <div className="space-y-6">
          <div className="admin-header">
            <h1 className="text-2xl font-bold">{user.name}</h1>
          </div>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{user.name}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
                <Badge
                  variant={
                    user.platformRole === "PLATFORM_ADMIN"
                      ? "default"
                      : "secondary"
                  }
                >
                  {user.platformRole}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground font-medium">User ID</dt>
                  <dd className="mt-1 font-mono text-xs">{user.id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">
                    Email Verified
                  </dt>
                  <dd className="mt-1">{user.emailVerified ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">
                    Created At
                  </dt>
                  <dd className="mt-1">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">
                    Updated At
                  </dt>
                  <dd className="mt-1">
                    {new Date(user.updatedAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Business Memberships</CardTitle>
                  <CardDescription>
                    Businesses this user has access to
                  </CardDescription>
                </div>
                <AddMembershipButton userId={user.id} />
              </div>
            </CardHeader>
            <CardContent>
              {user.memberships.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  This user is not a member of any businesses yet.
                </p>
              ) : (
                <UserMembershipsTable memberships={user.memberships} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
