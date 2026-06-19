import Link from "next/link";

import { env } from "~/env";
import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { PlatformTrailHeader } from "../_components/platform-trail-header";

export default async function PlatformDashboardPage() {
  const stats = await api.platform.getDashboardStats();

  return (
    <>
      <PlatformTrailHeader breadcrumbs={[{ label: "Dashboard" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Platform Dashboard</h1>
            <p>Overview of all users and businesses on the platform</p>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-3xl">{stats.totalUsers}</CardTitle>
              {stats.newUsers30d > 0 && (
                <p className="text-muted-foreground text-xs">
                  +{stats.newUsers30d} this month
                </p>
              )}
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Businesses</CardDescription>
              <CardTitle className="text-3xl">
                {stats.totalBusinesses}
              </CardTitle>
              {stats.newBusinesses30d > 0 && (
                <p className="text-muted-foreground text-xs">
                  +{stats.newBusinesses30d} this month
                </p>
              )}
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Businesses</CardDescription>
              <CardTitle className="text-3xl">
                {stats.activeBusinesses}
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                of {stats.totalBusinesses} total
              </p>
            </CardHeader>
          </Card>

          <Card
            className={
              stats.pendingDomains > 0
                ? "border-orange-200 bg-orange-50"
                : undefined
            }
          >
            <CardHeader className="pb-3">
              <CardDescription>Pending Domain Requests</CardDescription>
              <CardTitle className="text-3xl">{stats.pendingDomains}</CardTitle>
              {stats.pendingDomains > 0 ? (
                <Link
                  href="/domains"
                  className="text-xs text-orange-600 hover:underline"
                >
                  Review requests →
                </Link>
              ) : (
                <p className="text-muted-foreground text-xs">None pending</p>
              )}
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Users</CardTitle>
                <Link
                  href="/users"
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  View all →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {stats.recentUsers.length === 0 ? (
                <p className="text-muted-foreground text-sm">No users yet.</p>
              ) : (
                <div className="divide-y">
                  {stats.recentUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {user.name ?? user.email}
                        </div>
                        {user.name && (
                          <div className="text-muted-foreground truncate text-xs">
                            {user.email}
                          </div>
                        )}
                      </div>
                      <div className="ml-3 flex shrink-0 items-center gap-2">
                        {user.platformRole === "PLATFORM_ADMIN" && (
                          <Badge variant="default" className="text-xs">
                            Admin
                          </Badge>
                        )}
                        <span className="text-muted-foreground text-xs">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Businesses</CardTitle>
                <Link
                  href="/businesses"
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  View all →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {stats.recentBusinesses.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No businesses yet.
                </p>
              ) : (
                <div className="divide-y">
                  {stats.recentBusinesses.map((business) => (
                    <div
                      key={business.id}
                      className="flex items-center justify-between py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {business.name}
                        </div>
                        <div className="text-muted-foreground truncate font-mono text-xs">
                          {business.subdomain}.{env.NEXT_PUBLIC_PLATFORM_DOMAIN}
                        </div>
                      </div>
                      <div className="ml-3 flex shrink-0 items-center gap-2">
                        <Badge
                          variant={
                            business.status === "active"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {business.status}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {new Date(business.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

export const metadata = {
  title: "Platform Dashboard",
};
