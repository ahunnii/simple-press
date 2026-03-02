/* eslint-disable @typescript-eslint/unbound-method */
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { useRouter } from "nextjs-toploader/app";
import { Toaster } from "sonner";

import { authClient } from "~/server/better-auth/client";
import { TooltipProvider } from "~/components/ui/tooltip";
import { CartProvider } from "~/providers/cart-context";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    // <ThemeProvider
    //   attribute="class"
    //   defaultTheme="system"
    //   enableSystem
    //   disableTransitionOnChange
    // >

    <CartProvider>
      <AuthUIProvider
        authClient={authClient}
        navigate={router.push}
        replace={router.replace}
        onSessionChange={() => {
          // Clear router cache (protected routes)
          router.refresh();
        }}
        signUp={{
          fields: ["terms"],
        }}
        additionalFields={{
          terms: {
            label: `I agree to SimplePress's Terms of Service and Privacy Policy`,
            type: "boolean",
            required: true,
          },
        }}
        Link={Link}
      >
        <TooltipProvider>{children}</TooltipProvider>

        <Toaster />
      </AuthUIProvider>{" "}
    </CartProvider>
    // </ThemeProvider>
  );
}
