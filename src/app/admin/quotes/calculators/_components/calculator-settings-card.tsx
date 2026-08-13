"use client";

import type { UseFormReturn } from "react-hook-form";

import type { CalculatorFormValues } from "./builder-shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { SwitchFormField } from "~/components/inputs/switch-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

import { BuilderNumberField } from "./builder-number-field";

type Props = {
  form: UseFormReturn<CalculatorFormValues>;
  showEstimateToCustomer: boolean;
  displayAsRange: boolean;
};

/**
 * What happens after the visitor hits submit.
 *
 * The range controls are nested under `showEstimateToCustomer` because they are
 * meaningless without it: when the estimate stays internal the server never
 * sends a number at all, so padding a range around one would configure nothing.
 * (`toPublicCalculatorDefinition` does not even ship `displayAsRange` to the
 * browser — the server renders the range itself.)
 */
export function CalculatorSettingsCard({
  form,
  showEstimateToCustomer,
  displayAsRange,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>After submit</CardTitle>
        <CardDescription>
          What the visitor is told, and what you collect from them.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <SwitchFormField
          form={form}
          name="definition.showEstimateToCustomer"
          label="Show the estimate to the visitor"
          description="Off by default — most trades would rather start a conversation than hand over a bare number."
        />

        {showEstimateToCustomer && (
          <>
            <SwitchFormField
              form={form}
              name="definition.displayAsRange"
              label="Show a range instead of one figure"
              description="Renders “$2,000 – $2,400” rather than a single price."
            />

            {displayAsRange && (
              <BuilderNumberField
                form={form}
                name="definition.rangePaddingPercent"
                label="Range padding (%)"
                description="How far above and below the estimate the range reaches. 1–50."
                placeholder="10"
              />
            )}
          </>
        )}

        <SwitchFormField
          form={form}
          name="definition.requirePhone"
          label="Require a phone number"
          description="Name and email are always required."
        />

        <BuilderNumberField
          form={form}
          name="definition.responseDays"
          label="Response time (business days)"
          description="Shown as “we'll get back to you within N business days”. 1–14."
          placeholder="1"
        />

        <TextareaFormField
          form={form}
          name="definition.thankYouMessage"
          label="Thank-you message"
          description="Shown on the confirmation screen after the form is submitted."
          placeholder="Thanks! We received your request."
          rows={3}
        />
      </CardContent>
    </Card>
  );
}
