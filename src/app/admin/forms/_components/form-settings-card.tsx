"use client";

import type { UseFormReturn } from "react-hook-form";

import type { FieldInput, FormBuilderValues } from "./builder-shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { InputFormField } from "~/components/inputs/input-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

import { isEmailFieldInput } from "./builder-shared";

/** Radix `Select` rejects an empty-string item value. */
const NO_CONFIRMATION = "__none__";

type Props = {
  form: UseFormReturn<FormBuilderValues>;
  fields: FieldInput[];
  confirmationFieldId: string | null | undefined;
  confirmationMessage: string;
  successMessage: string;
  /** The business's support email — shown as the "Notify email" placeholder. */
  defaultNotifyEmail: string | null | undefined;
};

/**
 * What happens after the visitor hits submit: the button label, the
 * on-screen success message, an optional confirmation copy to the visitor
 * (only offered to `email`-type fields — nothing else can receive mail), and
 * where the owner's own notification lands.
 */
export function FormSettingsCard({
  form,
  fields,
  confirmationFieldId,
  confirmationMessage,
  successMessage,
  defaultNotifyEmail,
}: Props) {
  const emailFields = fields.filter(isEmailFieldInput);
  const hasConfirmation = !!confirmationFieldId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>After submit</CardTitle>
        <CardDescription>
          What the visitor sees, and who gets notified.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <InputFormField
          form={form}
          name="definition.settings.submitLabel"
          label="Submit button label"
          required
          placeholder="Submit"
        />

        <TextareaFormField
          form={form}
          name="definition.settings.successMessage"
          label="Success message"
          description="Shown after the visitor submits the form."
          placeholder="Thanks! We received your submission."
          rows={3}
          maxLength={1000}
          messageLength={successMessage.length}
        />

        <FormField
          control={form.control}
          name="definition.settings.confirmationFieldId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Send confirmation email to</FormLabel>
              <Select
                value={field.value ?? NO_CONFIRMATION}
                onValueChange={(value) =>
                  field.onChange(value === NO_CONFIRMATION ? null : value)
                }
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_CONFIRMATION}>
                    Don&apos;t send a confirmation
                  </SelectItem>
                  {emailFields.map((emailField) => (
                    <SelectItem key={emailField.id} value={emailField.id}>
                      {emailField.label.trim() || "Untitled field"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {emailFields.length === 0
                  ? "Add an Email field to offer a confirmation copy."
                  : "Signed-in customers get this field pre-filled with their account email."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <InputFormField
          form={form}
          name="definition.settings.confirmationSubject"
          label="Confirmation subject"
          placeholder="We received your submission"
          disabled={!hasConfirmation}
        />

        <TextareaFormField
          form={form}
          name="definition.settings.confirmationMessage"
          label="Confirmation message"
          placeholder="Thanks for reaching out! This is a quick note to confirm we received your submission. We'll be in touch soon."
          rows={4}
          maxLength={2000}
          messageLength={confirmationMessage.length}
          disabled={!hasConfirmation}
        />

        <InputFormField
          form={form}
          name="definition.settings.notifyEmail"
          label="Notify email"
          type="email"
          placeholder={
            defaultNotifyEmail
              ? `Defaults to ${defaultNotifyEmail}`
              : "Defaults to your business email"
          }
          description="Override where new entries are sent. Leave blank to use your business's default."
        />
      </CardContent>
    </Card>
  );
}
