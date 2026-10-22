import { TriangleAlert } from "lucide-react";

import { PLACEHOLDER_NOTE } from "~/lib/marketing/placeholders";

/** How many leftover snippets the note names before saying "and N more". */
const MAX_SHOWN = 3;

/**
 * Non-blocking amber heads-up that the email still has starter placeholder
 * text in [brackets] (see `findPlaceholders`). Renders nothing when there are
 * none. Shown in the send and schedule dialogs and in the composer.
 */
export function PlaceholderNote({
  placeholders,
  className,
}: {
  placeholders: string[];
  className?: string;
}) {
  if (placeholders.length === 0) return null;
  const shown = placeholders.slice(0, MAX_SHOWN);
  const more = placeholders.length - shown.length;
  return (
    <div
      role="status"
      className={
        "flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200 " +
        (className ?? "")
      }
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        <p className="font-medium">{PLACEHOLDER_NOTE}</p>
        <ul className="mt-1 list-disc pl-5 break-words">
          {shown.map((snippet) => (
            <li key={snippet}>{snippet}</li>
          ))}
          {more > 0 && <li className="list-none">and {more} more</li>}
        </ul>
      </div>
    </div>
  );
}
