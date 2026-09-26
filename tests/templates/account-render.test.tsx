import type { AuthClient } from "@better-auth-ui/react";
import type { ComponentType, ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  AUTH_BASE_PATHS,
  AUTH_VIEW_PATHS,
  SETTINGS_VIEW_PATHS,
} from "~/lib/auth-paths";
import { AuthProvider } from "~/components/auth/auth-provider";
// Importing components directly (like checkout-render.test.tsx) rather than
// driving off `getTemplate()` from the registry. The registry module
// statically imports every page slot for every template — including server
// components that pull in `~/trpc/server` -> `~/server/db` (Prisma +
// prisma-field-encryption) — and that import graph throws in the `dom`
// project (no Node `crypto` global in happy-dom) long before any test body
// runs. Importing only the 22 account components sidesteps that unrelated,
// pre-existing graph problem entirely.
import type {
  InvoicesPageTemplateProps,
  RewardsPageTemplateProps,
  SubscriptionsPageTemplateProps,
} from "~/app/(storefront)/_templates/types";
import { BambooAccountSecurityPage } from "~/app/(storefront)/_templates/bamboo/account/bamboo-account-security-page";
import { BambooAccountSettingsPage } from "~/app/(storefront)/_templates/bamboo/account/bamboo-account-settings-page";
import { BambooInvoicesPage } from "~/app/(storefront)/_templates/bamboo/account/bamboo-invoices-page";
import { BambooRewardsPage } from "~/app/(storefront)/_templates/bamboo/account/bamboo-rewards-page";
import { BambooSubscriptionsPage } from "~/app/(storefront)/_templates/bamboo/account/bamboo-subscriptions-page";
import { DarkTrendAccountSecurityPage } from "~/app/(storefront)/_templates/dark-trend/account/dark-trend-account-security-page";
import { DarkTrendAccountSettingsPage } from "~/app/(storefront)/_templates/dark-trend/account/dark-trend-account-settings-page";
import { DefaultAccountSecurityPage } from "~/app/(storefront)/_templates/default/account/default-account-security-page";
import { DefaultAccountSettingsPage } from "~/app/(storefront)/_templates/default/account/default-account-settings-page";
import { ElegantAccountSecurityPage } from "~/app/(storefront)/_templates/elegant/account/elegant-account-security-page";
import { ElegantAccountSettingsPage } from "~/app/(storefront)/_templates/elegant/account/elegant-account-settings-page";
import { HappyBambooAccountSecurityPage } from "~/app/(storefront)/_templates/happy-bamboo/account/happy-bamboo-account-security-page";
import { HappyBambooAccountSettingsPage } from "~/app/(storefront)/_templates/happy-bamboo/account/happy-bamboo-account-settings-page";
import { ModernAccountSecurityPage } from "~/app/(storefront)/_templates/modern/account/modern-account-security-page";
import { ModernAccountSettingsPage } from "~/app/(storefront)/_templates/modern/account/modern-account-settings-page";
import { NoiseAccountSecurityPage } from "~/app/(storefront)/_templates/noise/account/noise-account-security-page";
import { NoiseAccountSettingsPage } from "~/app/(storefront)/_templates/noise/account/noise-account-settings-page";
import { OliveAccountSecurityPage } from "~/app/(storefront)/_templates/olive/account/olive-account-security-page";
import { OliveAccountSettingsPage } from "~/app/(storefront)/_templates/olive/account/olive-account-settings-page";
import { PinkAccountSecurityPage } from "~/app/(storefront)/_templates/pink/account/pink-account-security-page";
import { PinkAccountSettingsPage } from "~/app/(storefront)/_templates/pink/account/pink-account-settings-page";
import { PollenAccountSecurityPage } from "~/app/(storefront)/_templates/pollen/account/pollen-account-security-page";
import { PollenAccountSettingsPage } from "~/app/(storefront)/_templates/pollen/account/pollen-account-settings-page";
import { SledgeAccountSecurityPage } from "~/app/(storefront)/_templates/sledge/account/sledge-account-security-page";
import { SledgeAccountSettingsPage } from "~/app/(storefront)/_templates/sledge/account/sledge-account-settings-page";
import { ViiAccountSecurityPage } from "~/app/(storefront)/_templates/vii/account/vii-account-security-page";
import { ViiAccountSettingsPage } from "~/app/(storefront)/_templates/vii/account/vii-account-settings-page";

