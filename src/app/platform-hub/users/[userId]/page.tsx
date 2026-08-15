import { notFound } from "next/navigation";

import { PLATFORM_TERMS_VERSION } from "~/lib/legal/policy-versions";
import { formatDate } from "~/lib/utils";
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
import { PlatformTrailHeader } from "../../_components/platform-trail-header";
import { UserMembershipsTable } from "../../_components/user-memberships-table";

type Props = {
  params: Promise<{ userId: string }>;
};

export default async function PlatformUserDetailPage({ params }: Props) {
  const { userId } = await params;
  const user = await api.platform.getUser(userId).catch(() => null);

  if (!user) {
    notFound();
  }

  return (
    <>
      <PlatformTrailHeader
        breadcrumbs={[{ label: "Users", href: "/users" }, { label: user.name }]}
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
                  <dd className="mt-1">{formatDate(user.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">
                    Updated At
                  </dt>
                  <dd className="mt-1">{formatDate(user.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">
                    Platform Terms
                  </dt>
                  <dd className="mt-1">
                    {user.termsAcceptedAt ? (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            user.termsVersion === PLATFORM_TERMS_VERSION
                              ? "success"
                              : "warning"
                          }
                        >
                          {user.termsVersion === PLATFORM_TERMS_VERSION
                            ? "Accepted"
                            : "Outdated version"}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {formatDate(user.termsAcceptedAt)}
                        </span>
                      </div>
                    ) : (
                      // Discord OAuth accounts never see a terms checkbox, so
                      // this is indistinguishable from a pre-feature account.
                      // "Not recorded" is accurate; "Declined" would not be.
                      <span className="text-muted-foreground">
                        Not recorded
                      </span>
                    )}
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
