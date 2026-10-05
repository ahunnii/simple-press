import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { AddMemberButton } from "../../_components/add-member-button";
import { BusinessMembersTable } from "../../_components/business-members-table";
import { PlatformTrailHeader } from "../../_components/platform-trail-header";
import { BusinessContentTransferCard } from "./_components/business-content-transfer-card";
import { BusinessFeatureFlags } from "./_components/business-feature-flags";
import { BusinessHealthCard } from "./_components/business-health-card";
import { BusinessInvitesList } from "./_components/business-invites-list";
import { BusinessLinks } from "./_components/business-links";
import { BusinessStatusControl } from "./_components/business-status-control";
import { BusinessTemplateControl } from "./_components/business-template-control";
import { CopyBusinessContextButton } from "./_components/copy-business-context-button";
import { EditBusinessBasicsDialog } from "./_components/edit-business-basics-dialog";
import { InviteMemberButton } from "./_components/invite-member-button";

type Props = {
  params: Promise<{ businessId: string }>;
};

export default async function PlatformBusinessDetailPage({ params }: Props) {
  const { businessId } = await params;
  const business = await api.platform.getBusiness(businessId).catch(() => null);

  if (!business) {
    notFound();
  }

  const [{ flags, disabledByDependency }, templateOptions, invites] =
    await Promise.all([
      api.platform.getBusinessFlags({ businessId }),
      api.platformBusiness.listTemplateOptions({ businessId }),
      api.platformInvites.list({ businessId }),
    ]);
  const wordpressExportEnabled =
    flags.wordpressExport === true &&
    !disabledByDependency.includes("wordpressExport");

  return (
    <>
      <PlatformTrailHeader
        breadcrumbs={[
          { label: "Businesses", href: "/businesses" },
          { label: business.name },
        ]}
      />
      <div className="admin-container">
        <div className="space-y-6">
          <div className="admin-header flex-wrap gap-4">
            <h1 className="text-2xl font-bold">{business.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <BusinessLinks
                businessId={business.id}
                subdomain={business.subdomain}
                customDomain={business.customDomain}
                domainStatus={business.domainStatus}
              />
              <CopyBusinessContextButton businessId={business.id} />
            </div>
          </div>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{business.name}</CardTitle>
                  <CardDescription>
                    {business.subdomain}.
                    {process.env.NEXT_PUBLIC_PLATFORM_DOMAIN}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <EditBusinessBasicsDialog
                    businessId={business.id}
                    name={business.name}
                    ownerEmail={business.ownerEmail}
                    supportEmail={business.supportEmail}
                  />
                  <BusinessStatusControl
                    businessId={business.id}
                    businessName={business.name}
                    status={business.status}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground font-medium">
                    Business ID
                  </dt>
                  <dd className="mt-1 font-mono text-xs">{business.id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">Slug</dt>
                  <dd className="mt-1">{business.slug}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">
                    Subdomain
                  </dt>
                  <dd className="mt-1">{business.subdomain}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">
                    Custom Domain
                  </dt>
                  <dd className="mt-1">{business.customDomain ?? "None"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">
                    Domain Status
                  </dt>
                  <dd className="mt-1">{business.domainStatus}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">
                    Template
                  </dt>
                  <dd className="mt-1">
                    <BusinessTemplateControl
                      businessId={business.id}
                      businessName={business.name}
                      currentTemplateId={templateOptions.currentTemplateId}
                      options={templateOptions.options}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">
                    Owner Email
                  </dt>
                  <dd className="mt-1">{business.ownerEmail}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">
                    Support Email
                  </dt>
                  <dd className="mt-1">{business.supportEmail ?? "None"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">
                    Onboarding Complete
                  </dt>
                  <dd className="mt-1">
                    {business.onboardingComplete ? "Yes" : "No"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground font-medium">
                    Created At
                  </dt>
                  <dd className="mt-1">
                    {new Date(business.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <BusinessHealthCard businessId={business.id} />

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Users with access to this business
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <InviteMemberButton businessId={business.id} />
                  <AddMemberButton businessId={business.id} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {business.memberships.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  This business has no team members yet.
                </p>
              ) : (
                <BusinessMembersTable memberships={business.memberships} />
              )}
              <div className="mt-6 space-y-2">
                <h3 className="text-sm font-medium">Email invites</h3>
                <BusinessInvitesList
                  businessId={business.id}
                  pendingInvites={invites.pendingInvites}
                  expiredInvites={invites.expiredInvites}
                />
              </div>
            </CardContent>
          </Card>

          <BusinessContentTransferCard
            businessId={business.id}
            businessName={business.name}
            wordpressExportEnabled={wordpressExportEnabled}
          />

          <BusinessFeatureFlags businessId={business.id} initialFlags={flags} />
        </div>
      </div>
    </>
  );
}
