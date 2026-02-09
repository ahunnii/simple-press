import { getSession } from "~/server/better-auth/server";
import { db } from "~/server/db";

export default async function WelcomePage() {
  const session = await getSession();
  const business = await db.business.findUnique({
    where: { id: session?.user.businessId ?? undefined },
    select: {
      name: true,
      subdomain: true,
      customDomain: true,
      domainStatus: true,
      stripeAccountId: true,
    },
  });

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1>Welcome to {business?.name}! 🎉</h1>

      {/* Setup Checklist
      <SetupChecklist>
        <ChecklistItem
          completed={true}
          title="Create your store"
          description="You're all set up!"
        />

        <ChecklistItem
          completed={false}
          title="Connect Stripe"
          description="Start accepting payments"
          action={
            <Button href="/admin/settings/payments">Connect Stripe</Button>
          }
        />

        <ChecklistItem
          completed={business.domainStatus === "active"}
          title="Set up custom domain"
          description={
            business.customDomain
              ? `Waiting for DNS: ${business.customDomain}`
              : "Optional: Use your own domain"
          }
          action={
            business.customDomain && business.domainStatus === "pending_dns" ? (
              <DNSInstructions domain={business.customDomain} />
            ) : !business.customDomain ? (
              <Button href="/admin/settings/domain">Add Domain</Button>
            ) : null
          }
        />

        <ChecklistItem
          completed={false}
          title="Add your first product"
          description="Start selling"
          action={<Button href="/admin/products/new">Add Product</Button>}
        />
      </SetupChecklist>

      {/* Preview Links */}
      {/* <div className="mt-8 rounded bg-blue-50 p-4">
        <h3>Your Store is Live!</h3>
        <p className="mb-2 text-sm text-gray-600">Preview your storefront:</p>
        <a
          href={`https://${business.subdomain}.myapplication.com`}
          target="_blank"
          className="text-blue-600 underline"
        >
          {business.subdomain}.myapplication.com
        </a>

        {business.customDomain && business.domainStatus === "active" && (
          <div className="mt-2">
            <a
              href={`https://${business.customDomain}`}
              target="_blank"
              className="text-blue-600 underline"
            >
              {business.customDomain}
            </a>
          </div>
        )}
      </div> */}
    </div>
  );
}
