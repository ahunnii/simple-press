"use client";

import type { ComponentProps, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  LayoutGrid,
  Palette,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

import type { DashboardCard } from "~/lib/dashboard/layout-schema";
import type { WidgetId } from "~/lib/dashboard/widgets";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { Button } from "~/components/ui/button";

import { AddCardDialog } from "./add-card-dialog";
import { AddCardTile } from "./add-card-tile";
import { CardEditControls } from "./card-edit-controls";
import { DashboardGrid } from "./dashboard-grid";
import { EditToolbar } from "./edit-toolbar";
import { useDashboardEditor } from "./use-dashboard-editor";

/** Focus target after removing the last card: the Add card tile. */
const ADD_TILE = Symbol("add-tile");
type FocusTarget = string | typeof ADD_TILE;

function focusTarget(target: FocusTarget) {
  const el =
    target === ADD_TILE
      ? document.querySelector<HTMLElement>("[data-add-card-tile]")
      : document.querySelector<HTMLElement>(
          `[data-card-settings="${CSS.escape(target)}"]`,
        );
  el?.focus();
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type DashboardShellProps = {
  business: {
    name: string;
    subdomain: string;
    customDomain: string | null;
  };
  /**
   * Header shortcuts gated on the same feature flags as their target routes
   * (`products/layout.tsx` and `orders/layout.tsx` 404 when the flag is off),
   * so the dashboard never offers a button that leads to a dead page.
   */
  quickActions: { addProduct: boolean; newOrder: boolean };
  /** Server-rendered, non-removable strips above the grid, in display order. */
  pinned: {
    setup?: ReactNode;
    searchReadiness?: ReactNode;
    attention?: ReactNode;
    oversell?: ReactNode;
  };
  /** The viewer's cards with unavailable (feature-off) ones already removed. */
  initialCards: DashboardCard[];
  /**
   * False for platform admins viewing a store they aren't a member of: they
   * see the default layout and get no Edit button (saving would be FORBIDDEN).
   */
  canEdit: boolean;
  /** Widgets this store can show now (feature flags + Umami). */
  availableWidgetIds: WidgetId[];
  /** Stored cards hidden because their feature is off; they count toward the cap. */
  hiddenCount: number;
  /** Per-store card links that differ from the registry's `href`. */
  widgetHrefs?: Partial<Record<WidgetId, string>>;
};

/**
 * Header, quick actions, pinned strips and the card grid, plus edit mode.
 *
 * Edit mode works on a draft (`useDashboardEditor`): every change shows live in
 * the grid — a new range or size re-queries that card — and nothing persists
 * until Save. Cancel restores the saved cards; Escape does nothing on purpose.
 * Unsaved changes are guarded against in-app link clicks and tab close.
 */
export function DashboardShell({
  business,
  quickActions,
  pinned,
  initialCards,
  canEdit,
  availableWidgetIds,
  hiddenCount,
  widgetHrefs,
}: DashboardShellProps) {
  const router = useRouter();
  const editor = useDashboardEditor({
    initialCards,
    initialHiddenCount: hiddenCount,
    availableWidgetIds,
  });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const justAddedRef = useRef<string | null>(null);
  // The empty state's "Add a card" button unmounts once edit mode starts, so a
  // cancelled dialog opened from it has nothing to return focus to.
  const openedFromEmptyRef = useRef(false);
  const pendingFocusRef = useRef<FocusTarget | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const wasEditingRef = useRef(false);

  useDirtyForm(
    editor.isDirty,
    "Your dashboard changes haven't been saved and will be lost if you leave this page.",
  );

  /** Polite live region; a repeated message gets a trailing space so it's re-read. */
  const announce = (message: string | null) => {
    if (!message) return;
    setLiveMessage((prev) => (prev === message ? `${message}\u00a0` : message));
  };

  const saveLayout = api.dashboard.saveLayout.useMutation({
    onSuccess: ({ layout }) => {
      editor.commit(layout);
      toast.success("Dashboard saved");
      // Drop the client router cache so Back/Forward can't replay the page
      // with the pre-save layout as its initial cards.
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Your dashboard couldn't be saved.");
    },
  });
  const resetLayout = api.dashboard.resetLayout.useMutation({
    onSuccess: ({ layout }) => {
      editor.commit(layout);
      toast.success("Dashboard reset to the default cards");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Your dashboard couldn't be reset.");
    },
  });

  // Entering edit mode hides the Edit button, so focus moves to the toolbar;
  // leaving brings it back to the Edit button.
  useEffect(() => {
    if (editor.isEditing && !wasEditingRef.current) {
      toolbarRef.current?.focus({ preventScroll: true });
    } else if (!editor.isEditing && wasEditingRef.current) {
      editButtonRef.current?.focus();
    }
    wasEditingRef.current = editor.isEditing;
  }, [editor.isEditing]);

  // After a remove, focus the neighbouring card's settings (or the Add tile).
  useEffect(() => {
    const target = pendingFocusRef.current;
    if (target === null) return;
    pendingFocusRef.current = null;
    requestAnimationFrame(() => focusTarget(target));
  }, [editor.draftCards]);

  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => setHighlightId(null), 2000);
    return () => clearTimeout(timer);
  }, [highlightId]);

  const presentWidgetIds = useMemo(
    () => new Set(editor.draftCards.map((card) => card.widget)),
    [editor.draftCards],
  );

  const handleAdd = (widget: WidgetId) => {
    const added = editor.add(widget);
    if (!added) return;
    announce(added.message);
    setHighlightId(added.id);
    justAddedRef.current = added.id;
    setIsAddOpen(false);
  };

  // Instead of returning focus to whatever opened the dialog, bring the new
  // card into view and focus its settings so it can be sized right away.
  const handleAddDialogCloseFocus: ComponentProps<
    typeof AddCardDialog
  >["onCloseAutoFocus"] = (event) => {
    const id = justAddedRef.current;
    const fromEmpty = openedFromEmptyRef.current;
    openedFromEmptyRef.current = false;
    if (!id) {
      if (fromEmpty && toolbarRef.current) {
        event.preventDefault();
        toolbarRef.current.focus({ preventScroll: true });
      }
      return;
    }
    justAddedRef.current = null;
    const trigger = document.querySelector<HTMLElement>(
      `[data-card-settings="${CSS.escape(id)}"]`,
    );
    if (!trigger) return;
    event.preventDefault();
    trigger.closest("[data-card-id]")?.scrollIntoView({
      block: "center",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    trigger.focus({ preventScroll: true });
  };

  /** Empty state's "Add a card": enter edit mode and open the add dialog. */
  const startAddingFromEmpty = () => {
    openedFromEmptyRef.current = true;
    editor.start();
    setIsAddOpen(true);
  };

  const handleRemove = (id: string) => {
    const cards = editor.draftCards;
    const index = cards.findIndex((card) => card.id === id);
    const neighbour = cards[index + 1] ?? cards[index - 1];
    pendingFocusRef.current = neighbour ? neighbour.id : ADD_TILE;
    announce(editor.remove(id));
  };

  const isBusy = saveLayout.isPending || resetLayout.isPending;

  // Live storefront URL — prefer custom domain if configured
  const storefrontUrl = business.customDomain
    ? `https://${business.customDomain}`
    : `https://${business.subdomain}.${process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? ""}`;

  return (
    <div className="bg-muted min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header + Quick Actions */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-foreground text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back! Here&apos;s what&apos;s happening with{" "}
              {business.name}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:shrink-0">
            {canEdit && !editor.isEditing && (
              <Button
                ref={editButtonRef}
                type="button"
                variant="outline"
                size="sm"
                onClick={editor.start}
              >
                <LayoutGrid className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Edit dashboard
              </Button>
            )}
            {quickActions.addProduct && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/products/new">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Product
                </Link>
              </Button>
            )}
            {quickActions.newOrder && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/orders/new">
                  <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                  New Order
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/editor?from=/admin/dashboard">
                <Palette className="mr-1.5 h-3.5 w-3.5" />
                Customize
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={storefrontUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                View Store
              </a>
            </Button>
          </div>
        </div>

        {pinned.setup}
        {pinned.searchReadiness}
        {pinned.attention}
        {pinned.oversell}

        {editor.isEditing && (
          <EditToolbar
            ref={toolbarRef}
            totalCount={editor.totalCount}
            hiddenCount={editor.hiddenCount}
            isDirty={editor.isDirty}
            isSaving={saveLayout.isPending}
            isResetting={resetLayout.isPending}
            onAdd={() => setIsAddOpen(true)}
            onReset={() => resetLayout.mutate()}
            onCancel={editor.cancel}
            onSave={() =>
              saveLayout.mutate({ version: 1, cards: editor.draftCards })
            }
          />
        )}

        <DashboardGrid
          cards={editor.cards}
          isEditing={editor.isEditing}
          highlightId={highlightId}
          widgetHrefs={widgetHrefs}
          canEdit={canEdit}
          hasAvailableWidgets={availableWidgetIds.length > 0}
          onAddCard={startAddingFromEmpty}
          onReorder={(cards) => {
            editor.reorder(cards);
          }}
          renderEditControls={(card, index) => (
            <CardEditControls
              card={card}
              index={index}
              count={editor.draftCards.length}
              availableWidgetIds={availableWidgetIds}
              onUpdate={(patch) => editor.update(card.id, patch)}
              onMove={(move) => announce(editor.move(card.id, move))}
              onRemove={() => handleRemove(card.id)}
            />
          )}
          trailing={
            <AddCardTile
              isFull={editor.isFull}
              disabled={isBusy}
              onClick={() => setIsAddOpen(true)}
            />
          }
        />

        {canEdit && (
          <AddCardDialog
            open={isAddOpen}
            onOpenChange={setIsAddOpen}
            availableWidgetIds={availableWidgetIds}
            presentWidgetIds={presentWidgetIds}
            totalCount={editor.totalCount}
            onAdd={handleAdd}
            onCloseAutoFocus={handleAddDialogCloseFocus}
          />
        )}

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {liveMessage}
        </div>
      </div>
    </div>
  );
}
