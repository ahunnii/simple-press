"use client";

import { AccountSettingsCards } from "~/components/account/account-settings-cards";

import { OliveReveal } from "../shared";
import { OliveAccountLayout } from "./olive-account-layout";

/**
 * OliveAccountSettingsPage — prop-less by contract (mounted with no props in
 * `tests/templates/account-render.test.tsx`). Wraps better-auth-ui's
 * `AccountSettingsCards` verbatim; the `.olive-account` bridge on the layout
 * wrapper reskins its shadcn primitives.
 */
export function OliveAccountSettingsPage() {
  return (
    <OliveAccountLayout
      heading="Settings"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Settings" },
      ]}
    >
      <OliveReveal>
        <AccountSettingsCards />
      </OliveReveal>
    </OliveAccountLayout>
  );
}