// --- Shared mocks, following the pattern in tests/templates/checkout-render.test.tsx ---

// tRPC react client: a recursive proxy whose hooks return inert results. Not
// currently reached by any account-settings/security component, but kept for
// parity with the checkout suite in case a future card wires one in.
vi.mock("~/trpc/react", () => {
  const hookResult = {
    data: undefined,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    mutate: () => undefined,
    mutateAsync: async () => undefined,
    reset: () => undefined,
  };
  const proxy: unknown = new Proxy(() => undefined, {
    get(_t, prop) {
      if (
        prop === "useQuery" ||
        prop === "useMutation" ||
        prop === "useSuspenseQuery"
      ) {
        return () => hookResult;
      }
      return proxy;
    },
    apply: () => hookResult,
  });
  return { api: proxy };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    refresh: () => undefined,
    prefetch: () => undefined,
    back: () => undefined,
  }),
  usePathname: () => "/account/settings",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("sonner", () => ({
  toast: Object.assign(() => undefined, {
    success: () => undefined,
    error: () => undefined,
  }),
}));

// Pink's account layout reads the *legacy* better-auth/react singleton
// directly (`authClient.useSession()`), independent of the `@better-auth-ui/
// react` context this test wires up below via <AuthProvider>. Without this
// mock, importing the real client would build a live better-auth/react
// instance whose `useSession` hook attempts a real fetch on mount.
vi.mock("~/server/better-auth/client", () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: false, error: null }),
  },
}));

