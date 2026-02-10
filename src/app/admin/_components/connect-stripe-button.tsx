// // app/admin/settings/_components/stripe-connect-button.tsx
// "use client";

// import { ExternalLink } from "lucide-react";

// import { getCallbackUrl } from "~/lib/subdomain";
// import { Button } from "~/components/ui/button";

// type StripeConnectButtonProps = {
//   businessId: string;
//   isConnected: boolean;
//   subdomain: string;
// };

// export function ConnectStripeButton({
//   businessId,
//   isConnected,
//   subdomain,
// }: StripeConnectButtonProps) {
//   const handleConnect = () => {
//     const clientId = process.env.NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID;
//     const redirectUri = getCallbackUrl();

//     // Encode businessId AND subdomain in state
//     const state = JSON.stringify({ businessId, subdomain });
//     const encodedState = Buffer.from(state).toString("base64");

//     const stripeUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodedState}`;

//     window.location.href = stripeUrl;
//   };

//   if (isConnected) {
//     return (
//       <div className="flex items-center gap-3">
//         <div className="flex-1">
//           <p className="text-sm font-medium text-green-600">
//             ✓ Stripe Connected
//           </p>
//           <p className="text-xs text-gray-500">
//             Your Stripe account is connected and ready to accept payments
//           </p>
//         </div>
//         <Button variant="outline" size="sm" asChild>
//           <a
//             href="https://dashboard.stripe.com"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             Dashboard
//             <ExternalLink className="ml-2 h-4 w-4" />
//           </a>
//         </Button>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-3">
//       <p className="text-sm text-gray-600">
//         Connect your Stripe account to start accepting payments
//       </p>
//       <Button onClick={handleConnect}>Connect with Stripe</Button>
//     </div>
//   );
// }

// app/admin/settings/_components/stripe-connect-button.tsx
"use client";

import { useState } from "react";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { encodeOAuthState, getCallbackUrl } from "~/lib/domain";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

type StripeConnectButtonProps = {
  businessId: string;
  stripeAccountId: string | null;
};

export function ConnectStripeButton({
  businessId,
  stripeAccountId,
}: StripeConnectButtonProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID;

    if (!clientId) {
      toast.error("Stripe not configured");
      return;
    }

    // Get current URL to return to after OAuth
    const returnUrl = window.location.href.split("?")[0]; // Remove query params

    // Encode state
    const state = encodeOAuthState({
      businessId,
      returnUrl: returnUrl ?? "",
    });

    // Build Stripe OAuth URL
    const callbackUrl = getCallbackUrl();
    const stripeUrl = new URL("https://connect.stripe.com/oauth/authorize");
    stripeUrl.searchParams.set("response_type", "code");
    stripeUrl.searchParams.set("client_id", clientId);
    stripeUrl.searchParams.set("scope", "read_write");
    stripeUrl.searchParams.set("redirect_uri", callbackUrl);
    stripeUrl.searchParams.set("state", state);

    // Redirect to Stripe
    window.location.href = stripeUrl.toString();
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Stripe? You won't be able to accept payments.")) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const response = await fetch("/api/stripe/connect/disconnect", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to disconnect");

      toast.success("Stripe disconnected");
      window.location.reload();
    } catch (error) {
      toast.error("Failed to disconnect");
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (stripeAccountId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Connected
          </Badge>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">
            Account ID
          </label>
          <div className="mt-1 rounded border bg-gray-50 p-3 font-mono text-sm">
            {stripeAccountId}
          </div>
        </div>

        <p className="text-sm text-gray-600">
          Your Stripe account is connected. Payments are deposited directly to
          your bank.
        </p>

        <div className="flex gap-3">
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Dashboard
            </a>
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              "Disconnect"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <XCircle className="h-3 w-3" />
          Not Connected
        </Badge>
      </div>

      <p className="text-sm text-gray-600">
        Connect your Stripe account to start accepting payments.
      </p>

      <Button onClick={handleConnect}>Connect with Stripe</Button>
    </div>
  );
}
