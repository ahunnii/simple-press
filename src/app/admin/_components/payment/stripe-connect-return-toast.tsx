"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  describeStripeConnectReturn,
  STRIPE_CONNECT_RETURN_PARAMS,
} from "./stripe-connect-return";

function StripeConnectReturnToastInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // Guards against StrictMode's double effect run firing the toast twice.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;

    const result = describeStripeConnectReturn({
      stripe: searchParams.get("stripe"),
      stripeError: searchParams.get("stripe_error"),
      stripeErrorDescription: searchParams.get("stripe_error_description"),
    });
    if (!result) return;
    handled.current = true;

    if (result.kind === "success") {
      toast.success(result.message);
    } else if (result.kind === "info") {
      toast.info(result.message);
    } else {
      toast.error(result.message, { description: result.description });
    }

    // Strip only our params so a refresh doesn't replay the toast.
    const remaining = new URLSearchParams(searchParams.toString());
    for (const key of STRIPE_CONNECT_RETURN_PARAMS) remaining.delete(key);
    const query = remaining.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [searchParams, router, pathname]);

  return null;
}

/**
 * Shows a toast for the result of the Stripe Connect OAuth round trip
 * (`?stripe=connected` / `?stripe_error=...`) and then cleans those params out
 * of the URL. Mount it next to anything that starts a Stripe connect.
 */
export function StripeConnectReturnToast() {
  return (
    <Suspense fallback={null}>
      <StripeConnectReturnToastInner />
    </Suspense>
  );
}
