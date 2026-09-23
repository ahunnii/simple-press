"use client";

import { FormInput } from "lucide-react";

import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { FormRenderer } from "./form-renderer";

/**
 * Renders a single form by id, for a `form` node embedded in CMS page or
 * blog-post rich text. Mirrors `QuoteCalculatorBlock`: the same four states
 * (no id → nothing, loading → skeleton, unavailable → placeholder, ready →
 * widget), and the same reason for the placeholder — `getByIdPublic`
 * deliberately returns NOT_FOUND for both "missing" and "unpublished" so an
 * id can't be used to enumerate an owner's drafts.
 *
 * Unlike quote calculators, forms always render at content width (a form is
 * a short input surface, not a wide interactive widget) — no width/height/
 * density/layout node attrs.
 */
export function FormBlock({ formId }: { formId: string | null }) {
  const {
    data: form,
    isLoading,
    error,
  } = api.form.getByIdPublic.useQuery(
    { id: formId ?? "" },
    { enabled: !!formId, retry: false },
  );

  if (!formId) return null;

  const outerClass = "not-prose sp-form-block my-6 max-w-prose";

  if (isLoading) {
    return (
      <div className={outerClass}>
        <div className="bg-muted/50 border-input animate-pulse rounded-lg border py-24" />
      </div>
    );
  }

  const code = error?.data?.code;
  if (code === "FORBIDDEN" || code === "NOT_FOUND") {
    return (
      <div className={outerClass}>
        <div className="border-input bg-muted/30 text-muted-foreground flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12">
          <FormInput className="size-8 opacity-40" aria-hidden="true" />
          <p className="text-sm">This form is not available</p>
        </div>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className={cn(outerClass)}>
      <FormRenderer
        formId={form.id}
        definition={form.definition}
        mode="live"
      />
    </div>
  );
}
