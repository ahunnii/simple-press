import { useRef, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type * as MotionReact from "motion/react";

import {
  HappyBambooMenuToggle,
  HappyBambooMobileMenu,
} from "./happy-bamboo-mobile-nav";

// The panel calls `usePathname()` directly (the header hands it a `pathname`
// prop for its own desktop nav, but the mobile panel re-reads it itself) —
// mutable so individual tests can point it at a different route, following
// the `searchParams` pattern in
// `src/app/(storefront)/subscriptions/_components/subscription-manage-client.test.tsx`.
let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

// `useReducedMotion` -> true collapses every panel/row transition to
// `{ duration: 0 }` (see the component's `instant` variants), which keeps
// AnimatePresence's exit animation from dragging out in happy-dom. Real
// `AnimatePresence`/`motion.div` are kept so the panel still mounts/unmounts
// like it does in the browser — tests that assert removal still go through
// `waitFor` since the exit is still async either way.
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof MotionReact>();
  return { ...actual, useReducedMotion: () => true };
});

// happy-dom (unlike jsdom) ships a REAL `window.matchMedia` that evaluates
// queries against its emulated viewport — `setup-dom.ts`'s `matches: false`
// stub only installs `if (!window.matchMedia)`, so it never takes effect
// here, and happy-dom's default 1024px width makes `(min-width: 768px)`
// report `true`. The panel's own "crossing into md+ closes the menu" effect
// (`DESKTOP_QUERY` in the component) then fires the instant the menu opens
// and immediately closes it again. Force every query to `matches: false` so
// the panel behaves like it does on an actual phone.
function mockNarrowViewport() {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}
let restoreViewport: (() => void) | undefined;
afterEach(() => {
  restoreViewport?.();
  restoreViewport = undefined;
});

type FakeBusiness = Parameters<typeof HappyBambooMobileMenu>[0]["business"];
type FakeSession = Parameters<typeof HappyBambooMobileMenu>[0]["session"];

function makeBusiness(
  overrides: {
    navigationItems?: { label: string; href: string }[];
    socialLinks?: Record<string, string>;
  } = {},
): FakeBusiness {
  return {
    siteContent: {
      navigationItems: overrides.navigationItems,
      socialLinks: overrides.socialLinks,
    },
  } as unknown as FakeBusiness;
}

const MENU_ID = "hb-mobile-menu";

type HarnessProps = {
  business?: FakeBusiness;
  session?: FakeSession;
  isPending?: boolean;
  isEnabled?: (key: string) => boolean;
};

/**
 * Stateful harness mirroring how `HappyBambooHeader` wires the two
 * components together: shared `open` state, a `headerRef` the panel
 * measures/scopes off of, and a `toggleRef` it hands focus back to. `<header
 * ref={headerRef}>` sits inside a `.happy-bamboo` wrapper alongside
 * `#main-content` + a trailing `<footer>` so the panel's inert/scroll-lock
 * effect (scoped to `.closest(".happy-bamboo")`) has real targets to act on,
 * same as the template's actual layout.
 */
function Harness({
  business = makeBusiness(),
  session = null,
  isPending = false,
  isEnabled = () => false,
}: HarnessProps) {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="happy-bamboo">
      <header ref={headerRef}>
        <HappyBambooMenuToggle
          ref={toggleRef}
          open={open}
          onOpenChange={setOpen}
        />
        <HappyBambooMobileMenu
          open={open}
          onOpenChange={setOpen}
          business={business}
          session={session}
          isPending={isPending}
          isEnabled={isEnabled}
          headerRef={headerRef}
          toggleRef={toggleRef}
        />
      </header>
      <main id="main-content">
        <button type="button">Focusable in main</button>
      </main>
      <footer>Footer</footer>
    </div>
  );
}

function renderHarness(props: HarnessProps = {}) {
  restoreViewport = mockNarrowViewport();
  return render(<Harness {...props} />);
}

function getToggle() {
  return screen.getByRole("button", { name: /menu$/ });
}

describe("HappyBambooMenuToggle + HappyBambooMobileMenu", () => {
  it("toggles aria-expanded/label on click and mounts the panel only while open", () => {
    renderHarness();

    const toggle = getToggle();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAccessibleName("Open menu");
    expect(document.getElementById(MENU_ID)).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAccessibleName("Close menu");
    expect(document.getElementById(MENU_ID)).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the toggle", async () => {
    renderHarness();

    const toggle = getToggle();
    fireEvent.click(toggle);
    expect(document.getElementById(MENU_ID)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    // Focus returns synchronously in the Escape handler, before the exit
    // animation resolves.
    expect(document.activeElement).toBe(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await waitFor(() =>
      expect(document.getElementById(MENU_ID)).not.toBeInTheDocument(),
    );
  });

  it("marks exactly the active link with aria-current", () => {
    pathname = "/shop";
    renderHarness();
    fireEvent.click(getToggle());

    const shopLink = screen.getByRole("link", { name: "Shop" });
    const homeLink = screen.getByRole("link", { name: "Home" });
    const aboutLink = screen.getByRole("link", { name: "About Us" });

    expect(shopLink).toHaveAttribute("aria-current", "page");
    expect(homeLink).not.toHaveAttribute("aria-current");
    expect(aboutLink).not.toHaveAttribute("aria-current");

    pathname = "/";
  });

  it("shows signed-out auth pills only when customerAccounts is enabled and not pending", () => {
    const { unmount } = renderHarness({
      isEnabled: (key) => key === "customerAccounts",
    });
    fireEvent.click(getToggle());

    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create account" }),
    ).toBeInTheDocument();
    unmount();

    // Flag off -> no account block at all.
    const offRender = renderHarness({ isEnabled: () => false });
    fireEvent.click(getToggle());
    expect(
      screen.queryByRole("link", { name: "Log in" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Create account" }),
    ).not.toBeInTheDocument();
    offRender.unmount();

    // Flag on but session still pending -> pills stay hidden too.
    renderHarness({
      isEnabled: (key) => key === "customerAccounts",
      isPending: true,
    });
    fireEvent.click(getToggle());
    expect(
      screen.queryByRole("link", { name: "Log in" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Create account" }),
    ).not.toBeInTheDocument();
  });

  it("renders only the social links the owner configured", () => {
    renderHarness({
      business: makeBusiness({
        socialLinks: {
          instagram: "https://instagram.com/example",
          youtube: "https://youtube.com/example",
        },
      }),
    });
    fireEvent.click(getToggle());

    expect(
      screen.getByRole("link", { name: /Instagram \(opens in new tab\)/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /YouTube \(opens in new tab\)/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Facebook \(opens in new tab\)/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: /X \/ Twitter \(opens in new tab\)/,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /TikTok \(opens in new tab\)/ }),
    ).not.toBeInTheDocument();
  });

  it("inerts #main-content and locks page scroll while open, and restores both on close", async () => {
    renderHarness();
    const mainContent = document.getElementById("main-content")!;
    const html = document.documentElement;
    const originalOverflow = html.style.overflow;

    expect(mainContent).not.toHaveAttribute("inert");
    expect(html.style.overflow).not.toBe("hidden");

    fireEvent.click(getToggle());

    expect(mainContent).toHaveAttribute("inert");
    expect(html.style.overflow).toBe("hidden");

    fireEvent.click(getToggle());

    // The lock/inert cleanup runs on close (the effect's cleanup), separate
    // from the panel's exit animation.
    await waitFor(() => expect(mainContent).not.toHaveAttribute("inert"));
    expect(html.style.overflow).toBe(originalOverflow);
  });
});
