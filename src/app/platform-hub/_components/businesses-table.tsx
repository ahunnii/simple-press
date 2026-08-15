"use client";

import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { getMerchantTermsStatus } from "~/lib/legal/terms-status";
import { formatDate } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
