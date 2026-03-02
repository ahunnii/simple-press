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
    <Card className="bg-linear-to-b from-gray-50 to-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Business
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Domain
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Members
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {businesses.map((business) => (
              <tr key={business.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <Link href={`/admin/platform/businesses/${business.id}`}>
                    <div className="font-medium text-gray-900">
                      {business.name}
                    </div>
                  </Link>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="text-sm">
                    <div className="text-gray-900">{business.subdomain}</div>
                    {business.customDomain && (
                      <div className="text-gray-500">{business.customDomain}</div>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <Badge
                    variant={
                      business.status === "active" ? "default" : "secondary"
                    }
                  >
                    {business.status}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="text-sm text-gray-900">
                    {business._count.memberships}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {business.ownerEmail}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
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
