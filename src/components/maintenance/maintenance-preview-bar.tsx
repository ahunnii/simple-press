"use client";

import { useState } from "react";
import { Eye } from "lucide-react";

import { cn } from "~/lib/utils";

type Mode = "enter" | "leave";
type Variant = "maintenance" | "coming_soon";

type Props = {
  mode: Mode;
  variant: Variant;
};

function visitorLabel(variant: Variant) {
  return variant === "coming_soon" ? "coming soon" : "maintenance";
}

export function MaintenancePreviewBar({ mode, variant }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = visitorLabel(variant);
  const action = mode === "enter" ? "View your store" : "View visitor page";
  const pendingLabel = mode === "enter" ? "Opening…" : "Switching…";

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/storefront-preview", {
        method: mode === "enter" ? "POST" : "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) {
        let message = "Couldn't switch views. Try again.";
        try {
          const body = (await res.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          // Keep the generic recovery copy when the body isn't JSON.
        }
        setError(message);
        setPending(false);
        return;
      }
      window.location.reload();
    } catch {
      setError("Couldn't switch views. Try again.");
      setPending(false);
    }
  }

  return (
    <div
      role="region"
      aria-label="Store preview"
      className="sticky top-0 z-200 border-b border-zinc-800 bg-zinc-950 text-zinc-50 selection:bg-zinc-500 selection:text-white"
    >
      <div className="flex items-start gap-3 px-4 py-2 sm:items-center lg:px-6">
        <Eye
          className="mt-0.5 size-4 shrink-0 text-zinc-400 sm:mt-0"
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
          <p className="min-w-0 flex-1 basis-56 text-sm leading-snug text-zinc-200">
            {mode === "enter" ? (
              <>
                <span className="font-medium text-zinc-50">
                  Visitors see this {label} page.
                </span>{" "}
                Open the live site to check pages, products, and services —
                checkout stays off.
              </>
            ) : (
              <>
                <span className="font-medium text-zinc-50">
                  You&apos;re previewing the live site.
                </span>{" "}
                Visitors still see {label}. Checkout is off.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => void toggle()}
            disabled={pending}
            className={cn(
              "inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-zinc-50 px-3 text-sm font-medium text-zinc-950",
              "hover:bg-zinc-200",
              "focus-visible:ring-2 focus-visible:ring-zinc-50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {pending ? pendingLabel : action}
          </button>
        </div>
      </div>
      {error ? (
        <p
          role="alert"
          className="border-t border-zinc-800 px-4 py-1.5 text-sm text-red-300 lg:px-6"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
