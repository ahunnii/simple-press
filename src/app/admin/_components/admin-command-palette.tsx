"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconPackage,
  IconShoppingCart,
  IconUsers,
} from "@tabler/icons-react";

import type { AdminRole } from "~/app/admin/_lib/admin-nav";
import type { Session } from "~/server/better-auth/config";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { formatPrice } from "~/lib/prices";
import { api } from "~/trpc/react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "~/components/ui/command";
import {
  HUB_CARDS,
  isHubCardEnabled,
  isNavItemAllowedForRole,
  NAV_ITEMS,
  PALETTE_ACTIONS,
} from "~/app/admin/_lib/admin-nav";

/** Event other admin chrome (e.g. TrailHeader search) dispatches to open us. */
const OPEN_EVENT = "admin:open-command-palette";

type AdminCommandPaletteProps = {
  session?: Session | null;
  featureData?: { flags: Record<string, boolean> };
  /** Business membership role; null for PLATFORM_ADMIN (sees everything). */
  membershipRole?: AdminRole | null;
};

export function AdminCommandPalette({
  session,
  featureData,
  membershipRole,
}: AdminCommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { isEnabled } = useFeatureFlags({ flags: featureData?.flags ?? {} });

  // PLATFORM_ADMIN (membershipRole null) bypasses role filtering — same rule
  // the sidebar applies so hidden destinations never surface here either.
  const roleForFiltering: AdminRole | null =
    session?.user.platformRole === "PLATFORM_ADMIN"
      ? null
      : (membershipRole ?? null);
  const isStaff = roleForFiltering === "STAFF";

  // ── Open triggers: ⌘K / Ctrl+K and the custom open event ────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const onOpenEvent = () => setOpen(true);

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpenEvent);
    };
  }, []);

  // ── Debounce the typed query for the server record search (~250ms) ───────────
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);

  const searchEnabled = open && debouncedQuery.length >= 2;
  const { data, isFetching } = api.search.all.useQuery(
    { query: debouncedQuery },
    { enabled: searchEnabled, staleTime: 30_000 },
  );

  // ── Static registry entries, gated by the SAME role + feature-flag rules the
  //    sidebar uses (so nothing hidden from the sidebar shows in the palette) ──
  const actions = useMemo(
    () =>
      PALETTE_ACTIONS.filter(
        (a) =>
          isNavItemAllowedForRole(a, roleForFiltering) &&
          (!a.featureKey || isEnabled(a.featureKey)),
      ),
    [roleForFiltering, isEnabled],
  );

  const navItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        // Platform section is PLATFORM_ADMIN-only (mirrors app-sidebar).
        if (item.section === "platform")
          return session?.user.platformRole === "PLATFORM_ADMIN";
        if (!isNavItemAllowedForRole(item, roleForFiltering)) return false;
        return !item.featureKey || isEnabled(item.featureKey);
      }),
    [roleForFiltering, isEnabled, session?.user.platformRole],
  );

  // HubCards carry no `roles`; the Settings/Content hubs are owner/manager
  // surfaces, so STAFF (fulfillment-only) never sees them — matching the
  // sidebar, where Settings is flagged staffAccessible: false.
  const isPlatformAdmin = session?.user.platformRole === "PLATFORM_ADMIN";
  const settingsCards = useMemo(
    () =>
      isStaff
        ? []
        : HUB_CARDS.filter(
            (c) =>
              c.hub === "settings" &&
              (!c.platformOnly || isPlatformAdmin) &&
              isHubCardEnabled(c, isEnabled),
          ),
    [isStaff, isEnabled, isPlatformAdmin],
  );
  const contentCards = useMemo(
    () =>
      isStaff
        ? []
        : HUB_CARDS.filter(
            (c) =>
              c.hub === "content" &&
              (!c.platformOnly || isPlatformAdmin) &&
              isHubCardEnabled(c, isEnabled),
          ),
    [isStaff, isEnabled, isPlatformAdmin],
  );

  const go = useCallback(
    (href: string, external?: boolean) => {
      setOpen(false);
      setQuery("");
      setDebouncedQuery("");
      // Absolute cross-host URLs (e.g. the platform.* subdomain) can't be
      // handled by the Next.js router — force a full navigation instead.
      if (external) {
        window.location.href = href;
        return;
      }
      router.push(href);
    },
    [router],
  );

  // Reset the query whenever the dialog closes so it opens clean next time.
  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setDebouncedQuery("");
    }
  }, []);

  const orders = data?.orders ?? [];
  const customers = data?.customers ?? [];
  const products = data?.products ?? [];

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Search records and jump to any admin page"
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search orders, customers, products, or jump to a page…"
      />
      {/*
        cmdk client-filters items by matching the typed query against each
        item's value + keywords. Server-matched records (orders/customers/
        products) whose display text doesn't literally contain the query would
        be filtered away. Fix: keep cmdk's fuzzy filtering ON for the static
        registry items (nice matching on titles + synonyms), and force every
        dynamic record item to always match by passing the raw query itself as
        a keyword — so a positive score is guaranteed while the server, not
        cmdk, decides which records are relevant.
      */}
      <CommandList>
        <CommandEmpty>
          {isFetching && searchEnabled ? "Searching…" : "No results found."}
        </CommandEmpty>

        {actions.length > 0 && (
          <CommandGroup heading="Actions">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <CommandItem
                  key={a.key}
                  value={`action:${a.key} ${a.title}`}
                  keywords={a.keywords}
                  onSelect={() => go(a.href)}
                >
                  <Icon />
                  <span>{a.title}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {navItems.length > 0 && (
          <CommandGroup heading="Go to">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.key}
                  value={`nav:${item.key} ${item.title}`}
                  keywords={item.keywords}
                  onSelect={() => go(item.href, item.external)}
                >
                  <Icon />
                  <span>{item.title}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {settingsCards.length > 0 && (
          <CommandGroup heading="Settings">
            {settingsCards.map((c) => {
              const Icon = c.icon;
              return (
                <CommandItem
                  key={c.key}
                  value={`settings:${c.key} ${c.title}`}
                  keywords={c.keywords}
                  onSelect={() => go(c.href)}
                >
                  <Icon />
                  <span>{c.title}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {contentCards.length > 0 && (
          <CommandGroup heading="Content">
            {contentCards.map((c) => {
              const Icon = c.icon;
              return (
                <CommandItem
                  key={c.key}
                  value={`content:${c.key} ${c.title}`}
                  keywords={c.keywords}
                  onSelect={() => go(c.href)}
                >
                  <Icon />
                  <span>{c.title}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {orders.length > 0 && (
          <CommandGroup heading="Orders">
            {orders.map((o) => (
              <CommandItem
                key={o.id}
                value={`order:${o.id}`}
                keywords={[debouncedQuery]}
                onSelect={() => go(`/admin/orders/${o.id}`)}
              >
                <IconShoppingCart />
                <span className="truncate">
                  #{o.orderNumber}
                  {o.customerName ? ` — ${o.customerName}` : ""}
                </span>
                <CommandShortcut className="tracking-normal capitalize">
                  {formatPrice(o.total)} · {o.status.toLowerCase()}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {customers.length > 0 && (
          <CommandGroup heading="Customers">
            {customers.map((c) => (
              <CommandItem
                key={c.id}
                value={`customer:${c.id}`}
                keywords={[debouncedQuery]}
                onSelect={() => go(`/admin/customers/${c.id}`)}
              >
                <IconUsers />
                <span className="truncate">
                  {c.name ?? c.email}
                  {c.name ? (
                    <span className="text-muted-foreground"> · {c.email}</span>
                  ) : null}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {products.length > 0 && (
          <CommandGroup heading="Products">
            {products.map((p) => (
              <CommandItem
                key={p.id}
                value={`product:${p.id}`}
                keywords={[debouncedQuery]}
                onSelect={() => go(`/admin/products/${p.id}`)}
              >
                <IconPackage />
                <span className="truncate">{p.name}</span>
                <CommandShortcut className="tracking-normal">
                  {formatPrice(p.price)}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
