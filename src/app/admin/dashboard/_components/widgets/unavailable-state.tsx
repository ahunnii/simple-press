import { CircleSlash } from "lucide-react";

/** Muted in-card state for any `unavailable` CardData (Umami down, error, feature off). */
export function UnavailableState({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="text-muted-foreground flex flex-1 flex-col items-start justify-center gap-1.5 text-sm"
    >
      <span className="text-2xl leading-none font-bold" aria-hidden="true">
        &mdash;
      </span>
      <p className="flex items-start gap-1.5 text-xs">
        <CircleSlash
          aria-hidden="true"
          className="mt-0.5 h-3.5 w-3.5 shrink-0"
        />
        {message}
      </p>
    </div>
  );
}
