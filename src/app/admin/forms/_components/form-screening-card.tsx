"use client";

import type { UseFormReturn } from "react-hook-form";
import { ChevronDown, ListChecks, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useWatch } from "react-hook-form";

import type { FormBuilderValues } from "./builder-shared";
import {
  FORM_SCREENING_MAX_LINKS,
  FORM_SCREENING_MAX_QUESTIONS,
} from "~/lib/validators/form";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { InputFormField } from "~/components/inputs/input-form-field";
import { SwitchFormField } from "~/components/inputs/switch-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

import { AdminEmpty } from "../../_components/admin-empty";
import { makeScreeningLink, makeScreeningQuestion } from "./builder-shared";

const SCREENING = "definition.settings.screening" as const;

type Props = {
  form: UseFormReturn<FormBuilderValues>;
};

/**
 * Optional yes/no questions shown BEFORE the form. A visitor who answers every
 * question the "right" way sees the form; anyone else sees a message and
 * helpful links instead. Turning it off keeps everything typed here, so it can
 * be switched back on later.
 */
export function FormScreeningCard({ form }: Props) {
  const screening = useWatch({
    control: form.control,
    name: SCREENING,
  });
  const enabled = screening?.enabled ?? false;

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: `${SCREENING}.questions`,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Screening questions</CardTitle>
        <CardDescription>
          Ask yes/no questions before showing the form. Visitors who don&apos;t
          qualify see your message and helpful links instead.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <SwitchFormField
          form={form}
          name={`${SCREENING}.enabled`}
          label="Ask screening questions first"
          description="Visitors only see the form after answering these."
        />

        {enabled && (
          <>
            <TextareaFormField
              form={form}
              name={`${SCREENING}.intro`}
              label="Introduction"
              description="Optional — shown above the first question."
              placeholder="e.g. A few quick questions to make sure we're the right fit."
              rows={2}
              maxLength={500}
              messageLength={screening?.intro?.length ?? 0}
            />

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Questions</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={fields.length >= FORM_SCREENING_MAX_QUESTIONS}
                  onClick={() => append(makeScreeningQuestion())}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Add question
                </Button>
              </div>

              {fields.length === 0 && (
                <AdminEmpty
                  icon={ListChecks}
                  title="No questions yet"
                  description="Add the first yes/no question visitors answer."
                />
              )}

              {fields.map((row, index) => (
                <ScreeningQuestionRow
                  key={row.id}
                  form={form}
                  index={index}
                  failMessageLength={
                    screening?.questions?.[index]?.failMessage?.length ?? 0
                  }
                  isFirst={index === 0}
                  isLast={index === fields.length - 1}
                  onMoveUp={() => move(index, index - 1)}
                  onMoveDown={() => move(index, index + 1)}
                  onRemove={() => remove(index)}
                />
              ))}

              {/* "Add at least one screening question or turn screening off"
                  and the max-questions error attach to `questions` itself,
                  not to any row. */}
              <FormField
                control={form.control}
                name={`${SCREENING}.questions`}
                render={() => (
                  <FormItem>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <TextareaFormField
              form={form}
              name={`${SCREENING}.defaultFailMessage`}
              label="Default message"
              description="Shown to anyone who doesn't qualify, unless the question they missed has its own message."
              rows={3}
              maxLength={1000}
              messageLength={screening?.defaultFailMessage?.length ?? 0}
            />

            <div className="space-y-4 rounded-lg border p-4">
              <p className="text-sm font-medium">Shown when they qualify</p>
              <TextareaFormField
                form={form}
                name={`${SCREENING}.unlockMessage`}
                label="Message"
                description="Optional — shown above the form, e.g. contact info or next steps."
                rows={3}
                maxLength={2000}
                messageLength={screening?.unlockMessage?.length ?? 0}
              />
              <ScreeningLinksEditor
                form={form}
                name={`${SCREENING}.unlockLinks`}
                label="Helpful links"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── One question ───────────────────────────────────────────────────────────

function ScreeningQuestionRow({
  form,
  index,
  failMessageLength,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  form: UseFormReturn<FormBuilderValues>;
  index: number;
  failMessageLength: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const base = `${SCREENING}.questions.${index}` as const;

  return (
    <div className="bg-muted/40 space-y-4 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs font-medium">
          Question {index + 1}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Move question ${index + 1} up`}
            disabled={isFirst}
            onClick={onMoveUp}
          >
            <ChevronDown className="h-4 w-4 rotate-180" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Move question ${index + 1} down`}
            disabled={isLast}
            onClick={onMoveDown}
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive/80"
            aria-label={`Remove question ${index + 1}`}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <InputFormField
        form={form}
        name={`${base}.prompt`}
        label="Question"
        required
        placeholder="e.g. Are you over 18?"
      />

      <FormField
        control={form.control}
        name={`${base}.passAnswer`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Answer that continues to the form</FormLabel>
            <FormControl>
              <ToggleGroup
                type="single"
                variant="outline"
                value={field.value ?? "yes"}
                onValueChange={(value) => {
                  // Radix emits "" when the pressed item is pressed again;
                  // one of the two must always stay chosen.
                  if (value) field.onChange(value);
                }}
              >
                <ToggleGroupItem value="yes" aria-label="Yes continues">
                  Yes
                </ToggleGroupItem>
                <ToggleGroupItem value="no" aria-label="No continues">
                  No
                </ToggleGroupItem>
              </ToggleGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <TextareaFormField
        form={form}
        name={`${base}.failMessage`}
        label="Message if they answer the other way"
        description="Optional."
        placeholder="Leave blank to use the default message below."
        rows={2}
        maxLength={1000}
        messageLength={failMessageLength}
      />

      <ScreeningLinksEditor
        form={form}
        name={`${base}.failLinks`}
        label="Helpful links for this question"
      />
    </div>
  );
}

// ─── Links ──────────────────────────────────────────────────────────────────

type LinksPath =
  | `${typeof SCREENING}.unlockLinks`
  | `${typeof SCREENING}.questions.${number}.failLinks`;

/**
 * A short list of label + address rows. Local on purpose: the navigation
 * builder's link rows carry nesting and page pickers this doesn't need.
 */
function ScreeningLinksEditor({
  form,
  name,
  label,
}: {
  form: UseFormReturn<FormBuilderValues>;
  name: LinksPath;
  label: string;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name,
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={fields.length >= FORM_SCREENING_MAX_LINKS}
          onClick={() => append(makeScreeningLink())}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add link
        </Button>
      </div>

      {fields.map((row, linkIndex) => (
        <div
          key={row.id}
          className="flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <FormField
            control={form.control}
            name={`${name}.${linkIndex}.label`}
            render={({ field }) => (
              <FormItem className="min-w-0 flex-1">
                <FormControl>
                  <Input
                    aria-label={`Link ${linkIndex + 1} text`}
                    placeholder="Link text"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`${name}.${linkIndex}.href`}
            render={({ field }) => (
              <FormItem className="min-w-0 flex-1">
                <FormControl>
                  <Input
                    aria-label={`Link ${linkIndex + 1} address`}
                    placeholder="/contact or https://…"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive/80 shrink-0"
            aria-label={`Remove link ${linkIndex + 1}`}
            onClick={() => remove(linkIndex)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ))}

      {/* Array-level errors ("At most 5 links") attach to the list itself. */}
      <FormField
        control={form.control}
        name={name}
        render={() => (
          <FormItem>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
