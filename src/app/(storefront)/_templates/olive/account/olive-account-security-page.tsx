"use client";

import { SecuritySettingsCards } from "~/components/account/security-settings-cards";

import { OliveReveal } from "../shared";
import { OliveAccountLayout } from "./olive-account-layout";

/**
 * OliveAccountSecurityPage — prop-less by contract (mounted with no props in
 * `tests/templates/account-render.test.tsx`). Wraps better-auth-ui's
 * `SecuritySettingsCards` verbatim.
 */
export function OliveAccountSecurityPage() {
  return (
    <OliveAccountLayout
      heading="Security"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Security" },
      ]}
    >
      <OliveReveal>
        <SecuritySettingsCards />
      </OliveReveal>
    </OliveAccountLayout>
  );
}
