"use client";

import type { UseFormReturn } from "react-hook-form";

import type { CalculatorFormValues } from "./builder-shared";
import { QUOTE_LIVE_ESTIMATE_DISCLAIMER_DEFAULT } from "~/lib/validators/quote-calculator";
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
  showLiveEstimate: boolean;
};

/**
 * What happens after the visitor hits submit.
 *
 * The range controls are nested under `showEstimateToCustomer` because they are
 * meaningless without it: when the estimate stays internal the server never
 * sends a number at all, so padding a range around one would configure nothing.
 * (`toPublicCalculatorDefinition` does not even ship `displayAsRange` to the
 * browser — the server renders the range itself.) The running estimate is
 * nested for the same reason, and the public projection ANDs the two so a
 * leftover `showLiveEstimate: true` can never leak a price the owner hid.
 */
export function CalculatorSettingsCard({
  form,
  showEstimateToCustomer,
  displayAsRange,
  showLiveEstimate,
}: Props) {
  // Only for the character counter — `TextareaFormField` renders "0/300"
  // unless it is told how long the current value is.
  const liveEstimateDisclaimer =
    form.watch("definition.liveEstimateDisclaimer") ?? "";

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
          name="definition.showReviewStep"
          label="Review step"
          description="Visitors see a summary of their answers with Edit links before sending."
        />

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

            {/* The tradeoff in the description is the owner's to make, and it
                is stated plainly on purpose: a visitor who can watch the
                number move can work out what each answer is worth. */}
            <SwitchFormField
              form={form}
              name="definition.showLiveEstimate"
              label="Show a running estimate while they answer"
              description="Visitors can flip answers back and forth and watch the number move, which effectively reveals how each answer changes the price. Fine for menu-style pricing; leave off if your price table is sensitive."
            />

            {showLiveEstimate && (
              <TextareaFormField
                form={form}
                name="definition.liveEstimateDisclaimer"
                label="Running-estimate disclaimer"
                description="Shown under the running number. A figure that moves as they answer reads as a firm price unless something says otherwise."
                placeholder={QUOTE_LIVE_ESTIMATE_DISCLAIMER_DEFAULT}
                rows={2}
                maxLength={300}
                messageLength={liveEstimateDisclaimer.length}
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
