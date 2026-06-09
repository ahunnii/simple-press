import { cn } from "~/lib/utils";

export function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn("h-4 w-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M11 19l1.6-7.5M9 11c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5-1.5 3.7-3.4 3.7c-1 0-1.6-.6-1.6-.6" />
    </svg>
  );
}
