import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, TicketPercent } from "lucide-react";

import { checkBusiness } from "~/lib/check-business";
import { deactivateExpiredDiscountCodes } from "~/lib/deactivate-expired-discounts";
import { db } from "~/server/db";
import { Button } from "~/components/ui/button";

import { AdminEmpty } from "../_components/admin-empty";
import { TrailHeader } from "../_components/trail-header";
import { DiscountsTable } from "./_components/discounts-table";

export default async function DiscountsPage() {
  // Get session
  const business = await checkBusiness();

  if (!business) {
    redirect("/admin/welcome");
  }

  await deactivateExpiredDiscountCodes(db, business.id);

  // Get all discount codes
  const discounts = await db.discountCode.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Discount Codes" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Discount Codes</h1>
            <p>Create and manage discount codes for your store</p>
          </div>
          <div className="flex gap-3">
            <Button asChild size="sm">
              <Link href="/admin/discounts/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Discount
              </Link>
            </Button>
          </div>
        </div>

        {/* Discounts List */}
        {discounts.length === 0 ? (
          <AdminEmpty
            icon={TicketPercent}
            title="No discount codes yet"
            description="Create your first discount code to offer special deals"
            action={
              <Button asChild>
                <Link href="/admin/discounts/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Discount
                </Link>
              </Button>
            }
          />
        ) : (
          <DiscountsTable discounts={discounts} />
        )}
      </div>
    </>
  );
}
