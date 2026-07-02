"use client";

import type { DiscountCode } from "generated/prisma";
import Link from "next/link";
import { Edit, Trash } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

type DiscountsTableProps = {
  discounts: DiscountCode[];
};

export function DiscountsTable({ discounts }: DiscountsTableProps) {
  const formatValue = (type: string, value: number) => {
    if (type === "percentage") {
      return `${value}% off`;
    }
    if (type === "free_shipping") {
      return "Free shipping";
    }
    return `$${(value / 100).toFixed(2)} off`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "No expiry";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const isExpired = (date: Date | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const isScheduled = (date: Date | null) => {
    if (!date) return false;
    return new Date(date) > new Date();
  };

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <caption className="sr-only">Discount codes</caption>
          <thead className="border-b">
            <tr>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium uppercase"
              >
                Code
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium uppercase"
              >
                Discount
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium uppercase"
              >
                Usage
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium uppercase"
              >
                Expires
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium uppercase"
              >
                Status
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-right text-xs font-medium uppercase"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {discounts.map((discount) => (
              <tr key={discount.id} className="hover:bg-muted/50">
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/discounts/${discount.id}`}
                    className="text-foreground font-mono font-semibold hover:underline"
                  >
                    {discount.code}
                  </Link>
                </td>
                <td className="text-foreground px-6 py-4 text-sm">
                  {formatValue(discount.type, discount.value)}
                </td>
                <td className="text-muted-foreground px-6 py-4 text-sm">
                  {discount.usageCount}
                  {discount.usageLimit && ` / ${discount.usageLimit}`}
                </td>
                <td className="text-muted-foreground px-6 py-4 text-sm">
                  {formatDate(discount.expiresAt)}
                  {isExpired(discount.expiresAt) && (
                    <Badge variant="destructive" className="ml-2">
                      Expired
                    </Badge>
                  )}
                </td>
                <td className="px-6 py-4">
                  {discount.active && isScheduled(discount.startsAt) ? (
                    <Badge variant="outline">
                      Scheduled · {formatDate(discount.startsAt)}
                    </Badge>
                  ) : (
                    <Badge variant={discount.active ? "default" : "secondary"}>
                      {discount.active ? "Active" : "Inactive"}
                    </Badge>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/discounts/${discount.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash className="text-destructive h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
