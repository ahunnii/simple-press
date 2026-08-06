import { CheckCircle2 } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { SignUp } from "~/components/auth/sign-up";

import { DefaultAuthShell } from "./default-auth-shell";

const BENEFITS = [
  "Access your orders and account history",
  "Your account works across all SimplePress stores",
  "Engage with the shop by leaving product reviews and testimonials",
];

type Props = {
  business: RouterOutputs["business"]["simplifiedGet"];
};

/**
 * Used at both store subdomains (business != null) and the platform root
 * (business == null — e.g. an invited team member creating their account).
 */
export function DefaultSignUpPage({ business }: Props) {
  const isPlatformRoot = !business;

  return (
    <DefaultAuthShell
      business={business}
      headline={
        isPlatformRoot ? "Create your account" : `Join ${business.name}`
      }
      subhead="Create your SimplePress account to track orders, engage with the shop, and enjoy a seamless shopping experience."
      // Benefits
      beforeCallout={
        <div className="space-y-4">
          {BENEFITS.map((benefit) => (
            <div key={benefit} className="flex items-start gap-3">
              <div className="bg-primary-foreground/20 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="text-primary-foreground/90 text-sm">{benefit}</p>
            </div>
          ))}
        </div>
      }
      calloutClassName="mt-8"
      callout={
        <>
          <span className="font-semibold">One account, all stores.</span>{" "}
          You&apos;re creating a SimplePress platform account
          {isPlatformRoot ? "" : ` — not just an account for ${business.name}`}.
          If you already shop at another SimplePress store, you already have an
          account. Just sign in.
        </>
      }
      badgeView="sign-up"
      legalFooter="sign-up"
      scrollable
    >
      <SignUp className="max-w-full" />
    </DefaultAuthShell>
  );
}
