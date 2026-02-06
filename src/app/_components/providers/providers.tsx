/* eslint-disable @typescript-eslint/unbound-method */
"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";

import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

import { authClient } from "~/server/better-auth/client";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    // <ThemeProvider
    //   attribute="class"
    //   defaultTheme="system"
    //   enableSystem
    //   disableTransitionOnChange
    // >
    <AuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => {
        // Clear router cache (protected routes)
        router.refresh();
      }}
      social={{
        providers: ["discord"],
      }}
      Link={Link}
    >
      {children}

      <Toaster />
    </AuthUIProvider>
    // </ThemeProvider>
  );
}
