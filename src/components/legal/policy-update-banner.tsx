"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Loader2 } from "lucide-react";

import type { MaterialPolicyUpdate } from "~/lib/legal/material-updates";
import {
  describePolicyDocs,
  policyDocsFor,
  policyUrl,
} from "~/lib/legal/policy-docs";
import { formatPolicyDate } from "~/lib/legal/policy-versions";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

type Props = {
  update: MaterialPolicyUpdate;
  /** True until `effectiveOn` ("We're updating…"); false after ("We updated…"). */
  pending: boolean;
  platformDomain: string;
};

/**
 * Non-blocking notice that SimplePress's policies changed in a way that matters
 * (a `MaterialPolicyUpdate`). Mounted by `src/app/admin/layout.tsx` for store
 * OWNERS who have not yet been covered by the update; the server decides
 * (`resolvePolicyUpdateNotice`), this component only renders and records the
 * "Got it".
 *
 * Deliberately not a gate: continued use after the effective date is what binds
 * the owner, and the email carries the formal notice. The button writes a
 * `notice-ack` evidence row and the banner disappears; failing to record it
 * keeps the banner up with an inline error rather than pretending.
 *
 * Shape follows the other layout-level strip (`PaymentsDisabledBanner`): slim,
 * full-bleed above the page header, informational rather than alarming.
 */
export function PolicyUpdateBanner({ update, pending, platformDomain }: Props) {
  const router = useRouter();
  const headingId = useId();
  const errorId = useId();
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acknowledge = api.legal.acknowledgePolicyUpdate.useMutation({
    onSuccess: () => {
      setDismissed(true);
      router.refresh();
    },
    onError: (mutationError) => {
      setError(
        mutationError.message || "We couldn't record that. Please try again.",
      );
    },
  });

  if (dismissed) return null;

  const names = describePolicyDocs(update.documents);
  const date = formatPolicyDate(update.effectiveOn);
  const docs = policyDocsFor(update.documents);

  return (
    <section
      aria-labelledby={headingId}
      className="bg-card border-b px-4 py-3 text-sm lg:px-6"
    >
      <div className="flex items-start gap-3">
        <Info
          className="text-muted-foreground mt-0.5 size-4 shrink-0"
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2">
          <div className="min-w-0 flex-1 basis-80">
            <h2 id={headingId} className="font-medium">
              {pending
                ? `We're updating our ${names} on ${date}.`
                : `We updated our ${names} on ${date}.`}
            </h2>
            <p className="text-muted-foreground mt-0.5">{update.summary}</p>
            <p className="mt-1">
              <span className="text-muted-foreground">Read what changed: </span>
              {docs.map((doc, index) => (
                <span key={doc.slug}>
                  {index > 0 ? (
                    <span className="text-muted-foreground"> · </span>
                  ) : null}
                  <a
                    href={policyUrl(platformDomain, doc.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-visible:ring-ring/50 rounded-sm font-medium underline underline-offset-4 hover:no-underline focus-visible:ring-[3px] focus-visible:outline-none"
                  >
                    {doc.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </span>
              ))}
            </p>
            {error ? (
              <p id={errorId} role="alert" className="text-destructive mt-1">
                {error}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={acknowledge.isPending}
            aria-describedby={error ? errorId : undefined}
            onClick={() => {
              setError(null);
              acknowledge.mutate({ updateId: update.id });
            }}
          >
            {acknowledge.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : null}
            Got it
          </Button>
        </div>
      </div>
    </section>
  );
}
