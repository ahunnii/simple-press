export default async function PaymentsSettings() {
  const session = await getSession();
  const business = await prisma.business.findUnique({
    where: { id: session.businessId },
  });

  if (!business.stripeAccountId) {
    return (
      <div>
        <h2>Payment Processing</h2>
        <p>Connect Stripe to start accepting payments from customers.</p>

        <ConnectStripeButton />

        <div className="mt-4 rounded bg-yellow-50 p-4">
          <p className="text-sm">
            ⚠️ Your store is visible but customers cannot checkout until Stripe
            is connected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>Payment Processing</h2>
      <div className="rounded bg-green-50 p-4">
        <p className="font-medium">✓ Stripe Connected</p>
        <p className="text-sm text-gray-600">
          Account ID: {business.stripeAccountId}
        </p>
      </div>

      {/* Mark onboarding complete */}
      <CompleteOnboarding businessId={business.id} />
    </div>
  );
}

// After Stripe connection
async function completeOnboarding(businessId: string) {
  await prisma.business.update({
    where: { id: businessId },
    data: { onboardingComplete: true },
  });
}
