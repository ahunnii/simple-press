import type { Customer } from "generated/prisma";
import Link from "next/link";
import { Eye } from "lucide-react";

import { formatPrice } from "~/lib/prices";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

type Props = {
  customers: Customer[];
};

export function CustomersTable({ customers }: Props) {
  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <caption className="sr-only">Customers</caption>
          <thead className="border-b bg-muted">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Orders
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Total Spent
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Marketing
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Joined
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium tracking-wider text-muted-foreground uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {customers.map((customer) => {
              const name =
                [customer.firstName, customer.lastName]
                  .filter(Boolean)
                  .join(" ") || null;

              return (
                <tr key={customer.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-foreground">
                      {name ?? <span className="text-muted-foreground">—</span>}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {customer.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {customer.orderCount}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {formatPrice(customer.totalSpent)}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        customer.acceptsMarketing ? "default" : "secondary"
                      }
                    >
                      {customer.acceptsMarketing ? "Yes" : "No"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {formatDate(customer.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/customers/${customer.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
