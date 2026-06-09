import { cn } from "~/lib/utils";

export function TwitterIcon({ className }: { className?: string }) {
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
      <path d="M22 5.92c-.77.35-1.6.59-2.47.7a4.15 4.15 0 0 0 1.82-2.28 8.3 8.3 0 0 1-2.62 1.01 4.13 4.13 0 0 0-7.04 3.76A11.73 11.73 0 0 1 3.11 4.74a4.13 4.13 0 0 0 1.27 5.5c-.69-.02-1.34-.21-1.91-.52v.05a4.13 4.13 0 0 0 3.32 4.05c-.33.09-.67.14-1.02.14-.25 0-.48-.02-.71-.07.48 1.5 1.88 2.59 3.53 2.62A8.32 8.32 0 0 1 2 19.07a11.76 11.76 0 0 0 6.29 1.85c7.55 0 11.69-6.26 11.69-11.69 0-.18-.01-.36-.02-.54.8-.57 1.49-1.29 2.04-2.1z" />
    </svg>
  );
}
