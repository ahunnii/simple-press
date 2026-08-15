"use client";

import type { UseFormReturn } from "react-hook-form";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircle,
  ChevronDown,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useFieldArray } from "react-hook-form";

import type { CalculatorFormValues, QuestionInput } from "./builder-shared";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

import { BuilderNumberField } from "./builder-number-field";
import {
  isOptionQuestionInput,
  isVariableQuestionInput,
  makeOption,
  QUESTION_TYPE_META,
} from "./builder-shared";
import { QuoteIconPicker } from "./quote-icon-picker";

/** A question an earlier show-if may branch on: single-answer types only. */
export type ConditionSource = {
  id: string;
  title: string;
  options: { id: string; label: string }[];
};

/** Radix Select rejects an empty-string item value, so "always shown" needs one. */
const SHOW_IF_NONE = "__always__";

const MAX_OPTIONS = 12;

type Props = {
  form: UseFormReturn<CalculatorFormValues>;
  index: number;
  /** dnd-kit / React key — the `useFieldArray` row key, NOT `question.id`. */
  sortableId: string;
  /** The live watched value for this row. */
  question: QuestionInput;
  /** Earlier single-answer questions this one may depend on. */
  conditionSources: ConditionSource[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: () => void;
};

export function CalculatorQuestionCard({
  form,
  index,
  sortableId,
  question,
  conditionSources,
  open,
  onOpenChange,
  onRemove,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const base = `definition.questions.${index}` as const;
  const meta = QUESTION_TYPE_META[question.type];

  // Any resolver error anywhere under this row. Used to flag a COLLAPSED card,
  // which is the case where an owner would otherwise submit, see a toast, and
  // have no idea which of twenty rows to open. `form.formState` is passed
  // explicitly so this subscribes to error changes rather than reading a stale
  // snapshot.
  const rowState = form.getFieldState(base, form.formState);

  // Normalize before use: react-hook-form materializes registered nested
  // paths, so an untouched condition can surface here as
  // `{ questionId: undefined }` instead of null. Treating that as a real
  // condition would flag a phantom validation error AND read as "hidden
  // behind a nonexistent question" in the test panel. The definition schema
  // applies the same normalization at save time.
  const rawShowIf = question.showIf ?? null;
  const showIf = rawShowIf?.questionId ? rawShowIf : null;
  const activeSource = showIf
    ? conditionSources.find((source) => source.id === showIf.questionId)
    : undefined;

  const setShowIf = (next: { questionId: string; optionId: string } | null) => {
    form.setValue(`${base}.showIf`, next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("gap-0 py-0", isDragging && "z-10 shadow-lg")}
    >
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div className="flex items-center gap-2 p-3">
          <button
            type="button"
            aria-label={`Drag to reorder question ${index + 1}`}
            className="focus-visible:ring-ring text-muted-foreground hover:text-foreground flex h-9 w-9 shrink-0 cursor-move items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>

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
                {question.title.trim() || "Untitled question"}
              </span>
              <Badge variant="secondary" className="shrink-0">
                {meta.label}
              </Badge>
              {isVariableQuestionInput(question) &&
                question.variableName.trim() !== "" && (
                  <Badge variant="outline" className="shrink-0 font-mono">
                    {question.variableName}
                  </Badge>
                )}
              {showIf && (
                <Badge variant="outline" className="hidden shrink-0 sm:inline">
                  Conditional
                </Badge>
              )}
              {!open && rowState.invalid && (
                <Badge variant="destructive" className="shrink-0">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  Needs attention
                </Badge>
              )}
            </button>
          </CollapsibleTrigger>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive/80 shrink-0"
            aria-label={`Delete question ${index + 1}`}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <CollapsibleContent className="space-y-4 border-t p-4">
          <FormField
            control={form.control}
            name={`${base}.title`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Question{" "}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. How many bedrooms are you moving?"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`${base}.description`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Helper text</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder="Optional — shown under the question."
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Type is shown, never edited. Switching it would orphan the
                options an existing show-if points at and silently change what
                the variable means in the formula — delete and re-add instead,
                which forces both to be reconsidered. */}
            <div className="space-y-1">
              <p className="text-sm font-medium">Type</p>
              <p className="text-sm">{meta.label}</p>
              <p className="text-muted-foreground text-xs">
                {meta.hint} Type is fixed once a question is added — delete and
                re-add to change it.
              </p>
            </div>

            <FormField
              control={form.control}
              name={`${base}.required`}
              render={({ field }) => (
                <FormItem className="flex h-fit flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Required</FormLabel>
                    <FormDescription>
                      Visitors can&apos;t continue without answering.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value ?? true}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {isVariableQuestionInput(question) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name={`${base}.variableName`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Variable name{" "}
                      <span className="text-destructive" aria-hidden="true">
                        *
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="font-mono"
                        placeholder="e.g. bedrooms"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Lowercase letters, digits and underscores — this is the
                      name you type in the formula.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <BuilderNumberField
                form={form}
                name={`${base}.hiddenDefault`}
                label="Value when skipped"
                description={
                  question.type === "multiselect"
                    ? "Used when branching hides this question. Checking nothing on a visible multi-select is always 0."
                    : "Used when branching hides this question, or an optional one is left blank."
                }
                placeholder="0"
              />
            </div>
          )}

          {isOptionQuestionInput(question) && (
            <QuestionOptionsEditor form={form} index={index} />
          )}

          {question.type === "number" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <BuilderNumberField
                form={form}
                name={`${base}.min`}
                label="Minimum"
                placeholder="No minimum"
                emptyAs="null"
              />
              <BuilderNumberField
                form={form}
                name={`${base}.max`}
                label="Maximum"
                placeholder="No maximum"
                emptyAs="null"
              />
              <FormField
                control={form.control}
                name={`${base}.unitLabel`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. boxes"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Branching. Only offered from the second question onward, and only
              against earlier single-answer questions — the same rule the
              validator enforces, so the menu can never build a condition the
              save would reject. */}
          {index > 0 && (
            <div className="space-y-2 rounded-lg border p-4">
              <p className="text-sm font-medium">Only show when…</p>

              {conditionSources.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Add a choice or dropdown question above this one to branch on
                  its answer.
                </p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select
                      value={showIf?.questionId ?? SHOW_IF_NONE}
                      onValueChange={(value) => {
                        if (value === SHOW_IF_NONE) {
                          setShowIf(null);
                          return;
                        }
                        const source = conditionSources.find(
                          (candidate) => candidate.id === value,
                        );
                        // Seed the first option so a half-built condition never
                        // sits in state — `optionId: ""` fails the schema and
                        // reads to the owner as a bug rather than a to-do.
                        setShowIf({
                          questionId: value,
                          optionId: source?.options[0]?.id ?? "",
                        });
                      }}
                    >
                      <SelectTrigger aria-label="Question this one depends on">
                        <SelectValue placeholder="Always shown" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SHOW_IF_NONE}>
                          Always shown
                        </SelectItem>
                        {conditionSources.map((source) => (
                          <SelectItem key={source.id} value={source.id}>
                            {source.title.trim() || "Untitled question"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={showIf?.optionId ?? ""}
                      disabled={!activeSource}
                      onValueChange={(value) => {
                        if (!showIf) return;
                        setShowIf({
                          questionId: showIf.questionId,
                          optionId: value,
                        });
                      }}
                    >
                      <SelectTrigger aria-label="Answer that reveals this question">
                        <SelectValue placeholder="Pick an answer" />
                      </SelectTrigger>
                      <SelectContent>
                        {(activeSource?.options ?? []).map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label.trim() || "Untitled option"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* The validator reports show-if problems against
                      `showIf.questionId` / `showIf.optionId`; these render them
                      where the owner is looking. Mounted ONLY while a condition
                      exists: registering the nested paths on an unconditioned
                      question makes react-hook-form materialize `showIf: null`
                      into an empty object, which then fails validation. */}
                  {showIf && (
                    <>
                      <FormField
                        control={form.control}
                        name={`${base}.showIf.questionId`}
                        render={() => (
                          <FormItem>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`${base}.showIf.optionId`}
                        render={() => (
                          <FormItem>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ─── Options ────────────────────────────────────────────────────────────────

function QuestionOptionsEditor({
  form,
  index,
}: {
  form: UseFormReturn<CalculatorFormValues>;
  index: number;
}) {
  const name = `definition.questions.${index}.options` as const;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name,
  });

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Options</p>
          <p className="text-muted-foreground text-xs">
            &quot;Value&quot; is the number this option contributes to the
            formula — a price, a multiplier, or a negative discount. It is never
            sent to the visitor&apos;s browser.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={fields.length >= MAX_OPTIONS}
          onClick={() => append(makeOption())}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add option
        </Button>
      </div>

      {fields.map((field, optionIndex) => (
        <div
          key={field.id}
          className="bg-muted/40 flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start"
        >
          <FormField
            control={form.control}
            name={`${name}.${optionIndex}.label`}
            render={({ field: labelField }) => (
              <FormItem className="min-w-0 flex-[2]">
                <FormLabel className="text-muted-foreground text-xs">
                  Label
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 3–4 bedrooms" {...labelField} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <BuilderNumberField
            form={form}
            name={`${name}.${optionIndex}.value`}
            label="Value"
            placeholder="0"
            className="min-w-0 flex-1"
          />

          <FormField
            control={form.control}
            name={`${name}.${optionIndex}.icon`}
            render={({ field: iconField }) => (
              <FormItem className="shrink-0">
                <FormLabel className="text-muted-foreground text-xs">
                  Icon
                </FormLabel>
                <FormControl>
                  <div>
                    <QuoteIconPicker
                      value={
                        typeof iconField.value === "string"
                          ? iconField.value
                          : null
                      }
                      onChange={iconField.onChange}
                      label={`Icon for option ${optionIndex + 1}`}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive/80 shrink-0 sm:mt-6"
            aria-label={`Remove option ${optionIndex + 1}`}
            onClick={() => remove(optionIndex)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ))}

      {/* Array-level errors ("Add at least 2 options") attach to the options
          path itself, not to any row, so they need their own message slot. */}
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
