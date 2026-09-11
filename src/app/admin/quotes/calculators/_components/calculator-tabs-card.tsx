"use client";

import type { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";

import type {
  CalculatorFormValues,
  QuestionInput,
  ScreenInput,
} from "./builder-shared";
import { cn } from "~/lib/utils";
import { QUOTE_MAX_TABS } from "~/lib/validators/quote-calculator";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";

import { clearAllTabIds, makeTab, stripTabId } from "./builder-shared";

type Props = {
  form: UseFormReturn<CalculatorFormValues>;
  /**
   * Every question, FLATTENED across screens — used only to count how many
   * questions are limited to a single, about-to-be-removed tab so the
   * confirmation dialog can name the impact. Visitor order does not matter
   * here, only membership.
   */
  flatQuestions: QuestionInput[];
  /**
   * Every variable name a tab's formula override may reference — the same set
   * the shared formula card offers, so a chip inserted here is guaranteed to
   * be one the root formula could also use.
   */
  availableVariables: string[];
  /**
   * A fresh, mutable copy of `definition.screens` — the same helper the
   * builder uses for its own cross-screen edits (see its docblock).
   */
  cloneScreens: () => ScreenInput[];
  /** Atomically replaces `definition.screens`. */
  commitScreens: (next: ScreenInput[]) => void;
};

/**
 * The tab switcher: a top-level fork the visitor picks before the flow
 * starts (e.g. Commercial / Residential), independent of the step-by-step
 * screens below it.
 *
 * Two states, not a spectrum: either the calculator has no tabs (the default,
 * and the shape every calculator predating this feature already has), or it
 * has at least TWO — the schema rejects exactly one, since a single tab is a
 * switcher with nothing to switch. "Turn on tabs" and "Turn tabs off" are
 * therefore the only ways in and out; there is no way to land on exactly one
 * tab through this UI. Removing down to one is intercepted and redirected to
 * the turn-off confirmation instead (see `requestRemoveTab`), which is why
 * `definition.tabs`' "Add a second tab, or turn tabs off" resolver error is
 * effectively unreachable through normal editing — the message slot below
 * still exists for a definition that reached that shape some other way (a
 * hand-edited row, a future bug).
 *
 * Removing or disabling tabs strips `tabIds` off every question, so both
 * paths route the screens array through `stripTabId` / `clearAllTabIds`
 * (`builder-shared.ts`) via the same `cloneScreens` → mutate → `commitScreens`
 * pattern the builder itself uses for cross-screen edits — this card gets no
 * second way to touch `definition.screens`.
 */
export function CalculatorTabsCard({
  form,
  flatQuestions,
  availableVariables,
  cloneScreens,
  commitScreens,
}: Props) {
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "definition.tabs",
  });

  // Seeded once, from whatever the calculator already had when the page
  // loaded — a saved formula override should not open behind a collapsed
  // trigger the owner has to know to click. Rows added afterward start with
  // `formula: null` and are absent from this map, which reads as closed
  // (`?? false` below). Keyed by the field array's own row id: `remove` and
  // `append` on THIS array never disturb another row's id, so it stays a
  // valid key across every mutation this card performs.
  const [openFormulaRows, setOpenFormulaRows] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(
      fields.map((field) => [field.id, Boolean(field.formula)]),
    ),
  );

  const [removeCandidateIndex, setRemoveCandidateIndex] = useState<
    number | null
  >(null);
  const [showTurnOffDialog, setShowTurnOffDialog] = useState(false);

  // Watched rather than read from `fields`: `useFieldArray` shadows each
  // row's `id` with its own generated key (same trade the builder's own
  // `watchedScreens` note describes), so the tab's REAL id — the one
  // `tabIds` and `stripTabId` address — has to come from the live value.
  const watchedTabs = form.watch("definition.tabs") ?? [];

  const countOnlyOnTab = (tabId: string): number =>
    flatQuestions.filter((question) => {
      const tabIds = question.tabIds ?? [];
      return tabIds.length === 1 && tabIds[0] === tabId;
    }).length;

  const performRemoveTab = (index: number) => {
    const tab = watchedTabs[index];
    remove(index);
    if (tab) commitScreens(stripTabId(cloneScreens(), tab.id));
  };

  /**
   * Two tabs is the floor a "Remove" click can reach on its own — going lower
   * needs the turn-off confirmation instead, since one tab is not a state the
   * schema allows. Above the floor, every removal confirms: this is a
   * destructive edit to other questions' `tabIds`, not just to the tab row
   * itself, so the dialog always names the impact even when it is zero.
   */
  const requestRemoveTab = (index: number) => {
    if (fields.length <= 2) {
      setShowTurnOffDialog(true);
      return;
    }
    setRemoveCandidateIndex(index);
  };

  const handleTurnOn = () => {
    append([makeTab(), makeTab()]);
  };

  const handleTurnOff = () => {
    replace([]);
    form.setValue("definition.tabsPrompt", "", { shouldDirty: true });
    commitScreens(clearAllTabIds(cloneScreens()));
    setShowTurnOffDialog(false);
  };

  /** Same trade the shared formula card's `appendVariable` makes, applied to one tab's override instead of the root formula. */
  const appendVariable = (index: number, name: string) => {
    const current = form.getValues(`definition.tabs.${index}.formula`) ?? "";
    const needsSpace = current !== "" && !/[\s(+\-*/,]$/.test(current);
    form.setValue(
      `definition.tabs.${index}.formula`,
      `${current}${needsSpace ? " " : ""}${name}`,
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const removeCandidate =
    removeCandidateIndex !== null
      ? watchedTabs[removeCandidateIndex]
      : undefined;
  const removeCandidateCount = removeCandidate
    ? countOnlyOnTab(removeCandidate.id)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tabs</CardTitle>
        <CardDescription>
          Let visitors pick a segment first (e.g. Commercial / Residential).
          Each question can be limited to one or more tabs; a tab may also use
          its own pricing formula.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {fields.length === 0 ? (
          <Button type="button" variant="outline" onClick={handleTurnOn}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Turn on tabs
          </Button>
        ) : (
          <>
            <FormField
              control={form.control}
              name="definition.tabsPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt shown above the tabs</FormLabel>
                  <FormControl>
                    <Input
                      maxLength={120}
                      placeholder="What kind of move?"
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

            <div className="space-y-3">
              {fields.map((field, index) => {
                const isFormulaOpen = openFormulaRows[field.id] ?? false;

                return (
                  <div
                    key={field.id}
                    className="bg-muted/40 space-y-3 rounded-lg border p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="grid flex-1 gap-3 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`definition.tabs.${index}.label`}
                          render={({ field: labelField }) => (
                            <FormItem>
                              <FormLabel>Label</FormLabel>
                              <FormControl>
                                <Input
                                  maxLength={40}
                                  placeholder="e.g. Commercial"
                                  value={labelField.value ?? ""}
                                  onChange={labelField.onChange}
                                  onBlur={labelField.onBlur}
                                  name={labelField.name}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`definition.tabs.${index}.description`}
                          render={({ field: descriptionField }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Input
                                  maxLength={160}
                                  placeholder="Optional"
                                  value={descriptionField.value ?? ""}
                                  onChange={descriptionField.onChange}
                                  onBlur={descriptionField.onBlur}
                                  name={descriptionField.name}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive/80 mt-6 shrink-0"
                        aria-label={`Remove tab ${index + 1}`}
                        onClick={() => requestRemoveTab(index)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>

                    <Collapsible
                      open={isFormulaOpen}
                      onOpenChange={(next) =>
                        setOpenFormulaRows((previous) => ({
                          ...previous,
                          [field.id]: next,
                        }))
                      }
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full justify-between"
                        >
                          Use a different formula for this tab
                          <ChevronDown
                            aria-hidden="true"
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isFormulaOpen && "rotate-180",
                            )}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 pt-2">
                        <FormField
                          control={form.control}
                          name={`definition.tabs.${index}.formula`}
                          render={({ field: formulaField }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  rows={2}
                                  spellCheck={false}
                                  autoCapitalize="off"
                                  autoCorrect="off"
                                  className="font-mono text-sm"
                                  placeholder="Leave blank to use the shared formula below"
                                  value={formulaField.value ?? ""}
                                  onChange={(event) =>
                                    // `""` is written as `null`, never as an
                                    // empty string: the schema's own
                                    // preprocessor does the same normalization
                                    // on save, but a stray `""` sitting in the
                                    // form between now and then would fail
                                    // `min(1)` the moment the resolver runs.
                                    formulaField.onChange(
                                      event.target.value === ""
                                        ? null
                                        : event.target.value,
                                    )
                                  }
                                  onBlur={formulaField.onBlur}
                                  name={formulaField.name}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {availableVariables.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {availableVariables.map((name) => (
                              <Button
                                key={name}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 font-mono text-xs"
                                onClick={() => appendVariable(index, name)}
                              >
                                {name}
                              </Button>
                            ))}
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={fields.length >= QUOTE_MAX_TABS}
                onClick={() => append(makeTab())}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add tab
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive/80"
                onClick={() => setShowTurnOffDialog(true)}
              >
                Turn tabs off
              </Button>
            </div>
          </>
        )}

        {/* Array-level errors ("Add a second tab, or turn tabs off") attach to
            `tabs` itself rather than to any row, so they need their own
            message slot — mirrors how the builder mounts the
            `definition.screens` message. */}
        <FormField
          control={form.control}
          name="definition.tabs"
          render={() => (
            <FormItem>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>

      <AlertDialog
        open={removeCandidateIndex !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveCandidateIndex(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this tab?</AlertDialogTitle>
            <AlertDialogDescription>
              {`${removeCandidateCount} question${removeCandidateCount === 1 ? " is" : "s are"} shown only on this tab. After removing it they will show on every tab.`}
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
                if (removeCandidateIndex !== null) {
                  performRemoveTab(removeCandidateIndex);
                }
                setRemoveCandidateIndex(null);
              }}
            >
              Remove tab
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showTurnOffDialog} onOpenChange={setShowTurnOffDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn tabs off?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the tab switcher entirely. Every question will be
              asked again on every visit, and any per-tab pricing formula is
              discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                handleTurnOff();
              }}
            >
              Turn tabs off
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
