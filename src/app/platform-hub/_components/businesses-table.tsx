"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { getBusinessUrl } from "~/lib/business-url";
import { TEMPLATES } from "~/lib/constants";
import { getMerchantTermsStatus } from "~/lib/legal/terms-status";
import { formatDate } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

type Props = {
  businesses: RouterOutputs["platform"]["listBusinesses"]["businesses"];
};

function MerchantTermsBadge({
  memberships,
}: {
  memberships: RouterOutputs["platform"]["listBusinesses"]["businesses"][number]["memberships"];
}) {
  const status = getMerchantTermsStatus(memberships);

  if (status.state === "none") {
    return <Badge variant="destructive">No acceptance on record</Badge>;
  }

  if (status.state === "current") {
    return (
      <div className="flex flex-col gap-0.5">
        <Badge variant="success">Accepted</Badge>
        <span className="text-muted-foreground text-xs">
          {formatDate(status.acceptedAt)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <Badge variant="warning">Outdated version</Badge>
      <span className="text-muted-foreground text-xs">
        {formatDate(status.acceptedAt)}
      </span>
    </div>
  );
}

function StripeBadge({
  stripeAccountId,
  chargesEnabled,
}: {
  stripeAccountId: string | null;
  chargesEnabled: boolean;
}) {
  if (!stripeAccountId) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }
  return chargesEnabled ? (
    <Badge variant="success">Connected</Badge>
  ) : (
    <Badge variant="warning">Charges off</Badge>
  );
}

function templateName(templateId: string): string {
  return TEMPLATES.find((t) => t.id === templateId)?.name ?? templateId;
}

export function BusinessesTable({ businesses }: Props) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <caption className="sr-only">Platform businesses</caption>
          <thead className="border-b">
            <tr>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Business
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Domain
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Status
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Template
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Stripe
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Members
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Merchant Terms
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Owner
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Created
              </th>
              <th scope="col" className="px-6 py-3">
                <span className="sr-only">Links</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {businesses.map((business) => (
              <tr key={business.id} className="hover:bg-muted/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/businesses/${business.id}`}>
                    <div className="text-foreground font-medium">
                      {business.name}
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    <div className="text-foreground">{business.subdomain}</div>
                    {business.customDomain && (
                      <div className="text-muted-foreground">
                        {business.customDomain}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    variant={
                      business.status === "active" ? "default" : "secondary"
                    }
                  >
                    {business.status}
                  </Badge>
                </td>
                <td className="text-foreground px-6 py-4 text-sm whitespace-nowrap">
                  {templateName(business.templateId)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StripeBadge
                    stripeAccountId={business.stripeAccountId}
                    chargesEnabled={business.stripeChargesEnabled}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-foreground text-sm">
                    {business._count.memberships}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <MerchantTermsBadge memberships={business.memberships} />
                </td>
                <td className="text-muted-foreground px-6 py-4 text-sm whitespace-nowrap">
                  {business.ownerEmail}
                </td>
                <td className="text-muted-foreground px-6 py-4 text-sm whitespace-nowrap">
                  {formatDate(business.createdAt)}
                </td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  <Button asChild variant="ghost" size="icon">
                    <a
                      href={getBusinessUrl({
                        subdomain: business.subdomain,
                        customDomain: business.customDomain,
                        domainStatus: business.domainStatus,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${business.name} storefront`}
                      title="Open storefront"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
