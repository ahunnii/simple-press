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
  showEstimateOnScreen: boolean;
  displayAsRange: boolean;
  showLiveEstimate: boolean;
};

/**
 * What happens after the visitor hits submit.
 *
 * The range controls are nested under `showEstimateToCustomer` (but NOT under
 * `showEstimateOnScreen`) because they shape the figure wherever it appears,
 * screen or email — when the estimate stays fully internal the server never
 * sends a number at all, so padding a range around one would configure
 * nothing, but an email-only estimate still needs to know whether that email
 * quotes one figure or a range. (`toPublicCalculatorDefinition` does not even
 * ship `displayAsRange` to the browser — the server renders the figure
 * itself.) The running estimate IS nested under `showEstimateOnScreen`, since
 * there is no screen to run it on when that switch is off, and the public
 * projection ANDs all three so a leftover `showLiveEstimate: true` can never
 * leak a price the owner hid.
 */
export function CalculatorSettingsCard({
  form,
  showEstimateToCustomer,
  showEstimateOnScreen,
  displayAsRange,
  showLiveEstimate,
}: Props) {
  // Only for the character counters — `TextareaFormField` renders "0/N" unless
  // it is told how long the current value is.
  const liveEstimateDisclaimer =
    form.watch("definition.liveEstimateDisclaimer") ?? "";
  const thankYouMessage = form.watch("definition.thankYouMessage") ?? "";

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
              name="definition.showEstimateOnScreen"
              label="Show it on the thank-you screen"
              description="Off = the figure is sent only in the confirmation email. The running estimate is hidden too."
            />

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
                min={1}
                max={50}
              />
            )}

            {showEstimateOnScreen && (
              <>
                {/* The tradeoff in the description is the owner's to make,
                    and it is stated plainly on purpose: a visitor who can
                    watch the number move can work out what each answer is
                    worth. */}
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
          </>
        )}

        <SwitchFormField
          form={form}
          name="definition.requirePhone"
          label="Require a phone number"
          description="Name and email are always required."
        />

        <SwitchFormField
          form={form}
          name="definition.sendConfirmationEmail"
          label="Email the visitor a confirmation"
          description="A receipt of their answers (and the estimate, if you share it). Turn off only if you always reply by hand."
        />

        <BuilderNumberField
          form={form}
          name="definition.responseDays"
          label="Response time (business days)"
          description="Shown as “we'll get back to you within N business days”. 1–14."
          placeholder="1"
          min={1}
          max={14}
        />

        <TextareaFormField
          form={form}
          name="definition.thankYouMessage"
          label="Thank-you message"
          description="Shown on the confirmation screen after the form is submitted."
          placeholder="Thanks! We received your request."
          rows={3}
          maxLength={500}
          messageLength={thankYouMessage.length}
        />
      </CardContent>
    </Card>
  );
}
