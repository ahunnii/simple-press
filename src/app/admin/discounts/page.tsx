import { Plus } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { checkBusiness } from "~/lib/check-business";
import { db } from "~/server/db";
import { DiscountsTable } from "./_components/discounts-table";

export default async function DiscountsPage() {
  // Get session
  const business = await checkBusiness();

  if (!business) {
    redirect("/admin/welcome");
  }

  // Get all discount codes
  // const discounts = await db.discountCode.findMany({
  //   where: { businessId: user.businessId },
  //   orderBy: { createdAt: "desc" },
  // });
  const discounts = [] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Discount Codes</h1>
            <p className="mt-1 text-gray-600">
              Create and manage discount codes for your store
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/discounts/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Discount
            </Link>
          </Button>
        </div>

        {/* Discounts List */}
        {/* {discounts.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No discount codes yet</CardTitle>
              <CardDescription>
                Create your first discount code to offer special deals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/admin/discounts/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Discount
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DiscountsTable discounts={discounts} />
        )} */}
      </div>
    </div>
  );
}
