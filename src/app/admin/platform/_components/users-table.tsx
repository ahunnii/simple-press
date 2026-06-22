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
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Platform Role
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Memberships
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-muted/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/admin/platform/users/${user.id}`}>
                    <div>
                      <div className="font-medium text-foreground">
                        {user.name}
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
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
                  <span className="text-sm text-foreground">
                    {user._count.memberships}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm whitespace-nowrap text-muted-foreground">
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
