import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "~/trpc/react";

import { EventsClient } from "./events-client";

// Same tRPC-react proxy pattern used in tests/templates/checkout-render.test.tsx,
// extended with `useUtils` (EventsClient calls `api.useUtils().events.invalidate()`
// from its delete/archive mutation `onSuccess` handlers).
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
    variables: undefined as { id?: string } | undefined,
  };
  const proxy: unknown = new Proxy(() => undefined, {
    get(_t, prop) {
      if (prop === "useUtils") {
        return () => ({ events: { invalidate: () => Promise.resolve() } });
      }
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
  usePathname: () => "/admin/events",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(() => undefined, {
    success: () => undefined,
    error: () => undefined,
    loading: () => undefined,
    dismiss: () => undefined,
  }),
}));

type AdminEvent = RouterOutputs["events"]["getAll"][number];

const TIME_ZONE = "America/Detroit";

let idCounter = 0;

// `EventsClient` reads `Date.now()` directly (not an injectable clock), and
// Radix's Tabs + userEvent's async pointer/focus handling don't play well
// with `vi.useFakeTimers()` (clicks hang waiting on rAF-driven timers that
// never advance). So "past"/"future" are computed off the real clock at test
// run time instead of freezing it — a one-hour offset is comfortably larger
// than this test's own runtime.
const REAL_NOW = Date.now();
const PAST = new Date(REAL_NOW - 60 * 60 * 1000); // 1h before now
const FURTHER_PAST = new Date(REAL_NOW - 2 * 60 * 60 * 1000); // 2h before now
const FUTURE = new Date(REAL_NOW + 60 * 60 * 1000); // 1h after now

function makeEvent(overrides: Partial<AdminEvent> = {}): AdminEvent {
  idCounter += 1;
  return {
    id: `event-${idCounter}`,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    name: `Test Event ${idCounter}`,
    blurb: null,
    coverImage: null,
    startAt: FUTURE,
    endAt: null,
    allDay: false,
    location: null,
    externalUrl: null,
    externalUrlLabel: null,
    priceLabel: null,
    published: true,
    sortOrder: 0,
    isArchived: false,
    businessId: "biz_1",
    ...overrides,
  } as AdminEvent;
}

describe("EventsClient", () => {
  it("puts an ended, not-yet-archived event under Past (not Upcoming)", async () => {
    // The cron job that flips `isArchived` only runs every ~15 minutes, so
    // between ticks a just-finished event is `isArchived: false` with a
    // cutoff in the past. If the client partitioned on `isArchived` alone,
    // this event would incorrectly render under "Upcoming" until the next
    // cron run.
    const justEnded = makeEvent({
      name: "Just-Ended Market",
      startAt: FURTHER_PAST,
      endAt: PAST,
      isArchived: false,
    });

    render(<EventsClient events={[justEnded]} timeZone={TIME_ZONE} />);

    expect(
      screen.getByRole("tab", { name: "Upcoming (0)" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Past (1)" })).toBeInTheDocument();

    // Upcoming panel (default active tab) must not contain the event.
    expect(screen.queryByText("Just-Ended Market")).not.toBeInTheDocument();

    // Switch to Past and confirm it's there.
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Past (1)" }));
    expect(screen.getByText("Just-Ended Market")).toBeInTheDocument();
  });

  it("puts an archived event with a future date under Past (mirror case)", async () => {
    const archivedButFuture = makeEvent({
      name: "Archived Future Market",
      startAt: FUTURE,
      endAt: null,
      isArchived: true,
    });

    render(<EventsClient events={[archivedButFuture]} timeZone={TIME_ZONE} />);

    expect(
      screen.getByRole("tab", { name: "Upcoming (0)" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Past (1)" })).toBeInTheDocument();
    expect(
      screen.queryByText("Archived Future Market"),
    ).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Past (1)" }));
    expect(screen.getByText("Archived Future Market")).toBeInTheDocument();
  });

  it("puts an ordinary upcoming event under Upcoming", () => {
    const upcoming = makeEvent({
      name: "Ordinary Future Market",
      startAt: FUTURE,
      endAt: null,
      isArchived: false,
    });

    render(<EventsClient events={[upcoming]} timeZone={TIME_ZONE} />);

    expect(
      screen.getByRole("tab", { name: "Upcoming (1)" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Past (0)" })).toBeInTheDocument();
    // Default active tab is "upcoming" — the event should be visible without
    // switching tabs.
    expect(screen.getByText("Ordinary Future Market")).toBeInTheDocument();
  });

  it("splits a mixed set of events into the correct tab counts", async () => {
    const justEnded = makeEvent({
      name: "Just-Ended Market",
      startAt: FURTHER_PAST,
      endAt: PAST,
      isArchived: false,
    });
    const archivedButFuture = makeEvent({
      name: "Archived Future Market",
      startAt: FUTURE,
      isArchived: true,
    });
    const upcoming = makeEvent({
      name: "Ordinary Future Market",
      startAt: FUTURE,
      isArchived: false,
    });

    render(
      <EventsClient
        events={[justEnded, archivedButFuture, upcoming]}
        timeZone={TIME_ZONE}
      />,
    );

    expect(
      screen.getByRole("tab", { name: "Upcoming (1)" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Past (2)" })).toBeInTheDocument();

    const upcomingPanel = screen.getByRole("tabpanel", { name: /upcoming/i });
    expect(
      within(upcomingPanel).getByText("Ordinary Future Market"),
    ).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Past (2)" }));
    const pastPanel = screen.getByRole("tabpanel", { name: /past/i });
    expect(
      within(pastPanel).getByText("Just-Ended Market"),
    ).toBeInTheDocument();
    expect(
      within(pastPanel).getByText("Archived Future Market"),
    ).toBeInTheDocument();
  });
});
