import { cn } from "~/lib/utils";

/** Simple outlined glove glyph (empty cart, empty states). Decorative. */
export function GloveHandIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-16", className)}
    >
      <path d="M21 41V19.5a3.5 3.5 0 0 1 7 0V31" />
      <path d="M28 31V13.5a3.5 3.5 0 0 1 7 0V31" />
      <path d="M35 31V16.5a3.5 3.5 0 0 1 7 0V33" />
      <path d="M42 33v-9.5a3.5 3.5 0 0 1 7 0V40c0 6-2 10-6 13" />
      <path d="M21 41l-5.5-6.5a3.4 3.4 0 0 0-5.3 4.2L18 50c1.5 2 3 3 5 3h20" />
      <rect x="21" y="53" width="22" height="6" rx="2" />
    </svg>
  );
}
