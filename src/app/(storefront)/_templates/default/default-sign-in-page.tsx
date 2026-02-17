import Image from "next/image";
import Link from "next/link";
import { AuthView } from "@daveyplate/better-auth-ui";
import { IconTerminal } from "@tabler/icons-react";
import { ArrowLeft } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";

type Props = {
  redirectTo: string;
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};
export function DefaultSignInPage({ redirectTo, business }: Props) {
  return (
    <div className="bg-background flex min-h-screen">
      <div className="bg-primary relative hidden overflow-hidden lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-[url('/placeholder.svg')] bg-cover bg-center opacity-20" />
        <div className="text-primary-foreground relative z-10 flex flex-col justify-between p-12">
          <Link
            href="/"
            className="text-primary-foreground flex w-fit items-center gap-2 transition-opacity hover:opacity-80"
          >
            {business.siteContent?.logoUrl ? (
              <Image
                src={business.siteContent.logoUrl}
                alt={business.name}
                width={40}
                height={40}
                className="bg-primary rounded-full"
              />
            ) : (
              <span className="text-xl font-bold">{business.name}</span>
            )}
          </Link>

          <div className="max-w-md">
            <h1 className="mb-4 text-4xl font-bold text-balance">
              Welcome Back to {business.name} {redirectTo}
            </h1>
            <p className="text-primary-foreground/80 mb-8 text-lg">
              Sign in to keep track of your orders and manage your account.
            </p>
          </div>

          <div className="text-primary-foreground/60 text-sm">
            © 2026 {business.name}. All rights reserved.
            <span className="text-muted-foreground mx-2">|</span>
            Site by{" "}
            <a
              href="https://artisanalfutures.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground underline"
            >
              Artisanal Futures
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="border-b p-4 lg:hidden">
          <Link
            href="/"
            className="text-foreground flex w-fit items-center gap-2 transition-opacity hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Home</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
              <div className="bg-primary flex h-10 w-10 items-center justify-center rounded-lg">
                <IconTerminal className="text-primary-foreground h-6 w-6" />
              </div>
              <span className="text-foreground text-xl font-bold">
                {business.name}
              </span>
            </div>

            <AuthView view="SIGN_IN" redirectTo={redirectTo} />

            <div className="mt-8 hidden text-left lg:block">
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>

        <div className="text-muted-foreground border-t p-4 text-center text-xs">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