// happy-dom does not implement IntersectionObserver. Bamboo/happy-bamboo's
// `FadeIn` (`whileInView`) and vii's `ViiReveal` both construct one on mount,
// so every template render would throw without this stub.
class MockIntersectionObserver {
  observe() {
    // no-op
  }
  unobserve() {
    // no-op
  }
  disconnect() {
    // no-op
  }
  takeRecords() {
    return [];
  }
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

/**
 * A stub `AuthClient` for the vendored `@better-auth-ui/react` provider.
 *
 * Every settings/security card ultimately calls `useSession(authClient)`,
 * which calls `authClient.getSession(...)` — this is the one method that
 * matters for a signed-out mount. `listAccounts`/`listSessions` are wired for
 * completeness (`ChangePassword`/`ActiveSessions` call them via
 * `useListAccounts`/`useListSessions`), but react-query short-circuits both
 * via `skipToken` while there is no session user id, so signed-out renders
 * never actually invoke them.
 */
const fakeAuthClient = {
  getSession: async () => null,
  listSessions: async () => [],
  listAccounts: async () => [],
} as unknown as AuthClient;

/**
 * Wraps children in the real `<AuthProvider>` (approach (a) from the task
 * brief) with a stub client and an explicit, per-render `QueryClient` — the
 * same shape `src/providers/providers.tsx` uses in production, minus the
 * reCAPTCHA/terms-field/basePaths wiring that isn't reachable from a
 * signed-out settings/security mount. This is more faithful than mocking
 * `@better-auth-ui/react` itself: it exercises the real `useAuth`/`useSession`
 * hooks the vendored settings cards depend on.
 */
function renderWithAuth(children: ReactNode) {
  return render(
    <AuthProvider
      authClient={fakeAuthClient}
      queryClient={new QueryClient()}
      navigate={() => undefined}
      basePaths={{ ...AUTH_BASE_PATHS }}
      viewPaths={{
        auth: { ...AUTH_VIEW_PATHS },
        settings: { ...SETTINGS_VIEW_PATHS },
      }}
      redirectTo="/"
      emailAndPassword={{
        enabled: true,
        forgotPassword: true,
        name: true,
        requireEmailVerification: true,
      }}
      avatar={{ enabled: false }}
    >
      {children}
    </AuthProvider>,
  );
}

// All 12 templates that ship their own account directory and register real
// `AccountSettingsPage`/`AccountSecurityPage` entries in the registry.
// `builders` and `coop` have no account dir and fall back to `default` there
// (`getTemplate()` spreads the default entry under a partial template) — that
// fallback wiring lives entirely in registry.ts, which this file avoids
// importing (see the comment above the imports), so it isn't re-asserted
// here. `default` itself is covered directly below.
type PageComponent = ComponentType<Record<string, never>>;

const SETTINGS_PAGES: [name: string, Page: PageComponent][] = [
  ["default", DefaultAccountSettingsPage],
  ["modern", ModernAccountSettingsPage],
  ["bamboo", BambooAccountSettingsPage],
  ["happy-bamboo", HappyBambooAccountSettingsPage],
  ["elegant", ElegantAccountSettingsPage],
  ["pollen", PollenAccountSettingsPage],
  ["noise", NoiseAccountSettingsPage],
  ["dark-trend", DarkTrendAccountSettingsPage],
  ["sledge", SledgeAccountSettingsPage],
  ["pink", PinkAccountSettingsPage],
  ["vii", ViiAccountSettingsPage],
  ["olive", OliveAccountSettingsPage],
];

const SECURITY_PAGES: [name: string, Page: PageComponent][] = [
  ["default", DefaultAccountSecurityPage],
  ["modern", ModernAccountSecurityPage],
  ["bamboo", BambooAccountSecurityPage],
  ["happy-bamboo", HappyBambooAccountSecurityPage],
  ["elegant", ElegantAccountSecurityPage],
  ["pollen", PollenAccountSecurityPage],
  ["noise", NoiseAccountSecurityPage],
  ["dark-trend", DarkTrendAccountSecurityPage],
  ["sledge", SledgeAccountSecurityPage],
  ["pink", PinkAccountSecurityPage],
  ["vii", ViiAccountSecurityPage],
  ["olive", OliveAccountSecurityPage],
];

describe("account settings/security pages render for every template", () => {
  it.each(SETTINGS_PAGES)(
    "%s AccountSettingsPage mounts without throwing",
    async (_name, Page) => {
      const { container } = renderWithAuth(<Page />);

      // Let the (stubbed, signed-out) session query settle before asserting,
      // so the pending `getSession()` microtask doesn't leak into the next
      // test. The DOM assertion itself is intentionally generic — this is a
      // mount smoke test, not a content/markup check.
      await waitFor(() => {
        expect(container.childElementCount).toBeGreaterThan(0);
      });
    },
  );

  it.each(SECURITY_PAGES)(
    "%s AccountSecurityPage mounts without throwing",
    async (_name, Page) => {
      const { container } = renderWithAuth(<Page />);

      await waitFor(() => {
        expect(container.childElementCount).toBeGreaterThan(0);
      });
    },
  );
});

// ---------------------------------------------------------------------------
// bamboo Subscriptions/Invoices/Rewards — flag-gated account pages added
// 2026-09-25. `business` is required by each page's props type but unused by
// the bamboo components themselves, so a minimal object cast (same pattern as
// `checkout-render.test.tsx`'s `BusinessProp` fixture) stands in for it.
// ---------------------------------------------------------------------------

const fakeBusiness = { id: "biz_test", name: "Test Store" } as unknown;

const noSubscriptions: SubscriptionsPageTemplateProps["subscriptions"] = [];

const oneSubscription: SubscriptionsPageTemplateProps["subscriptions"] = [
  {
    id: "sub_1",
    status: "active",
    productName: "Coffee Beans",
    variantName: "Dark Roast",
    productSlug: "coffee-beans",
    quantity: 2,
    intervalKey: "month:1",
    intervalLabel: "Every month",
    unitAmountCents: 1800,
    shippingCents: 500,
    perDeliveryCents: 4100,
    deliveryMethod: "ship",
    nextBillingAt: new Date("2026-10-15T00:00:00Z"),
    currentPeriodEnd: new Date("2026-10-15T00:00:00Z"),
    pauseResumesAt: null,
    cancelledAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    manageUrl: "https://teststore.example.com/subscriptions/manage?token=abc",
  },
];

const oneInvoice: InvoicesPageTemplateProps["invoices"] = [
  {
    id: "inv_1",
    displayNumber: "INV-0001",
    status: "SENT",
    isOverdue: false,
    totalCents: 12000,
    amountPaidCents: 0,
    balanceCents: 12000,
    issueDate: "2026-09-01",
    dueDate: "2026-09-30",
    sentAt: new Date("2026-09-01T00:00:00Z"),
    viewPath: "/invoices/view?token=xyz",
  },
];

const joinedRewards: RewardsPageTemplateProps["rewards"] = {
  flags: { loyalty: true, coupons: true },
  program: {
    rules: {
      earnOnOrders: true,
      pointsPerDollar: 1,
      signupEnabled: false,
      signupBonus: 0,
      firstOrderEnabled: false,
      firstOrderBonus: 0,
      birthdayEnabled: false,
      birthdayBonus: 0,
      socialEnabled: false,
      socialFollowBonus: 0,
      rewardCodeExpiryDays: 90,
    },
    tiers: [],
  },
  customer: {
    id: "cust_1",
    loyaltyPoints: 240,
    loyaltyJoinedAt: new Date("2026-01-01T00:00:00Z"),
    birthMonth: null,
    birthDay: null,
  },
  entries: [],
  codes: [],
  social: [],
};

// Loyalty flag paused (owner turned the feature off) — the balance and
// "paused" banner both need to render from the same joined-member shape, so
// this only flips `flags.loyalty`.
const pausedRewards: RewardsPageTemplateProps["rewards"] = {
  ...joinedRewards,
  flags: { loyalty: false, coupons: true },
};

describe("bamboo Subscriptions/Invoices/Rewards pages render", () => {
  it("Subscriptions renders the empty state with a manage-by-email link", () => {
    render(
      <BambooSubscriptionsPage
        business={fakeBusiness as SubscriptionsPageTemplateProps["business"]}
        subscriptions={noSubscriptions}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /you don.t have any subscriptions yet/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /look up your subscription by email/i }),
    ).toHaveAttribute("href", "/subscriptions/manage");
  });

