"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ListChecks, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import type { CalculatorFormValues, QuestionInput } from "./builder-shared";
import type { ConditionSource } from "./calculator-question-card";
import type { AdminFormMoreMenuItem } from "~/app/admin/_components/admin-form-more-menu";
import type { QuoteQuestionType } from "~/lib/validators/quote-calculator";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { cn } from "~/lib/utils";
import { quoteCalculatorCreateSchema } from "~/lib/validators/quote-calculator";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
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
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Form, FormField } from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { InputFormField } from "~/components/inputs/input-form-field";
import { SaveFormButton } from "~/components/shared/save-form-button";
import { AdminFormMoreMenu } from "~/app/admin/_components/admin-form-more-menu";

import { AdminEmpty } from "../../../_components/admin-empty";
import {
  dismissLoadingToast,
  loadingToast,
} from "../../../_lib/admin-mutation-toast";
import {
  collectVariableNames,
  isConditionSourceType,
  isOptionQuestionInput,
  makeEmptyDefinition,
  makeQuestion,
  QUESTION_TYPE_META,
  QUESTION_TYPE_ORDER,
} from "./builder-shared";
import { CalculatorDistancesCard } from "./calculator-distances-card";
import { CalculatorFormulaCard } from "./calculator-formula-card";
import { CalculatorQuestionCard } from "./calculator-question-card";
import { CalculatorSettingsCard } from "./calculator-settings-card";
import { CalculatorTestPanel } from "./calculator-test-panel";

const LIST_PATH = "/admin/quotes/calculators";

const MAX_QUESTIONS = 30;

type Props = {
  /** Present in edit mode, absent when creating. */
  calculator?: {
    id: string;
    name: string;
    published: boolean;
    definition: CalculatorFormValues["definition"];
  };
};

