"use client";

import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";

type Props = {
  businesses: RouterOutputs["platform"]["listBusinesses"]["businesses"];
};

export function BusinessesTable({ businesses }: Props) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <caption className="sr-only">Platform businesses</caption>
          <thead className="border-b">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Business
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Domain
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Members
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Owner
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {businesses.map((business) => (
              <tr key={business.id} className="hover:bg-muted/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/admin/platform/businesses/${business.id}`}>
                    <div className="font-medium text-foreground">
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
                  <span className="text-sm text-foreground">
                    {business._count.memberships}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-muted-foreground">
                  {business.ownerEmail}
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-muted-foreground">
                  {new Date(business.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
