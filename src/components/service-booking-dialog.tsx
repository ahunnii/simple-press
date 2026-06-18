"use client";

import { ExternalLink } from "lucide-react";

import { EmbedFrame } from "~/components/embed-frame";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

type ServiceBookingDialogProps = {
  /** Label for the trigger button. Defaults to "Book". */
  triggerLabel?: string;
  /** Name of the specific service — used as the dialog title. */
  itemName: string;
  /** Sanitized HTTPS booking URL stored in ServiceItem.bookingEmbedSrc. */
  embedSrc?: string | null;
  /** Iframe height in pixels. Defaults to embed-frame default. */
  embedHeight?: number | null;
  /** Whether the `embeds` feature flag is enabled for this business. */
  embedsEnabled: boolean;
};

/**
 * Renders a "Book" trigger button that opens a booking modal.
 *
 * Behaviour matrix:
 * - embedsEnabled + embedSrc present → dialog with EmbedFrame iframe
 * - embedsEnabled = false, embedSrc present → plain external-link button (no dialog)
 * - embedSrc absent → disabled "Book" button (no booking configured)
 */
export function ServiceBookingDialog({
  triggerLabel = "Book",
  itemName,
  embedSrc,
  embedHeight,
  embedsEnabled,
}: ServiceBookingDialogProps) {
  // No booking configured — show a disabled button
  if (!embedSrc) {
    return (
      <Button variant="outline" size="sm" disabled aria-label="No booking available">
        {triggerLabel}
      </Button>
    );
  }

  // Embeds disabled — fall back to external link
  if (!embedsEnabled) {
    return (
      <a
        href={embedSrc}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {triggerLabel}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">(opens in new tab)</span>
      </a>
    );
  }

  // Embeds enabled — open booking iframe in a dialog
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Book — {itemName}</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          <EmbedFrame
            src={embedSrc}
            height={embedHeight ?? undefined}
            title={`Book ${itemName}`}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
