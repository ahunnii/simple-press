"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import type { UseFormReturn } from "react-hook-form";
import { useId, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";

import type { CalculatorFormValues, ScreenInput } from "./builder-shared";
import type { ConditionSource } from "./calculator-question-card";
import type { QuoteQuestionType } from "~/lib/validators/quote-calculator";
import { cn } from "~/lib/utils";
import {
  QUOTE_MAX_QUESTIONS,
  QUOTE_MAX_QUESTIONS_PER_SCREEN,
} from "~/lib/validators/quote-calculator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
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
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

import {
  commonTabIds,
  QUESTION_TYPE_META,
  QUESTION_TYPE_ORDER,
} from "./builder-shared";
import { CalculatorQuestionCard } from "./calculator-question-card";

type Props = {
  form: UseFormReturn<CalculatorFormValues>;
  screenIndex: number;
  /** dnd-kit / React key — the `useFieldArray` row key, NOT `screen.id`. */
  sortableId: string;
  /** The live watched value for this screen. */
  screen: ScreenInput;
  /** How many questions precede this screen in visitor order. */
  flatOffset: number;
  /** Every screen, for the per-question "Move to screen…" menu. */
  screenOptions: { index: number; label: string }[];
  /** Total across all screens — the 30-question ceiling is global. */
  totalQuestionCount: number;
  conditionSourcesFor: (flatIndex: number) => ConditionSource[];
  /** Every tab the calculator has. Empty when tabs are off — the "Show this screen on" control renders nothing in that case. */
  tabs: { id: string; label: string }[];
  /** Sets every question on THIS screen to the same tab membership. `[]` means every tab. */
  onSetScreenTabIds: (tabIds: string[]) => void;
  openQuestionIds: string[];
  onOpenChange: (questionId: string, open: boolean) => void;
  onRemoveScreen: () => void;
  onAddQuestion: (type: QuoteQuestionType) => void;
  onRemoveQuestion: (questionIndex: number) => void;
  onMoveQuestion: (questionIndex: number, target: number | "new") => void;
  onChangeQuestionType: (
    questionIndex: number,
    nextType: QuoteQuestionType,
  ) => void;
};

/**
 * One screen — one step the visitor sees — and the questions on it.
 *
 * Two things about this component are deliberate and easy to undo by accident:
 *
 * 1. **The nested `useFieldArray` lives HERE, not in the builder.** Hooks
 *    cannot be called inside the parent's `screens.map()`, so the only place
 *    that can own `definition.screens.<i>.questions` as a field array is a
 *    component rendered once per screen. It owns in-screen drag reordering
 *    (`move`), which is the one mutation that must keep RHF's per-row error and
 *    touched state travelling with the row. Every other question mutation
 *    (add, remove, move BETWEEN screens) is a whole-array rewrite the parent
 *    performs with `replace`, because it spans two screens and has to be atomic.
 * 2. **A second, nested `DndContext`.** dnd-kit binds each `useSortable` to the
 *    NEAREST context, so the screen's own handle (registered above, against the
 *    builder's context) sorts screens while the handles rendered below sort
 *    questions within this screen. The screen handle therefore has to be the
 *    ONLY thing carrying the outer drag listeners — hence
 *    `setActivatorNodeRef` on the button rather than listeners on the card.
 */
export function CalculatorScreenCard({
  form,
  screenIndex,
  sortableId,
  screen,
  flatOffset,
  screenOptions,
  totalQuestionCount,
  conditionSourcesFor,
  tabs,
  onSetScreenTabIds,
  openQuestionIds,
  onOpenChange,
  onRemoveScreen,
  onAddQuestion,
  onRemoveQuestion,
  onMoveQuestion,
  onChangeQuestionType,
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

  // Per-screen, and expanded by default: a collapsed screen is a screen whose
  // questions the owner cannot see, which is the wrong default for the card
  // they came here to edit.
  const [open, setOpen] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { fields: questionFields, move: moveQuestion } = useFieldArray({
    control: form.control,
    name: `definition.screens.${screenIndex}.questions`,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Distinct id per nested context: dnd-kit derives its aria/announcement ids
  // from it, and two contexts sharing one produces duplicate DOM ids.
  const dndContextId = useId();

  const questionCount = screen.questions.length;
  const heading = (screen.title ?? "").trim();

  const canAddQuestion =
    questionCount < QUOTE_MAX_QUESTIONS_PER_SCREEN &&
    totalQuestionCount < QUOTE_MAX_QUESTIONS;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questionFields.findIndex(
      (field) => field.id === active.id,
    );
    const newIndex = questionFields.findIndex((field) => field.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    moveQuestion(oldIndex, newIndex);
  };

  const requestRemoveScreen = () => {
    // A one-question screen deletes as quietly as a single question does —
    // it IS a single question. Grouped screens get a confirmation, because
    // "delete screen" is then several questions the owner cannot get back.
    if (questionCount > 1) {
      setShowDeleteDialog(true);
      return;
    }
    onRemoveScreen();
  };

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("gap-0 py-0", isDragging && "z-10 shadow-lg")}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="bg-muted/30 flex items-center gap-2 rounded-t-xl p-3">
          <button
            type="button"
            ref={setActivatorNodeRef}
            aria-label={`Drag to reorder screen ${screenIndex + 1}`}
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
              <span className="shrink-0 text-sm font-semibold">
                {`Screen ${screenIndex + 1}`}
              </span>
              {heading !== "" && (
                <span className="text-muted-foreground truncate text-sm">
                  {heading}
                </span>
              )}
              <Badge variant="secondary" className="shrink-0">
                {questionCount === 1
                  ? "1 question"
                  : `${questionCount} questions`}
              </Badge>
            </button>
          </CollapsibleTrigger>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive/80 shrink-0"
            aria-label={`Delete screen ${screenIndex + 1}`}
            onClick={requestRemoveScreen}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <CollapsibleContent className="space-y-4 border-t p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name={`definition.screens.${screenIndex}.title`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Screen heading</FormLabel>
                  <FormControl>
                    <Input
                      maxLength={120}
                      placeholder="Recommended when a screen has more than one question"
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

            <FormField
              control={form.control}
              name={`definition.screens.${screenIndex}.description`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intro text</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      maxLength={300}
                      placeholder="Optional — shown under the heading."
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

          {tabs.length > 0 &&
            (() => {
              // Whole-screen control: an owner thinks in steps ("this screen is
              // Commercial-only"), not per question. `commonTabIds` is the
              // membership every question on this screen currently shares, or
              // `"mixed"` when they disagree — which the control must show
              // rather than silently picking one question's list and
              // overwriting the rest on the next click.
              const shared = commonTabIds(screen.questions);
              const pressed = shared === "mixed" ? [] : shared;
              const helperText =
                shared === "mixed"
                  ? "Mixed — questions on this screen differ; pick tabs here to set them all."
                  : pressed.length === 0
                    ? "All tabs"
                    : null;

              return (
                <div className="space-y-1.5">
                  <Label>Show this screen on</Label>
                  <ToggleGroup
                    type="multiple"
                    variant="outline"
                    value={pressed}
                    onValueChange={(values) =>
                      // Selecting every tab is the same as selecting none — both
                      // mean "every tab" — so it is written as `[]`, the value
                      // `tabApplies` and the schema already treat that way.
                      onSetScreenTabIds(
                        values.length >= tabs.length ? [] : values,
                      )
                    }
                  >
                    {tabs.map((tab) => (
                      <ToggleGroupItem
                        key={tab.id}
                        value={tab.id}
                        aria-label={tab.label}
                      >
                        {tab.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  {helperText !== null && (
                    <p className="text-muted-foreground text-xs">
                      {helperText}
                    </p>
                  )}
                </div>
              );
            })()}

          <DndContext
            id={dndContextId}
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={questionFields.map((field) => field.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {questionFields.map((field, questionIndex) => {
                  const question = screen.questions[questionIndex];
                  if (!question) return null;

                  return (
                    <CalculatorQuestionCard
                      key={field.id}
                      form={form}
                      base={`definition.screens.${screenIndex}.questions.${questionIndex}`}
                      flatIndex={flatOffset + questionIndex}
                      sortableId={field.id}
                      question={question}
                      conditionSources={conditionSourcesFor(
                        flatOffset + questionIndex,
                      )}
                      screenOptions={screenOptions.filter(
                        (option) => option.index !== screenIndex,
                      )}
                      tabs={tabs}
                      open={openQuestionIds.includes(question.id)}
                      onOpenChange={(next) => onOpenChange(question.id, next)}
                      onRemove={() => onRemoveQuestion(questionIndex)}
                      onMoveToScreen={(target) =>
                        onMoveQuestion(questionIndex, target)
                      }
                      onChangeType={(nextType) =>
                        onChangeQuestionType(questionIndex, nextType)
                      }
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>

          <div className="flex items-center justify-between gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canAddQuestion}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Add question to this screen
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuLabel>Question type</DropdownMenuLabel>
                {QUESTION_TYPE_ORDER.map((type) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => onAddQuestion(type)}
                    className="flex-col items-start gap-0.5"
                  >
                    <span className="font-medium">
                      {QUESTION_TYPE_META[type].label}
                    </span>
                    <span className="text-muted-foreground text-xs whitespace-normal">
                      {QUESTION_TYPE_META[type].hint}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {!canAddQuestion && (
              <p className="text-muted-foreground text-xs">
                {questionCount >= QUOTE_MAX_QUESTIONS_PER_SCREEN
                  ? `A screen holds at most ${QUOTE_MAX_QUESTIONS_PER_SCREEN} questions.`
                  : `This calculator is at the ${QUOTE_MAX_QUESTIONS}-question limit.`}
              </p>
            )}
          </div>

          {/* Array-level errors for this screen's questions ("Add at least one
              question to this screen") attach to the array path itself, not to
              any row, so they need their own message slot. */}
          <FormField
            control={form.control}
            name={`definition.screens.${screenIndex}.questions`}
            render={() => (
              <FormItem>
                <FormMessage />
              </FormItem>
            )}
          />
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`Delete screen ${screenIndex + 1}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {`This removes the ${questionCount} questions on this screen. Any branching or distance variable that points at one of them will need fixing before you can save.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {/* `variant`, not className: AlertDialogAction renders a Button
                asChild, and a className would be concatenated after
                `bg-primary` without tailwind-merge. */}
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                setShowDeleteDialog(false);
                onRemoveScreen();
              }}
            >
              Delete screen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
