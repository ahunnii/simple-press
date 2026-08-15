"use client";

import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { PLATFORM_TERMS_VERSION } from "~/lib/legal/policy-versions";
import { formatDate } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";

type Props = {
  users: RouterOutputs["platform"]["listUsers"]["users"];
};

function PlatformTermsCell({
  termsAcceptedAt,
  termsVersion,
}: {
  termsAcceptedAt: Date | null;
  termsVersion: string | null;
}) {
  if (!termsAcceptedAt) {
    // Accounts created via Discord OAuth never see a terms checkbox, so they
    // are indistinguishable in the data from accounts that predate this
    // feature entirely. Either way, "not recorded" is the honest label —
    // never "declined", which this data cannot support.
    return <span className="text-muted-foreground text-sm">Not recorded</span>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      <Badge
        variant={
          termsVersion === PLATFORM_TERMS_VERSION ? "success" : "warning"
        }
      >
        {termsVersion === PLATFORM_TERMS_VERSION
          ? "Accepted"
          : "Outdated version"}
      </Badge>
      <span className="text-muted-foreground text-xs">
        {formatDate(termsAcceptedAt)}
      </span>
    </div>
  );
}

export function UsersTable({ users }: Props) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <caption className="sr-only">Platform users</caption>
          <thead className="border-b">
            <tr>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                User
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Platform Role
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Memberships
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Platform Terms
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
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-muted/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/users/${user.id}`}>
                    <div>
                      <div className="text-foreground font-medium">
                        {user.name}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {user.email}
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    variant={
                      user.platformRole === "PLATFORM_ADMIN"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {user.platformRole}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-foreground text-sm">
                    {user._count.memberships}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <PlatformTermsCell
                    termsAcceptedAt={user.termsAcceptedAt}
                    termsVersion={user.termsVersion}
                  />
                </td>
                <td className="text-muted-foreground px-6 py-4 text-sm whitespace-nowrap">
                  {formatDate(user.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
