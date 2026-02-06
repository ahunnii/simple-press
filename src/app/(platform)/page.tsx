import { headers } from "next/headers";
import { PlatformLanding } from "./_components/platform-landing";

export default async function PlatformLandingPage() {
  const hostname = (await headers()).get("host");

  // If this is the platform domain, show landing
  if (hostname === "app.localhost:4000") {
    return <PlatformLanding />;
  }

  // Otherwise, this is a tenant domain - show their storefront
  // (handled by middleware)
}
