import type { ComponentType, ReactNode } from "react";
import type { AuthClient } from "@better-auth-ui/react";
import { QueryClient } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthProvider } from "~/components/auth/auth-provider";
import {
  AUTH_BASE_PATHS,
  AUTH_VIEW_PATHS,
  SETTINGS_VIEW_PATHS,
} from "~/lib/auth-paths";

// Importing components directly (like checkout-render.test.tsx) rather than
// driving off `getTemplate()` from the registry. The registry module
// statically imports every page slot for every template — including server
// components that pull in `~/trpc/server` -> `~/server/db` (Prisma +
// prisma-field-encryption) — and that import graph throws in the `dom`
// project (no Node `crypto` global in happy-dom) long before any test body
// runs. Importing only the 22 account components sidesteps that unrelated,
// pre-existing graph problem entirely.
import { BambooAccountSecurityPage } from "~/app/(storefront)/_templates/bamboo/account/bamboo-account-security-page";
import { BambooAccountSettingsPage } from "~/app/(storefront)/_templates/bamboo/account/bamboo-account-settings-page";
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
 * hCaptcha/terms-field/basePaths wiring that isn't reachable from a
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

// All 11 templates that ship their own account directory and register real
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
