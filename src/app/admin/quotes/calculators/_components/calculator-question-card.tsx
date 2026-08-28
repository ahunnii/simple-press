"use client";

import type { UseFormReturn } from "react-hook-form";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircle,
  ChevronDown,
  GripVertical,
  MoreHorizontal,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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

/**
 * The react-hook-form path prefix for one question row.
 *
 * Passed in rather than rebuilt from indices here: the row's address is
 * `definition.screens.<s>.questions.<q>`, and only the screen card knows both
 * halves. Typed as a template literal so every `${base}.field` below is still a
 * checked `Path<CalculatorFormValues>` rather than a bare string.
 */
export type QuestionFieldPath =
  `definition.screens.${number}.questions.${number}`;

/** Radix Select rejects an empty-string item value, so "always shown" needs one. */
const SHOW_IF_NONE = "__always__";

const MAX_OPTIONS = 12;

type Props = {
  form: UseFormReturn<CalculatorFormValues>;
  /** `definition.screens.<screenIndex>.questions.<questionIndex>`. */
  base: QuestionFieldPath;
  /** Position in VISITOR order across all screens — what the owner is shown. */
  flatIndex: number;
  /** dnd-kit / React key — the `useFieldArray` row key, NOT `question.id`. */
  sortableId: string;
  /** The live watched value for this row. */
  question: QuestionInput;
  /** Earlier single-answer questions this one may depend on. */
  conditionSources: ConditionSource[];
  /** Screens this question could move to — never including its own. */
  screenOptions: { index: number; label: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: () => void;
  onMoveToScreen: (target: number | "new") => void;
};

export function CalculatorQuestionCard({
  form,
  base,
  flatIndex,
  sortableId,
  question,
  conditionSources,
  screenOptions,
  open,
  onOpenChange,
  onRemove,
  onMoveToScreen,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

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
          {/* Listeners live on the handle alone, never on the card: the card
              also sits inside a screen that is itself draggable, and a
              card-wide drag surface would make the two contexts fight. */}
          <button
            type="button"
            ref={setActivatorNodeRef}
            aria-label={`Drag to reorder question ${flatIndex + 1}`}
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
                {flatIndex + 1}.
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="More"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Move to screen…</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
                  {screenOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.index}
                      onClick={() => onMoveToScreen(option.index)}
                    >
                      <span className="truncate">{option.label}</span>
                    </DropdownMenuItem>
                  ))}
                  {screenOptions.length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={() => onMoveToScreen("new")}>
                    New screen
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive/80 shrink-0"
            aria-label={`Delete question ${flatIndex + 1}`}
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
            <QuestionOptionsEditor
              form={form}
              base={base}
              // A native <select> can't render an icon next to an option —
              // offering the picker for a dropdown question is a control the
              // owner can fill in that then does nothing.
              showIcons={question.type !== "dropdown"}
            />
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

          {question.type === "date" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name={`${base}.minDate`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Earliest allowed date</FormLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Any date</SelectItem>
                        <SelectItem value="today">Today or later</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Measured against today in your business&apos;s time zone,
                      not the visitor&apos;s.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <BuilderNumberField
                form={form}
                name={`${base}.maxDaysAhead`}
                label="At most this many days ahead"
                description="A scheduling horizon, counted from today. Leave blank for no limit."
                placeholder="No limit"
                emptyAs="null"
                min={1}
                max={730}
              />
            </div>
          )}

          {/* Branching. Only offered from the second question onward — counted
              in VISITOR order, not within the screen, so a question can branch
              on an earlier answer from the same screen (a live reveal) as well
              as on one from a screen before it. That is exactly the rule the
              validator enforces, so the menu can never build a condition the
              save would reject. */}
          {flatIndex > 0 && (
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
  base,
  showIcons,
}: {
  form: UseFormReturn<CalculatorFormValues>;
  base: QuestionFieldPath;
  /** A native `<select>` (dropdown) can't render an option's icon. */
  showIcons: boolean;
}) {
  const name = `${base}.options` as const;

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

          {showIcons && (
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
          )}

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
