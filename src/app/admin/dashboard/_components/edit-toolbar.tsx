"use client";

import type { Ref } from "react";
import { Check, Plus, RotateCcw } from "lucide-react";

import { MAX_DASHBOARD_CARDS } from "~/lib/dashboard/layout-schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";

/**
 * The bar above the grid while editing: what's going on, how full the
 * dashboard is, and Add / Reset / Cancel / Save. Escape deliberately does
 * nothing here — leaving edit mode always takes a button press.
 */
export function EditToolbar({
  ref,
  totalCount,
  hiddenCount,
  isDirty,
  isSaving,
  isResetting,
  onAdd,
  onReset,
  onCancel,
  onSave,
}: {
  /** Focused when edit mode starts (the Edit button it replaces disappears). */
  ref?: Ref<HTMLDivElement>;
  /** Draft cards plus hidden cards. */
  totalCount: number;
  hiddenCount: number;
  isDirty: boolean;
  isSaving: boolean;
  isResetting: boolean;
  onAdd: () => void;
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const isBusy = isSaving || isResetting;
  const isFull = totalCount >= MAX_DASHBOARD_CARDS;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-label="Dashboard editing"
      className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-3 z-30 mb-6 flex flex-col gap-2 rounded-xl border p-3 shadow-sm backdrop-blur outline-none sm:gap-3 sm:p-4 xl:flex-row xl:items-center xl:justify-between"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-base font-semibold">Editing dashboard</h2>
          <span
            className={
              isFull
                ? "text-sm font-medium text-amber-700 tabular-nums dark:text-amber-400"
                : "text-muted-foreground text-sm tabular-nums"
            }
          >
            {totalCount} / {MAX_DASHBOARD_CARDS} cards
          </span>
        </div>
        <p className="text-muted-foreground hidden text-sm sm:block">
          <span className="hidden md:inline">Drag to rearrange.</span>
          <span className="md:hidden">Use the arrows to rearrange.</span> Card
          settings change size and time range. Only you see this layout.
        </p>
        {hiddenCount > 0 && (
          <p className="text-muted-foreground text-sm">
            {hiddenCount === 1
              ? "1 card is hidden while its feature is off. It comes back when the feature is turned on."
              : `${hiddenCount} cards are hidden while their features are off. They come back when the features are turned on.`}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 xl:shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={isBusy || isFull}
        >
          <Plus aria-hidden="true" />
          Add<span className="hidden sm:inline"> card</span>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="ghost" size="sm" disabled={isBusy}>
              {isResetting ? <Spinner /> : <RotateCcw aria-hidden="true" />}
              Reset<span className="hidden sm:inline"> to default</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset your dashboard?</AlertDialogTitle>
              <AlertDialogDescription>
                Your cards will be replaced with the standard set, and any
                unsaved changes will be lost. This only changes your dashboard,
                not anyone else&apos;s.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep my cards</AlertDialogCancel>
              <AlertDialogAction onClick={onReset}>
                Reset to default
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isBusy}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={isBusy || !isDirty}
        >
          {isSaving ? <Spinner /> : <Check aria-hidden="true" />}
          Save
        </Button>
      </div>
    </div>
  );
}
