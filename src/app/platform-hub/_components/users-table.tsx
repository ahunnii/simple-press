"use client";

import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";

type Props = {
  users: RouterOutputs["platform"]["listUsers"]["users"];
};

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
                <td className="text-muted-foreground px-6 py-4 text-sm whitespace-nowrap">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
