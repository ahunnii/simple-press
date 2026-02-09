"use client";

import type { DiscountCode } from "generated/prisma";
import { Edit, Trash } from "lucide-react";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

// type Discount = {
//   id: string;
//   code: string;
//   type: string;
//   value: number;
//   active: boolean;
//   usageLimit: number | null;
//   usageCount: number;
//   expiresAt: Date | null;
// };

type DiscountsTableProps = {
  discounts: DiscountCode[];
};

export function DiscountsTable({ discounts }: DiscountsTableProps) {
  const formatValue = (type: string, value: number) => {
    if (type === "percentage") {
      return `${value}% off`;
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

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Discount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Usage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Expires
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y bg-white">
            {discounts.map((discount) => (
              <tr key={discount.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span className="font-mono font-semibold text-gray-900">
                    {discount.code}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatValue(discount.type, discount.value)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {discount.usageCount}
                  {discount.usageLimit && ` / ${discount.usageLimit}`}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDate(discount.expiresAt)}
                  {isExpired(discount.expiresAt) && (
                    <Badge variant="destructive" className="ml-2">
                      Expired
                    </Badge>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Badge variant={discount.active ? "default" : "secondary"}>
                    {discount.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/discounts/${discount.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash className="h-4 w-4 text-red-600" />
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
