"use client";

import { Eye } from "lucide-react";

import type { FormDefinitionInput } from "./builder-shared";
import {
  storedFormDefinitionSchema,
  toPublicFormDefinition,
} from "~/lib/validators/form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { FormRenderer } from "~/components/forms/form-renderer";

import { AdminEmpty } from "../../_components/admin-empty";

type Props = {
  definition: FormDefinitionInput;
  formId: string;
};

/**
 * Live preview of the form as a visitor would see it.
 *
 * The watched builder values are `z.input` of the write schema — half-typed,
 * defaults not yet filled in — so they are re-validated through the tolerant
 * READ schema (`storedFormDefinitionSchema`, same one `form.getById` uses for
 * drift tolerance) before `toPublicFormDefinition` can run. A definition that
 * doesn't parse yet (e.g. two fields mid-rename to the same label) shows a
 * "fix errors" placeholder instead of crashing the panel.
 */
export function FormPreviewPanel({ definition, formId }: Props) {
  const parsed = storedFormDefinitionSchema.safeParse(definition);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-4 w-4" aria-hidden="true" />
          Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!parsed.success || parsed.data.fields.length === 0 ? (
          <AdminEmpty
            icon={Eye}
            title={
              !parsed.success ? "Fix errors to preview" : "Nothing to preview"
            }
            description={
              !parsed.success
                ? "Resolve the highlighted fields to see a live preview."
                : "Add a field to see how it looks to visitors."
            }
          />
        ) : (
          <FormRenderer
            definition={toPublicFormDefinition(parsed.data)}
            formId={formId}
            mode="preview"
          />
        )}
      </CardContent>
    </Card>
  );
}
