/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Info,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import type {
  PolicyBusiness,
  PolicyTemplateKey,
} from "~/lib/legal/merchant-policy-templates";
import {
  buildPolicyVars,
  getPolicyTiptap,
  POLICY_TEMPLATES,
} from "~/lib/legal/merchant-policy-templates";
import { isContentEmpty } from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "~/components/ui/form";
import { useUploadingState } from "~/components/ui/minimal-tiptap/hooks/use-uploading-state";
import { isEditorContentEqual } from "~/components/ui/minimal-tiptap/normalize-content";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { MinimalTiptapFormField } from "~/components/inputs/minimal-tiptap-form-field";

const EMPTY_TIPTAP_DOC = { type: "doc", content: [] };

const POLICY_KEYS = Object.keys(POLICY_TEMPLATES) as PolicyTemplateKey[];

type PolicyFormValues = {
  content: any; // TipTap JSON
  published: boolean;
};

// What's in the DB for each tab, as far as this screen knows. Seeded from
// props once, then updated from mutation results — `business.pages` only
// catches up after router.refresh() lands, and reading ids from it right
// after a create would send a second createPage (slug CONFLICT).
type SavedPolicy = PolicyFormValues & { id: string | null };

const NOT_CREATED: SavedPolicy = {
  id: null,
  content: EMPTY_TIPTAP_DOC,
  published: true,
};

const toFormValues = (saved: SavedPolicy): PolicyFormValues => ({
  content: saved.content ?? EMPTY_TIPTAP_DOC,
  published: saved.published,
});

const joinTitles = (titles: string[]) =>
  titles.length <= 1
    ? (titles[0] ?? "")
    : `${titles.slice(0, -1).join(", ")} and ${titles[titles.length - 1]}`;

type Props = {
  // Scalars were already coming over the wire (business.getWithPolicies is a
  // plain findFirst with no `select`). Widened here so Use Template can read
  // shipping, hours, flags, and donation handles. No server change needed.
  business: PolicyBusiness & {
    id: string;
    pages: Array<{
      id: string;
      title: string;
      slug: string;
      content: any; // TipTap JSON
      published: boolean;
    }>;
  };
  /** Mirrors the `media` feature flag — adds "Choose from library" to images. */
  mediaEnabled?: boolean;
};

