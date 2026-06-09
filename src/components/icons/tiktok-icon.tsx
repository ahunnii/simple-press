import { cn } from "~/lib/utils";

export function TikTokIcon({ className }: { className?: string }) {
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
      <path d="M9 14a3.5 3.5 0 1 0 3.5 3.5V4c.6 2.2 2.2 3.8 4.5 4" />
    </svg>
  );
}
