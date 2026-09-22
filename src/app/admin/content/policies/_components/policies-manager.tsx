/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Info, Save, ShieldAlert } from "lucide-react";
import { useForm } from "react-hook-form";
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
import { Form } from "~/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { MinimalTiptapFormField } from "~/components/inputs/minimal-tiptap-form-field";

const EMPTY_TIPTAP_DOC = { type: "doc", content: [] };

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
};

export function PoliciesManager({ business }: Props) {
  const router = useRouter();
  const [activePolicy, setActivePolicy] = useState<string>("privacy");
  const [templateUsed, setTemplateUsed] = useState(false);
  const [overwriteKey, setOverwriteKey] = useState<PolicyTemplateKey | null>(
    null,
  );

  // Snapshot at Use Template time — not a live binding. See
  // merchant-policy-templates.ts.
  const policyVars = buildPolicyVars(business);

  const existingPolicies = new Map(business.pages.map((p) => [p.slug, p]));

  const privacyForm = useForm({
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      content:
        existingPolicies.get("privacy-policy")?.content ?? EMPTY_TIPTAP_DOC,
    },
  });

  const termsForm = useForm({
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      content:
        existingPolicies.get("terms-of-service")?.content ?? EMPTY_TIPTAP_DOC,
    },
  });

  const refundForm = useForm({
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      content:
        existingPolicies.get("refund-policy")?.content ?? EMPTY_TIPTAP_DOC,
    },
  });

  const shippingForm = useForm({
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      content:
        existingPolicies.get("shipping-policy")?.content ?? EMPTY_TIPTAP_DOC,
    },
  });

  const forms = {
    privacy: privacyForm,
    terms: termsForm,
    refund: refundForm,
    shipping: shippingForm,
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

  const handleSaveAll = async () => {
    toast.promise(
      async () => {
        const skipped: string[] = [];
        let savedCount = 0;

        for (const [key, form] of Object.entries(forms)) {
          const content = form.getValues().content;

          if (
            !content ||
            (content.type === "doc" &&
              (!content.content || content.content.length === 0))
          ) {
            const template = POLICY_TEMPLATES[key as PolicyTemplateKey];
            skipped.push(template.title);
            continue;
          }

          const template = POLICY_TEMPLATES[key as PolicyTemplateKey];
          const existing = existingPolicies.get(template.slug);

          const data = {
            title: template.title,
            slug: template.slug,
            content,
            type: "policy" as const,
            published: true,
            template: "default" as const,
            sortOrder: 0,
          };

          if (existing) {
            await updatePage.mutateAsync({ id: existing.id, data });
            form.reset({ content: data.content });
          } else {
            await createPage.mutateAsync({ data });
            form.reset({ content: data.content });
          }
          savedCount++;
        }
        router.refresh();

        return { savedCount, skipped };
      },
      {
        loading: "Saving policies...",
        success: (data: { savedCount: number; skipped: string[] }) => {
          if (data.savedCount === 0) {
            return "No policies to save (all were empty)";
          }
          const message = `Saved ${data.savedCount} polic${data.savedCount === 1 ? "y" : "ies"}`;
          if (data.skipped.length > 0) {
            return `${message}. Skipped (empty): ${data.skipped.join(", ")}`;
          }
          return message;
        },
        error: "Failed to save policies",
      },
    );
  };

  const isSaving = createPage.isPending || updatePage.isPending;

  const handleReset = () => {
    (Object.keys(POLICY_TEMPLATES) as PolicyTemplateKey[]).forEach((key) => {
      const template = POLICY_TEMPLATES[key];
      const form = forms[key];
      const existing = existingPolicies.get(template.slug);
      form.reset({
        content: existing?.content ?? EMPTY_TIPTAP_DOC,
      });
    });
  };

  const isDirty = (Object.keys(POLICY_TEMPLATES) as PolicyTemplateKey[]).some(
    (key) => forms[key].formState.isDirty,
  );

  // Checkout tells buyers they agree to this store's Terms of Service —
  // hollow if these two pages aren't actually live. Published + non-empty is
  // the same bar the dashboard nudge uses.
  const isPolicyLive = (slug: string) => {
    const page = existingPolicies.get(slug);
    return !!page && page.published && !isContentEmpty(page.content);
  };
  const missingRequiredPolicies =
    !isPolicyLive("terms-of-service") || !isPolicyLive("refund-policy");

  const overwriteTitle = overwriteKey
    ? POLICY_TEMPLATES[overwriteKey].title
    : "";

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

          <Button size="sm" disabled={isSaving} onClick={handleSaveAll}>
            {isSaving ? (
              <>
                <span className="saving-indicator" />
                Saving...
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

          {(Object.keys(POLICY_TEMPLATES) as PolicyTemplateKey[]).map((key) => {
            const template = POLICY_TEMPLATES[key];
            const form = forms[key];

            return (
              <TabsContent key={key} value={key}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{template.title}</CardTitle>
                        <CardDescription>/{template.slug}</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleUseTemplate(key)}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Use Template
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <MinimalTiptapFormField
                        form={form}
                        name="content"
                        label="Policy Content"
                        placeholder="Write your policy or use the template..."
                        output="json"
                        editorContentClassName="min-h-[500px] p-4"
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
    </div>
  );
}