export function PoliciesManager({ business, mediaEnabled = false }: Props) {
  const router = useRouter();
  const [activePolicy, setActivePolicy] = useState<string>("privacy");
  const [templateUsed, setTemplateUsed] = useState(false);
  // True while a policy image is still uploading — saving then would drop it
  // (its temporary `blob:` src is stripped server-side).
  const { isUploading, onUploadingChange } = useUploadingState();
  const [overwriteKey, setOverwriteKey] = useState<PolicyTemplateKey | null>(
    null,
  );

  // Snapshot at Use Template time — not a live binding. See
  // merchant-policy-templates.ts.
  const policyVars = buildPolicyVars(business);

  const [savedPolicies, setSavedPolicies] = useState<
    Record<PolicyTemplateKey, SavedPolicy>
  >(() => {
    const bySlug = new Map(business.pages.map((p) => [p.slug, p]));
    const entries = POLICY_KEYS.map((key) => {
      const page = bySlug.get(POLICY_TEMPLATES[key].slug);
      return [
        key,
        page
          ? {
              id: page.id,
              content: page.content ?? EMPTY_TIPTAP_DOC,
              published: page.published,
            }
          : NOT_CREATED,
      ] as const;
    });
    return Object.fromEntries(entries) as Record<
      PolicyTemplateKey,
      SavedPolicy
    >;
  });
  // Policies whose editor was cleared on Save — awaiting the remove confirm.
  const [pendingClear, setPendingClear] = useState<PolicyTemplateKey[] | null>(
    null,
  );
  const [removeKey, setRemoveKey] = useState<PolicyTemplateKey | null>(null);

  const privacyForm = useForm<PolicyFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: toFormValues(savedPolicies.privacy),
  });

  const termsForm = useForm<PolicyFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: toFormValues(savedPolicies.terms),
  });

  const refundForm = useForm<PolicyFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: toFormValues(savedPolicies.refund),
  });

  const shippingForm = useForm<PolicyFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: toFormValues(savedPolicies.shipping),
  });

  const forms = {
    privacy: privacyForm,
    terms: termsForm,
    refund: refundForm,
    shipping: shippingForm,
  };

  // Live values so the dirty check below re-renders as the owner types.
  const watched: Record<PolicyTemplateKey, [any, boolean]> = {
    privacy: useWatch({
      control: privacyForm.control,
      name: ["content", "published"],
    }),
    terms: useWatch({
      control: termsForm.control,
      name: ["content", "published"],
    }),
    refund: useWatch({
      control: refundForm.control,
      name: ["content", "published"],
    }),
    shipping: useWatch({
      control: shippingForm.control,
      name: ["content", "published"],
    }),
  };

  const createPage = api.content.createPage.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  const updatePage = api.content.updatePage.useMutation({
    onSuccess: () => {
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update page");
    },
  });

  const deletePage = api.content.deletePage.useMutation();

  // The policy row is gone — the tab goes back to a blank, not-yet-created
  // policy (unsaved edits in it are dropped).
  const markRemoved = (key: PolicyTemplateKey) => {
    setSavedPolicies((prev) => ({ ...prev, [key]: NOT_CREATED }));
    forms[key].reset(toFormValues(NOT_CREATED));
  };

  const applyTemplate = (policyKey: PolicyTemplateKey) => {
    const form = forms[policyKey];
    form.setValue("content", getPolicyTiptap(policyKey, policyVars), {
      shouldDirty: true,
    });
    setTemplateUsed(true);
    toast.success("Template loaded");
  };

  const handleUseTemplate = (policyKey: PolicyTemplateKey) => {
    const content = forms[policyKey].getValues().content;
    if (!isContentEmpty(content)) {
      setOverwriteKey(policyKey);
      return;
    }
    applyTemplate(policyKey);
  };

  // `clearKeys` are existing policies whose editor was emptied and that the
  // owner confirmed removing. Every other non-empty tab is saved as before;
  // empty tabs with nothing in the DB are skipped.
  const runSave = (clearKeys: PolicyTemplateKey[]) => {
    toast.promise(
      async () => {
        const skipped: string[] = [];
        let savedCount = 0;
        let removedCount = 0;

        for (const key of POLICY_KEYS) {
          const template = POLICY_TEMPLATES[key];
          const form = forms[key];
          const { content, published } = form.getValues();
          const existing = savedPolicies[key];

          if (isContentEmpty(content)) {
            if (existing.id && clearKeys.includes(key)) {
              await deletePage.mutateAsync({ id: existing.id });
              markRemoved(key);
              removedCount++;
            } else if (!existing.id) {
              skipped.push(template.title);
            }
            continue;
          }

          const data = {
            title: template.title,
            slug: template.slug,
            content,
            type: "policy" as const,
            published,
            template: "default" as const,
            sortOrder: 0,
          };

          let id = existing.id;
          if (id) {
            await updatePage.mutateAsync({ id, data });
          } else {
            const page = await createPage.mutateAsync({ data });
            id = page.id;
          }
          // The saved content becomes the dirty-check baseline.
          setSavedPolicies((prev) => ({
            ...prev,
            [key]: { id, content, published },
          }));
          form.reset({ content, published });
          savedCount++;
        }
        router.refresh();

        return { savedCount, removedCount, skipped };
      },
      {
        loading: "Saving policies...",
        success: (data: {
          savedCount: number;
          removedCount: number;
          skipped: string[];
        }) => {
          if (data.savedCount === 0 && data.removedCount === 0) {
            return "No policies to save (all were empty)";
          }
          const parts: string[] = [];
          if (data.savedCount > 0) {
            parts.push(
              `Saved ${data.savedCount} polic${data.savedCount === 1 ? "y" : "ies"}`,
            );
          }
          if (data.removedCount > 0) {
            parts.push(`Removed ${data.removedCount} from your site`);
          }
          if (data.skipped.length > 0) {
            parts.push(`Skipped (empty): ${data.skipped.join(", ")}`);
          }
          return parts.join(". ");
        },
        error: "Failed to save policies",
      },
    );
  };

  const handleSaveAll = () => {
    if (isUploading) {
      toast.info("Wait for the upload to finish, then save.");
      return;
    }
    // Clearing a saved policy used to be skipped like any empty tab, so the
    // old text stayed live. Now it means "remove it" — confirm first.
    const toClear = POLICY_KEYS.filter(
      (key) =>
        savedPolicies[key].id !== null &&
        isContentEmpty(forms[key].getValues().content),
    );
    if (toClear.length > 0) {
      setPendingClear(toClear);
      return;
    }
    runSave([]);
  };

  const handleRemove = (key: PolicyTemplateKey) => {
    const { id } = savedPolicies[key];
    if (!id) return;
    const { title } = POLICY_TEMPLATES[key];
    toast.promise(
      async () => {
        await deletePage.mutateAsync({ id });
        markRemoved(key);
        router.refresh();
      },
      {
        loading: `Removing ${title}...`,
        success: `${title} removed from your site`,
        error: `Failed to remove ${title}`,
      },
    );
  };

  const isSaving =
    createPage.isPending || updatePage.isPending || deletePage.isPending;

  const handleReset = () => {
    POLICY_KEYS.forEach((key) => {
      forms[key].reset(toFormValues(savedPolicies[key]));
    });
  };

  // Not RHF's `isDirty`: the editor's value-sync `setContent` emits its
  // schema-normalized JSON back into the form on load (and after Reset), so
  // `isDirty` flips true with nothing edited. Compare normalized documents
  // against the saved baseline instead.
  const isPolicyDirty = (key: PolicyTemplateKey) => {
    const [content, published] = watched[key];
    const saved = savedPolicies[key];
    return (
      published !== saved.published ||
      !isEditorContentEqual(content, saved.content)
    );
  };
  const isDirty = POLICY_KEYS.some(isPolicyDirty);

  // Checkout tells buyers they agree to this store's Terms of Service —
  // hollow if these two pages aren't actually live. Published + non-empty is
  // the same bar the dashboard nudge uses.
  const isPolicyLive = (key: PolicyTemplateKey) => {
    const saved = savedPolicies[key];
    return !!saved.id && saved.published && !isContentEmpty(saved.content);
  };
  const missingRequiredPolicies =
    !isPolicyLive("terms") || !isPolicyLive("refund");

  const overwriteTitle = overwriteKey
    ? POLICY_TEMPLATES[overwriteKey].title
    : "";
  const removeTitle = removeKey ? POLICY_TEMPLATES[removeKey].title : "";
  const pendingClearTitles = (pendingClear ?? []).map(
    (key) => POLICY_TEMPLATES[key].title,
  );

  return (
    <div className="bg-muted/40 min-h-screen">
      <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
        <div className="toolbar-info">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/admin/content">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <h1 className="text-base font-medium">Update Policies</h1>

            <span
              className={cn(
                "admin-status-badge",
                isDirty ? "isDirty" : "isPublished",
              )}
            >
              {isDirty ? "Unsaved Changes" : "Saved"}
            </span>
          </div>
        </div>

        <div className="toolbar-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSaving || !isDirty}
            onClick={handleReset}
            className="hidden md:inline-flex"
          >
            Reset
          </Button>

          <Button
            size="sm"
            disabled={isSaving || isUploading}
            onClick={handleSaveAll}
          >
            {isSaving ? (
              <>
                <span className="saving-indicator" />
                Saving...
              </>
            ) : isUploading ? (
              <>
                <span className="saving-indicator" />
                Uploading…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Save content</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="admin-container">
        {missingRequiredPolicies && (
          <Alert className="mb-4">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>
              No published Terms of Service or Refund Policy
            </AlertTitle>
            <AlertDescription>
              Checkout tells buyers they&apos;re agreeing to this store&apos;s
              Terms of Service — publish at least the Terms and Refunds tabs
              below so that isn&apos;t hollow.
            </AlertDescription>
          </Alert>
        )}
        <p className="text-muted-foreground mb-4 text-sm">
          These templates are starting points you can edit. They fill in what we
          already know from your store settings. Review and customize them for
          your business — they are not legal advice.
        </p>
        {templateUsed && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Review before publishing</AlertTitle>
            <AlertDescription>
              Anything shown like{" "}
              <code className="bg-muted rounded px-1 py-0.5 text-sm">this</code>{" "}
              still needs your input before you publish.
            </AlertDescription>
          </Alert>
        )}
        <Tabs
          value={activePolicy}
          onValueChange={setActivePolicy}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="terms">Terms</TabsTrigger>
            <TabsTrigger value="refund">Refunds</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
          </TabsList>

          {POLICY_KEYS.map((key) => {
            const template = POLICY_TEMPLATES[key];
            const form = forms[key];
            const saved = savedPolicies[key];
            const status = !saved.id
              ? {
                  dot: "bg-muted-foreground/40",
                  text: "Not created yet — nothing shows on your site until you save it.",
                }
              : saved.published
                ? { dot: "bg-emerald-500", text: "Live on your site." }
                : {
                    dot: "bg-amber-500",
                    text: "Hidden from your site — its page, footer link and checkout link are turned off.",
                  };

            return (
              <TabsContent key={key} value={key}>
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle>{template.title}</CardTitle>
                        <CardDescription>/{template.slug}</CardDescription>
                        <p className="text-muted-foreground mt-2 flex items-start gap-2 text-sm">
                          <span
                            aria-hidden
                            className={cn(
                              "mt-1.5 size-2 shrink-0 rounded-full",
                              status.dot,
                            )}
                          />
                          {status.text}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleUseTemplate(key)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Use Template
                        </Button>
                        {saved.id && (
                          <Button
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            disabled={isSaving}
                            onClick={() => setRemoveKey(key)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove policy
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <FormField
                        control={form.control}
                        name="published"
                        render={({ field }) => (
                          <FormItem className="mb-6 flex flex-row items-center justify-between gap-4 rounded-lg border p-4">
                            <div className="space-y-1">
                              <FormLabel>Show on your site</FormLabel>
                              <FormDescription>
                                Turn off to hide this policy without losing the
                                text. While hidden, its page and the links to it
                                in your footer and at checkout disappear.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <MinimalTiptapFormField
                        form={form}
                        name="content"
                        label="Policy Content"
                        placeholder="Write your policy or use the template..."
                        output="json"
                        editorContentClassName="min-h-[500px] p-4"
                        mediaEnabled={mediaEnabled}
                        onUploadingChange={onUploadingChange}
                      />
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      <AlertDialog
        open={overwriteKey !== null}
        onOpenChange={(open) => {
          if (!open) setOverwriteKey(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace {overwriteTitle}?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces the current draft with a starter generated from your
              store settings. Unsaved edits in this tab will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (overwriteKey) applyTemplate(overwriteKey);
                setOverwriteKey(null);
              }}
            >
              Use Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={removeKey !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveKey(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTitle}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the policy and takes it off your site, along with its
              footer and checkout links. Unsaved edits in this tab are lost. To
              keep the text but hide it, turn off &ldquo;Show on your
              site&rdquo; instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {/* `variant`, NOT className — see DeleteProductAlertDialog. */}
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (removeKey) handleRemove(removeKey);
                setRemoveKey(null);
              }}
            >
              Remove policy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingClear !== null}
        onOpenChange={(open) => {
          if (!open) setPendingClear(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {pendingClearTitles.length === 1 ? "a" : ""} cleared{" "}
              {pendingClearTitles.length === 1 ? "policy" : "policies"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Clearing {joinTitles(pendingClearTitles)} removes{" "}
              {pendingClearTitles.length === 1 ? "it" : "them"} from your site,
              along with the footer and checkout links. Your other policies are
              saved as usual. To keep the text but hide a policy, turn off
              &ldquo;Show on your site&rdquo; instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const keys = pendingClear ?? [];
                setPendingClear(null);
                runSave(keys);
              }}
            >
              Remove and save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
