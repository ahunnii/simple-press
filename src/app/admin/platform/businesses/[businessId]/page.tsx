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

import { TrailHeader } from "../../../_components/trail-header";
import { AddMemberButton } from "../../_components/add-member-button";
import { BusinessMembersTable } from "../../_components/business-members-table";

type Props = {
  params: Promise<{ businessId: string }>;
};

export default async function BusinessDetailPage({ params }: Props) {
  const { businessId } = await params;
  const business = await api.platform.getBusiness(businessId).catch(() => null);

  if (!business) {
    notFound();
  }

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Platform Admin", href: "/admin/platform/users" },
          { label: "Businesses", href: "/admin/platform/businesses" },
          { label: business.name },
        ]}
      />
      <div className="admin-container">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{business.name}</CardTitle>
                  <CardDescription>
                    {business.subdomain}.
                    {process.env.NEXT_PUBLIC_PLATFORM_DOMAIN}
                  </CardDescription>
                </div>
                <Badge
                  variant={business.status === "active" ? "default" : "secondary"}
                >
                  {business.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="font-medium text-muted-foreground">
                    Business ID
                  </dt>
                  <dd className="mt-1 font-mono text-xs">{business.id}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">Slug</dt>
                  <dd className="mt-1">{business.slug}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">
                    Subdomain
                  </dt>
                  <dd className="mt-1">{business.subdomain}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">
                    Custom Domain
                  </dt>
                  <dd className="mt-1">{business.customDomain ?? "None"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">
                    Domain Status
                  </dt>
                  <dd className="mt-1">{business.domainStatus}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">
                    Template
                  </dt>
                  <dd className="mt-1">{business.templateId}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">
                    Owner Email
                  </dt>
                  <dd className="mt-1">{business.ownerEmail}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">
                    Support Email
                  </dt>
                  <dd className="mt-1">{business.supportEmail ?? "None"}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">
                    Onboarding Complete
                  </dt>
                  <dd className="mt-1">
                    {business.onboardingComplete ? "Yes" : "No"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-muted-foreground">
                    Created At
                  </dt>
                  <dd className="mt-1">
                    {new Date(business.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Users with access to this business
                  </CardDescription>
                </div>
                <AddMemberButton businessId={business.id} />
              </div>
            </CardHeader>
            <CardContent>
              {business.memberships.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This business has no team members yet.
                </p>
              ) : (
                <BusinessMembersTable memberships={business.memberships} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