export function CalculatorBuilder({ calculator }: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  /**
   * Which question cards are expanded, keyed by the question's OWN id rather
   * than the `useFieldArray` row key. Two reasons: the row key is regenerated
   * per mount and is not knowable at append time, and question ids survive a
   * drag reorder, so a card the owner opened stays open when they move it.
   */
  const [openQuestionIds, setOpenQuestionIds] = useState<string[]>([]);

  const form = useForm<CalculatorFormValues>({
    // The definition schema's `superRefine` is what makes this resolver worth
    // the round trip: it reports unknown formula variables, duplicate variable
    // names, forward show-if references and bad distance endpoints against
    // exact field paths, so every one of those lands on the row that caused it.
    resolver: zodResolver(quoteCalculatorCreateSchema),
    mode: "onTouched",
    defaultValues: {
      name: calculator?.name ?? "",
      published: calculator?.published ?? false,
      definition: calculator?.definition ?? makeEmptyDefinition(),
    },
  });

  const {
    fields: questionFields,
    append: appendQuestion,
    remove: removeQuestion,
    move: moveQuestion,
  } = useFieldArray({ control: form.control, name: "definition.questions" });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Watched rather than read from `questionFields`: `useFieldArray` shadows each
  // row's `id` with its own generated key, so `fields[i].id` is NOT the question
  // id that show-if conditions and distance endpoints point at.
  const watchedQuestions = form.watch("definition.questions") ?? [];
  const watchedDistances = form.watch("definition.distances") ?? [];
  const watchedFormula = form.watch("definition.formula") ?? "";
  const showEstimateToCustomer =
    form.watch("definition.showEstimateToCustomer") ?? false;
  const displayAsRange = form.watch("definition.displayAsRange") ?? false;
  const rangePaddingPercent =
    form.watch("definition.rangePaddingPercent") ?? 10;
  const thankYouMessage = form.watch("definition.thankYouMessage") ?? "";
  const published = form.watch("published") ?? false;

  const availableVariables = collectVariableNames(
    watchedQuestions,
    watchedDistances,
  );

  const zipQuestions = watchedQuestions.filter(
    (question) => question.type === "zip",
  );

  /** Earlier single-answer questions a row at `index` may branch on. */
  const conditionSourcesFor = (index: number): ConditionSource[] => {
    const sources: ConditionSource[] = [];
    for (let position = 0; position < index; position += 1) {
      const question = watchedQuestions[position];
      if (!question) continue;
      if (!isConditionSourceType(question.type)) continue;
      if (!isOptionQuestionInput(question)) continue;
      sources.push({
        id: question.id,
        title: question.title,
        options: question.options.map((option) => ({
          id: option.id,
          label: option.label,
        })),
      });
    }
    return sources;
  };

  const addQuestion = (type: QuoteQuestionType) => {
    const question: QuestionInput = makeQuestion(type);
    appendQuestion(question);
    setOpenQuestionIds((previous) => [...previous, question.id]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questionFields.findIndex(
      (field) => field.id === active.id,
    );
    const newIndex = questionFields.findIndex((field) => field.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // `move` rather than `arrayMove` + `replace`: it reorders RHF's own field
    // registry alongside the values, so per-field errors and touched state
    // travel with the row instead of staying pinned to an index.
    moveQuestion(oldIndex, newIndex);
  };

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = api.quoteCalculator.create.useMutation({
    onMutate: loadingToast("Creating calculator…"),
    onSuccess: (data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Calculator created");
      void utils.quoteCalculator.invalidate();
      // Reset before navigating so the dirty guard does not intercept the push
      // we just triggered ourselves.
      form.reset(form.getValues());
      router.push(`${LIST_PATH}/${data.id}`);
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      applyTrpcErrorToForm(form, error, {
        fallbackMessage: "Failed to create calculator",
      });
    },
  });

  const updateMutation = api.quoteCalculator.update.useMutation({
    onMutate: loadingToast("Saving calculator…"),
    onSuccess: (data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Calculator saved");
      void utils.quoteCalculator.invalidate();
      form.reset({
        name: data.name,
        published: data.published,
        // The router echoes the stored JSON column back untyped. The values
        // just made the round trip through `quoteCalculatorDefinitionSchema`
        // on the way in, so re-seeding from what we submitted is both simpler
        // and safer than re-parsing the response.
        definition: form.getValues("definition"),
      });
      router.refresh();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      applyTrpcErrorToForm(form, error, {
        fallbackMessage: "Failed to save calculator",
      });
    },
  });

  const deleteMutation = api.quoteCalculator.delete.useMutation({
    onMutate: loadingToast("Deleting calculator…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Calculator deleted");
      setShowDeleteDialog(false);
      void utils.quoteCalculator.invalidate();
      form.reset(form.getValues());
      router.push(LIST_PATH);
      router.refresh();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to delete calculator");
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const isDirty = form.formState.isDirty;

  useDirtyForm(isDirty);

  const onSubmit = (values: CalculatorFormValues) => {
    // `values` has already been through the definition schema, so every default
    // is filled in and every cross-field rule has passed.
    const parsed = quoteCalculatorCreateSchema.parse(values);

    if (calculator) {
      updateMutation.mutate({ id: calculator.id, ...parsed });
    } else {
      createMutation.mutate(parsed);
    }
  };

  const moreMenuItems: AdminFormMoreMenuItem[] = [
    {
      label: "Reset",
      icon: RotateCcw,
      disabled: isSubmitting || !isDirty,
      onSelect: () => form.reset(),
    },
    ...(calculator
      ? [
          {
            label: "Delete",
            icon: Trash2,
            destructive: true,
            disabled: isSubmitting || isDeleting,
            onSelect: () => setShowDeleteDialog(true),
          } satisfies AdminFormMoreMenuItem,
        ]
      : []),
  ];

  return (
    <Form {...form}>
      <form
        onSubmit={(event) =>
          void form.handleSubmit(onSubmit, () => {
            toast.error("Please fix the highlighted fields and try again.");
          })(event)
        }
        className="bg-muted/40 min-h-screen"
      >
        <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
          <div className="toolbar-info">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href={LIST_PATH}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back
              </Link>
            </Button>
            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
            <div className="hidden min-w-0 flex-1 basis-0 items-center gap-2 sm:flex">
              <h1 className="truncate text-base font-medium">
                {calculator
                  ? form.watch("name") || "Edit calculator"
                  : "New calculator"}
              </h1>
              {/* `isDraft` (grey) whenever the label is not "Published" —
                  Events pins `isPublished` on unconditionally, which paints an
                  unpublished record's badge green. */}
              <span
                className={cn(
                  "admin-status-badge shrink-0",
                  isDirty
                    ? "isDirty"
                    : calculator && published
                      ? "isPublished"
                      : "isDraft",
                )}
              >
                {isDirty
                  ? "Unsaved Changes"
                  : !calculator
                    ? "Draft"
                    : published
                      ? "Published"
                      : "Unpublished"}
              </span>
            </div>
          </div>

          <div className="toolbar-actions">
            <FormField
              control={form.control}
              name="published"
              render={({ field }) => (
                <div className="flex shrink-0 items-center gap-2">
                  <Label htmlFor="calculator-published" className="text-sm">
                    Published
                  </Label>
                  <Switch
                    id="calculator-published"
                    aria-label="Published"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />

            <AdminFormMoreMenu items={moreMenuItems} />

            <SaveFormButton disabled={isSubmitting} isSaving={isSubmitting} />
          </div>
        </div>

        <div className="admin-container space-y-6">
          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
            {/* Left: what the visitor answers, and what it costs. */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Calculator</CardTitle>
                  <CardDescription>
                    Only you see this name — it labels the calculator in the
                    admin and on every lead it produces.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InputFormField
                    form={form}
                    name="name"
                    label="Name"
                    required
                    placeholder="e.g. Moving quote"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle>Questions</CardTitle>
                      <CardDescription>
                        Asked in this order. Drag to reorder — a question can
                        only branch on an answer above it.
                      </CardDescription>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          disabled={questionFields.length >= MAX_QUESTIONS}
                        >
                          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                          Add question
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-72">
                        <DropdownMenuLabel>Question type</DropdownMenuLabel>
                        {QUESTION_TYPE_ORDER.map((type) => (
                          <DropdownMenuItem
                            key={type}
                            onClick={() => addQuestion(type)}
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
                  </div>
                </CardHeader>

                <CardContent>
                  {questionFields.length === 0 ? (
                    <AdminEmpty
                      icon={ListChecks}
                      title="No questions yet"
                      description="Add the first question visitors will answer."
                    />
                  ) : (
                    <DndContext
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
                          {questionFields.map((field, index) => {
                            const question = watchedQuestions[index];
                            if (!question) return null;

                            return (
                              <CalculatorQuestionCard
                                key={field.id}
                                form={form}
                                index={index}
                                sortableId={field.id}
                                question={question}
                                conditionSources={conditionSourcesFor(index)}
                                open={openQuestionIds.includes(question.id)}
                                onOpenChange={(next) =>
                                  setOpenQuestionIds((previous) =>
                                    next
                                      ? [...previous, question.id]
                                      : previous.filter(
                                          (id) => id !== question.id,
                                        ),
                                  )
                                }
                                onRemove={() => removeQuestion(index)}
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </CardContent>
              </Card>

              {/* Distances need two endpoints, so the panel appears only once
                  two ZIP questions exist. Below that there is nothing it could
                  offer that the validator would accept. */}
              {zipQuestions.length >= 2 && (
                <CalculatorDistancesCard
                  form={form}
                  zipQuestions={zipQuestions}
                />
              )}

              <CalculatorFormulaCard
                form={form}
                formula={watchedFormula}
                availableVariables={availableVariables}
              />
            </div>

            {/* Right: what happens after, and proof the price is right. */}
            <div className="space-y-6 xl:sticky xl:top-24">
              <CalculatorTestPanel
                questions={watchedQuestions}
                distances={watchedDistances}
                formula={watchedFormula}
                showEstimateToCustomer={showEstimateToCustomer}
                displayAsRange={displayAsRange}
                rangePaddingPercent={rangePaddingPercent}
                thankYouMessage={thankYouMessage}
              />

              <CalculatorSettingsCard
                form={form}
                showEstimateToCustomer={showEstimateToCustomer}
                displayAsRange={displayAsRange}
              />
            </div>
          </div>
        </div>
      </form>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`Delete “${calculator?.name ?? "this calculator"}”?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the calculator. Leads it already produced
              stay in your quote inbox — each one keeps its own copy of the
              questions, answers and estimate. Any page embedding this
              calculator will stop showing it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            {/* `variant`, not className: AlertDialogAction renders a Button
                asChild, and a className would be concatenated after
                `bg-primary` without tailwind-merge. */}
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                if (calculator) deleteMutation.mutate({ id: calculator.id });
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
