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
      <path d="M7 3L3 18c-.2.8.2 1.6 1 1.8.3.1.6.1.9 0l3.5-11.5L16 20c.7.4 1.6.1 2-. 6c.4-.7.1-1.6-.6-2L7 3Z" />
    </svg>
  );
}
