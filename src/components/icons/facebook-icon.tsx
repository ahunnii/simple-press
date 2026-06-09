import { cn } from "~/lib/utils";

export function FacebookIcon({ className }: { className?: string }) {
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
      <path d="M14 7h2V4h-2.5C12 4 11 5 11 6.5V9H9v3h2v8h3v-8h2.2L17 9h-3V6.8c0-.5.3-.8.7-.8H14" />
    </svg>
  );
}
