"use client";

import type { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  Copy,
  ListChecks,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useFieldArray, useFormState, useWatch } from "react-hook-form";

import type { FormBuilderValues } from "./builder-shared";
import { cn } from "~/lib/utils";
import { FORM_SCREENING_MAX_QUESTIONS } from "~/lib/validators/form";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { InputFormField } from "~/components/inputs/input-form-field";
import { MinimalTiptapFormField } from "~/components/inputs/minimal-tiptap-form-field";
import { SwitchFormField } from "~/components/inputs/switch-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

import { AdminEmpty } from "../../_components/admin-empty";
import { makeScreeningQuestion } from "./builder-shared";

const SCREENING = "definition.settings.screening" as const;

type Props = {
  form: UseFormReturn<FormBuilderValues>;
  /** `media` flag on — lets the messages' image dialogs pick from the library. */
  mediaLibraryEnabled?: boolean;
};

/**
 * Optional yes/no questions shown BEFORE the form. A visitor who answers every
 * question the "right" way sees the form; anyone else sees a message instead. Turning it off keeps everything typed here, so it can
 * be switched back on later.
 */
export function FormScreeningCard({
  form,
  mediaLibraryEnabled = false,
}: Props) {
  const screening = useWatch({
    control: form.control,
    name: SCREENING,
  });
  const enabled = screening?.enabled ?? false;

  // Open/closed is UI state only (not in the form). Questions already on the
  // form start collapsed; a newly added one opens, same as a field card.
  const [openQuestionIds, setOpenQuestionIds] = useState<string[]>([]);

  const { fields, append, insert, remove, move } = useFieldArray({
    control: form.control,
    name: `${SCREENING}.questions`,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Screening questions</CardTitle>
        <CardDescription>
          Ask yes/no questions before showing the form. Visitors who don&apos;t
          qualify see your message instead.
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
                  onClick={() => {
                    const question = makeScreeningQuestion();
                    append(question);
                    setOpenQuestionIds((previous) => [
                      ...previous,
                      question.id,
                    ]);
                  }}
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

              {fields.map((row, index) => {
                const question = screening?.questions?.[index];
                // The question's own id (stable across moves) keys open state;
                // `row.id` is useFieldArray's generated key.
                const questionId = question?.id ?? row.id;
                return (
                  <ScreeningQuestionRow
                    key={row.id}
                    form={form}
                    index={index}
                    prompt={question?.prompt ?? ""}
                    passAnswer={question?.passAnswer ?? "yes"}
                    mediaLibraryEnabled={mediaLibraryEnabled}
                    open={openQuestionIds.includes(questionId)}
                    onOpenChange={(next) =>
                      setOpenQuestionIds((previous) =>
                        next
                          ? [...previous, questionId]
                          : previous.filter((id) => id !== questionId),
                      )
                    }
                    isFirst={index === 0}
                    isLast={index === fields.length - 1}
                    onMoveUp={() => move(index, index - 1)}
                    onMoveDown={() => move(index, index + 1)}
                    canDuplicate={fields.length < FORM_SCREENING_MAX_QUESTIONS}
                    onDuplicate={() => {
                      // Same wording, answer and message; new id.
                      const copy = {
                        ...makeScreeningQuestion(),
                        ...structuredClone(
                          form.getValues(`${SCREENING}.questions.${index}`),
                        ),
                      };
                      copy.id = makeScreeningQuestion().id;
                      insert(index + 1, copy);
                      setOpenQuestionIds((previous) => [...previous, copy.id]);
                    }}
                    onRemove={() => remove(index)}
                  />
                );
              })}

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

            <MinimalTiptapFormField
              form={form}
              name={`${SCREENING}.defaultFailContent`}
              label="Default message"
              description="Shown to anyone who doesn't qualify, unless the question they missed has its own message."
              output="json"
              formsEnabled={false}
              galleriesEnabled={false}
              quotesEnabled={false}
              embedsEnabled={false}
              videosEnabled={false}
              layoutBlocksEnabled={false}
              mediaEnabled={mediaLibraryEnabled}
              editorContentClassName="min-h-[96px] p-3"
              className="min-w-0 grid-cols-[minmax(0,1fr)]"
            />

            <div className="space-y-4 rounded-lg border p-4">
              <p className="text-sm font-medium">Shown when they qualify</p>
              {/* A form must never be insertable inside its own note, so every
                  embed is off. Layout blocks (rows/collapsibles) stay off too:
                  this is a short note, and button links (Style → Button in the
                  link popover) don't depend on them. */}
              <MinimalTiptapFormField
                form={form}
                name={`${SCREENING}.unlockContent`}
                label="Message"
                description="Optional — shown above the form once they qualify, e.g. contact info, next steps, or a button link."
                output="json"
                formsEnabled={false}
                galleriesEnabled={false}
                quotesEnabled={false}
                embedsEnabled={false}
                videosEnabled={false}
                layoutBlocksEnabled={false}
                mediaEnabled={mediaLibraryEnabled}
                editorContentClassName="min-h-[120px] p-4"
                // The toolbar is w-max; without a 0-min track it widens this
                // narrow column instead of scrolling sideways.
                className="min-w-0 grid-cols-[minmax(0,1fr)]"
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
  prompt,
  passAnswer,
  mediaLibraryEnabled,
  open,
  onOpenChange,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  canDuplicate,
  onDuplicate,
  onRemove,
}: {
  form: UseFormReturn<FormBuilderValues>;
  index: number;
  prompt: string;
  passAnswer: "yes" | "no";
  mediaLibraryEnabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canDuplicate: boolean;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const base = `${SCREENING}.questions.${index}` as const;

  // Subscribed to this row's errors, so a collapsed question that fails
  // validation (empty prompt, oversized message) still flags itself.
  const formState = useFormState({ control: form.control, name: base });
  const invalid = form.getFieldState(base, formState).invalid;

  return (
    <Card className="gap-0 py-0">
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div className="flex items-center gap-2 p-3">
          <div className="flex shrink-0 flex-col">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-4 w-8"
              aria-label={`Move question ${index + 1} up`}
              disabled={isFirst}
              onClick={onMoveUp}
            >
              <ChevronDown className="h-3 w-3 rotate-180" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-4 w-8"
              aria-label={`Move question ${index + 1} down`}
              disabled={isLast}
              onClick={onMoveDown}
            >
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>

          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-2 rounded-md py-1 text-left focus-visible:ring-2 focus-visible:outline-none"
            >
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
                  open && "rotate-180",
                )}
              />
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {index + 1}.
              </span>
              <span className="truncate text-sm font-medium">
                {prompt.trim() || "Untitled question"}
              </span>
              <Badge variant="secondary" className="hidden shrink-0 sm:inline">
                Continues on {passAnswer === "no" ? "No" : "Yes"}
              </Badge>
              {!open && invalid && (
                <Badge variant="destructive" className="shrink-0">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  Needs attention
                </Badge>
              )}
            </button>
          </CollapsibleTrigger>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label={`More for question ${index + 1}`}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={!canDuplicate} onClick={onDuplicate}>
                <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onRemove}
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CollapsibleContent className="space-y-4 border-t p-4">
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

          {/* Same embed rules as the unlock note below: everything off. A
              button link (Style → Button in the link popover) still works. */}
          <MinimalTiptapFormField
            form={form}
            name={`${base}.failContent`}
            label="Message if they answer the other way"
            description="Optional — leave blank to use the default message below. Add a button link to point them somewhere helpful."
            output="json"
            formsEnabled={false}
            galleriesEnabled={false}
            quotesEnabled={false}
            embedsEnabled={false}
            videosEnabled={false}
            layoutBlocksEnabled={false}
            mediaEnabled={mediaLibraryEnabled}
            editorContentClassName="min-h-[96px] p-3"
            className="min-w-0 grid-cols-[minmax(0,1fr)]"
          />
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
