import { cn } from "~/lib/utils";

export function VenmoIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn("h-4 w-4", className)}
      fill="currentColor"
      stroke="none"
    >
      {/* The "v" from Simple Icons' venmo.svg wordmark, scaled to fill the viewBox */}
      <path d="M20.51 1.74c.78 1.24 1.1 2.48 1.1 4.09 0 5.11-4.37 11.73-7.91 16.42H5.65L2.39 2.85l7.08-.69 1.7 13.8c1.61-2.58 3.59-6.67 3.59-9.48 0-1.52-.28-2.58-.69-3.45l6.44-1.29z" />
    </svg>
  );
}