  it("Subscriptions renders a subscription's name, status, and manage link", () => {
    render(
      <BambooSubscriptionsPage
        business={fakeBusiness as SubscriptionsPageTemplateProps["business"]}
        subscriptions={oneSubscription}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Coffee Beans — Dark Roast" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /manage/i })).toHaveAttribute(
      "href",
      oneSubscription[0]!.manageUrl,
    );
  });

  it("Invoices renders an invoice row", () => {
    render(
      <BambooInvoicesPage
        business={fakeBusiness as InvoicesPageTemplateProps["business"]}
        invoices={oneInvoice}
      />,
    );

    expect(screen.getByText("INV-0001")).toBeInTheDocument();
    expect(screen.getByText(/awaiting payment/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view invoice/i }),
    ).toHaveAttribute("href", "/invoices/view?token=xyz");
  });

  it("Rewards renders a joined member's points balance", () => {
    render(
      <BambooRewardsPage
        business={fakeBusiness as RewardsPageTemplateProps["business"]}
        rewards={joinedRewards}
      />,
    );

    expect(screen.getByText("240")).toBeInTheDocument();
    expect(screen.getByText("points")).toBeInTheDocument();
  });

  it("Rewards shows the paused banner when the loyalty flag is off", () => {
    render(
      <BambooRewardsPage
        business={fakeBusiness as RewardsPageTemplateProps["business"]}
        rewards={pausedRewards}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/paused right now/i);
  });
});
