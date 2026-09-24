"use client";

import type { UseFormReturn } from "react-hook-form";

import type { InvoiceBuilderValues } from "./types";
import {
  INVOICE_DUE_TERMS_LABELS,
  INVOICE_DUE_TERMS_VALUES,
} from "~/lib/validators/invoice";
import { InputFormField } from "~/components/inputs/input-form-field";
import { SelectFormField } from "~/components/inputs/select-form-field";

export function DueTermsField({
  form,
}: {
  form: UseFormReturn<InvoiceBuilderValues>;
}) {
  const dueTerms = form.watch("dueTerms");

  return (
    <div className="space-y-3">
      <SelectFormField
        form={form}
        name="dueTerms"
        label="Due"
        required
        values={INVOICE_DUE_TERMS_VALUES.map((value) => ({
          value,
          label: INVOICE_DUE_TERMS_LABELS[value],
        }))}
        onValueChange={(value) => {
          if (value !== "custom") {
            form.setValue("customDueDate", "", {
              shouldDirty: true,
              shouldValidate: true,
            });
          }
        }}
      />
      <p className="text-muted-foreground text-xs">
        Preset terms are counted from the day you send this invoice.
      </p>
      {dueTerms === "custom" && (
        <InputFormField
          form={form}
          name="customDueDate"
          label="Due date"
          type="date"
          required
        />
      )}
    </div>
  );
}
