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

import type { CalculatorFormValues, ScreenInput } from "./builder-shared";
import type { ConditionSource } from "./calculator-question-card";
import type { AdminFormMoreMenuItem } from "~/app/admin/_components/admin-form-more-menu";
import type { QuoteQuestionType } from "~/lib/validators/quote-calculator";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { flattenScreens } from "~/lib/quote/screens";
import { cn } from "~/lib/utils";
import {
  QUOTE_MAX_QUESTIONS,
  quoteCalculatorCreateSchema,
} from "~/lib/validators/quote-calculator";
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
import { Form, FormField, FormItem, FormMessage } from "~/components/ui/form";
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
  isLocationQuestionInput,
  isOptionQuestionInput,
  makeEmptyDefinition,
  makeQuestion,
  makeScreen,
  QUESTION_TYPE_META,
  QUESTION_TYPE_ORDER,
} from "./builder-shared";
import { CalculatorDistancesCard } from "./calculator-distances-card";
import { CalculatorFormulaCard } from "./calculator-formula-card";
import { CalculatorScreenCard } from "./calculator-screen-card";
import { CalculatorSettingsCard } from "./calculator-settings-card";
import { CalculatorTestPanel } from "./calculator-test-panel";

const LIST_PATH = "/admin/quotes/calculators";

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
   * than the `useFieldArray` row key. Three reasons: the row key is regenerated
   * per mount and is not knowable at append time, question ids survive a drag
   * reorder, and — the important one for v2 — moving a question between screens
   * rewrites the whole `screens` array, which remounts every card. Keying by
   * question id is what keeps the card the owner just moved open.
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
    fields: screenFields,
    append: appendScreen,
    remove: removeScreen,
    move: moveScreen,
    replace: replaceScreens,
  } = useFieldArray({ control: form.control, name: "definition.screens" });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Watched rather than read from `screenFields`: `useFieldArray` shadows each
  // row's `id` with its own generated key, so `fields[i].id` is NOT the screen
  // id — and the questions nested under a row are not on `fields` at all.
  const watchedScreens = form.watch("definition.screens") ?? [];
  const watchedDistances = form.watch("definition.distances") ?? [];
  const watchedFormula = form.watch("definition.formula") ?? "";
  const showEstimateToCustomer =
    form.watch("definition.showEstimateToCustomer") ?? false;
  const displayAsRange = form.watch("definition.displayAsRange") ?? false;
  const showLiveEstimate = form.watch("definition.showLiveEstimate") ?? false;
  const rangePaddingPercent =
    form.watch("definition.rangePaddingPercent") ?? 10;
  const thankYouMessage = form.watch("definition.thankYouMessage") ?? "";
  const published = form.watch("published") ?? false;

  /**
   * Every question in VISITOR order. The one enumeration order in the builder:
   * numbering, branch sources, the distance endpoint list, the variable list
   * and the test panel all read this, and the validator flattens identically.
   */
  const flatQuestions = flattenScreens(watchedScreens);

  const availableVariables = collectVariableNames(
    flatQuestions,
    watchedDistances,
  );

  // Both `zip` and `address` yield a ZIP the server can place on the map.
  const locationQuestions = flatQuestions.filter(isLocationQuestionInput);

  /** How many questions come before the first one on `screenIndex`. */
  const flatOffsetFor = (screenIndex: number): number => {
    let offset = 0;
    for (let index = 0; index < screenIndex; index += 1) {
      offset += watchedScreens[index]?.questions.length ?? 0;
    }
    return offset;
  };

  /** Screen labels for the per-question "Move to screen…" menu. */
  const screenOptions = watchedScreens.map((screen, index) => ({
    index,
    label: (screen.title ?? "").trim() || `Screen ${index + 1}`,
  }));

  /**
   * Earlier single-answer questions a row may branch on, measured on the FLAT
   * index — so an earlier question on the SAME screen is a legal source (a live
   * reveal within one step). Same rule as the validator; anything this menu
   * offers is something the save accepts.
   */
  const conditionSourcesFor = (flatIndex: number): ConditionSource[] => {
    const sources: ConditionSource[] = [];
    for (const question of flatQuestions.slice(0, flatIndex)) {
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

  // ── Screen / question mutations ───────────────────────────────────────────
  //
  // Anything that changes WHICH screen a question lives on spans two rows of
  // the screens array, so it cannot be expressed as an operation on one nested
  // field array. All of those go through `cloneScreens` → mutate → `commit`,
  // which hands react-hook-form one atomic `replace`. In-screen drag reordering
  // is the exception and stays on the nested `useFieldArray` inside
  // `CalculatorScreenCard`, where `move` migrates per-row error/touched state.

  /**
   * A copy deep enough to mutate safely: every screen row and every question
   * list is fresh, so nothing here writes through to the values RHF is holding.
   */
  const cloneScreens = (): ScreenInput[] =>
    (form.getValues("definition.screens") ?? []).map((screen) => ({
      ...screen,
      questions: [...screen.questions],
    }));

  /**
   * `replace` regenerates every row key, so all screen cards remount. That is
   * the price of atomicity — and it is affordable precisely because
   * `openQuestionIds` is keyed by question id rather than by row key.
   */
  const commitScreens = (next: ScreenInput[]) => {
    replaceScreens(next);
    // Only after a failed submit: before that, `mode: "onTouched"` means an
    // untouched form should not start showing errors just because a question
    // moved.
    if (form.formState.isSubmitted) void form.trigger("definition.screens");
  };

  /** Top-level "Add question" — a new question on a new screen of its own. */
  const addQuestionAsScreen = (type: QuoteQuestionType) => {
    const question = makeQuestion(type);
    appendScreen(makeScreen([question]));
    setOpenQuestionIds((previous) => [...previous, question.id]);
  };

  /** Per-screen "Add question" — grouped onto an existing screen. */
  const addQuestionToScreen = (
    screenIndex: number,
    type: QuoteQuestionType,
  ) => {
    const next = cloneScreens();
    const screen = next[screenIndex];
    if (!screen) return;

    const question = makeQuestion(type);
    screen.questions.push(question);
    commitScreens(next);
    setOpenQuestionIds((previous) => [...previous, question.id]);
  };

  /**
   * Delete one question. When it is the last one on its screen the screen goes
   * with it: an empty screen is a step with nothing on it, the schema rejects
   * one, and there is no UI that can create one — so there is no state where a
   * screen sits there empty waiting to be filled.
   */
  const removeQuestion = (screenIndex: number, questionIndex: number) => {
    const next = cloneScreens();
    const screen = next[screenIndex];
    if (!screen) return;

    if (screen.questions.length <= 1) {
      removeScreen(screenIndex);
      return;
    }

    screen.questions.splice(questionIndex, 1);
    commitScreens(next);
  };

  /**
   * Move a question to another screen, or onto a brand-new screen inserted
   * right after its current one.
   *
   * Note what happens to the source screen: if the move empties it, it is
   * dropped, which keeps the "no empty screens" invariant without a separate
   * cleanup pass.
   */
  const moveQuestionToScreen = (
    fromScreenIndex: number,
    questionIndex: number,
    target: number | "new",
  ) => {
    const next = cloneScreens();
    const source = next[fromScreenIndex];
    if (!source) return;

    const question = source.questions[questionIndex];
    if (!question) return;

    // Already alone on its own screen: "New screen" would rebuild the same
    // screen with a fresh id, silently discarding the heading and intro text
    // the owner may have written for it.
    if (target === "new" && source.questions.length === 1) return;

    source.questions.splice(questionIndex, 1);

    if (target === "new") {
      next.splice(fromScreenIndex + 1, 0, makeScreen([question]));
    } else {
      const destination = next[target];
      if (!destination) return;
      destination.questions.push(question);
    }

    if (source.questions.length === 0) next.splice(fromScreenIndex, 1);

    commitScreens(next);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = screenFields.findIndex((field) => field.id === active.id);
    const newIndex = screenFields.findIndex((field) => field.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // `move` rather than `arrayMove` + `replace`: it reorders RHF's own field
    // registry alongside the values, so per-field errors and touched state
    // travel with the row instead of staying pinned to an index.
    moveScreen(oldIndex, newIndex);
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
                      <CardTitle>Screens</CardTitle>
                      <CardDescription>
                        Each screen is one step. Add a question to make a
                        screen; add more questions to the same screen to group
                        them.
                      </CardDescription>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          disabled={flatQuestions.length >= QUOTE_MAX_QUESTIONS}
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
                            onClick={() => addQuestionAsScreen(type)}
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

                <CardContent className="space-y-3">
                  {screenFields.length === 0 ? (
                    <AdminEmpty
                      icon={ListChecks}
                      title="No questions yet"
                      description="Add the first question visitors will answer. Each one starts on its own screen — group them later if you want several on one step."
                    />
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      modifiers={[restrictToVerticalAxis]}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={screenFields.map((field) => field.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {screenFields.map((field, screenIndex) => {
                            const screen = watchedScreens[screenIndex];
                            if (!screen) return null;

                            return (
                              <CalculatorScreenCard
                                key={field.id}
                                form={form}
                                screenIndex={screenIndex}
                                sortableId={field.id}
                                screen={screen}
                                flatOffset={flatOffsetFor(screenIndex)}
                                screenOptions={screenOptions}
                                totalQuestionCount={flatQuestions.length}
                                conditionSourcesFor={conditionSourcesFor}
                                openQuestionIds={openQuestionIds}
                                onOpenChange={(questionId, next) =>
                                  setOpenQuestionIds((previous) =>
                                    next
                                      ? [...previous, questionId]
                                      : previous.filter(
                                          (id) => id !== questionId,
                                        ),
                                  )
                                }
                                onRemoveScreen={() => removeScreen(screenIndex)}
                                onAddQuestion={(type) =>
                                  addQuestionToScreen(screenIndex, type)
                                }
                                onRemoveQuestion={(questionIndex) =>
                                  removeQuestion(screenIndex, questionIndex)
                                }
                                onMoveQuestion={(questionIndex, target) =>
                                  moveQuestionToScreen(
                                    screenIndex,
                                    questionIndex,
                                    target,
                                  )
                                }
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}

                  {/* Array-level errors ("Add at least one question", "at most
                      30 questions") attach to `screens` itself rather than to
                      any screen, so they need their own message slot. */}
                  <FormField
                    control={form.control}
                    name="definition.screens"
                    render={() => (
                      <FormItem>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Distances need two endpoints, so the panel appears only once
                  two location questions (ZIP or address) exist. Below that
                  there is nothing it could offer that the validator would
                  accept. */}
              {locationQuestions.length >= 2 && (
                <CalculatorDistancesCard
                  form={form}
                  locationQuestions={locationQuestions}
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
                questions={flatQuestions}
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
                showLiveEstimate={showLiveEstimate}
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
