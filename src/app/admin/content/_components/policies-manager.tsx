/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Loader2, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
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
const pageFormSchema = z.object({
  content: z.any(), // TipTap JSON
});

type PageFormValues = z.infer<typeof pageFormSchema>;
// Helper to convert markdown to TipTap JSON
const markdownToTiptap = (markdown: string) => {
  // Simple conversion - you might want to use a proper markdown parser
  const paragraphs = markdown.split("\n\n").filter(Boolean);

  return {
    type: "doc",
    content: paragraphs.map((para) => {
      // Check if heading
      if (para.startsWith("# ")) {
        return {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: para.replace("# ", "") }],
        };
      }
      if (para.startsWith("## ")) {
        return {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: para.replace("## ", "") }],
        };
      }
      if (para.startsWith("### ")) {
        return {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: para.replace("### ", "") }],
        };
      }
      // Check if bullet list
      if (para.startsWith("- ")) {
        const items = para.split("\n").filter((line) => line.startsWith("- "));
        return {
          type: "bulletList",
          content: items.map((item) => ({
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: item.replace("- ", "") }],
              },
            ],
          })),
        };
      }
      // Regular paragraph
      return {
        type: "paragraph",
        content: [{ type: "text", text: para }],
      };
    }),
  };
};

// Policy templates as TipTap JSON
const POLICY_TEMPLATES = {
  privacy: {
    title: "Privacy Policy",
    slug: "privacy-policy",
    getContent: () =>
      markdownToTiptap(`# Privacy Policy

Last updated: ${new Date().toLocaleDateString()}

## Information We Collect

We collect information you provide directly to us, including:

- Name and contact information
- Payment information
- Shipping address
- Order history

## How We Use Your Information

We use the information we collect to:

- Process and fulfill your orders
- Send you order confirmations and updates
- Respond to your questions and requests
- Send marketing communications (with your consent)

## Information Sharing

We do not sell your personal information. We may share your information with:

- Service providers who assist in our operations
- Payment processors
- Shipping carriers

## Your Rights

You have the right to:

- Access your personal information
- Correct inaccurate data
- Request deletion of your data
- Opt-out of marketing communications

## Contact Us

If you have questions about this Privacy Policy, please contact us at [your email].`),
  },
  terms: {
    title: "Terms of Service",
    slug: "terms-of-service",
    getContent: () =>
      markdownToTiptap(`# Terms of Service

Last updated: ${new Date().toLocaleDateString()}

## Agreement to Terms

By accessing our website, you agree to be bound by these Terms of Service.

## Use License

Permission is granted to temporarily download one copy of materials for personal, non-commercial use only.

## Disclaimer

The materials on our website are provided on an 'as is' basis. We make no warranties, expressed or implied.

## Limitations

In no event shall we be liable for any damages arising out of the use or inability to use our materials.

## Account Terms

- You must be 18 years or older to use this service
- You must provide accurate and complete information
- You are responsible for maintaining account security

## Prohibited Uses

You may not use our site:

- For any unlawful purpose
- To harm minors in any way
- To impersonate any person or entity

## Contact Us

Questions about the Terms of Service should be sent to us at [your email].`),
  },
  refund: {
    title: "Refund Policy",
    slug: "refund-policy",
    getContent: () =>
      markdownToTiptap(`# Refund Policy

Last updated: ${new Date().toLocaleDateString()}

## Return Window

You may return most items within 30 days of delivery for a full refund.

## Eligible Items

Items must be:

- Unused and in original condition
- In original packaging
- Accompanied by proof of purchase

## Non-Returnable Items

The following items cannot be returned:

- Gift cards
- Downloadable products
- Custom or personalized items

## Refund Process

1. Contact us to initiate a return
2. Ship the item back to us
3. Refund processed within 5-10 business days after receipt

## Contact Us

For return questions, please email us at [your email].`),
  },
  shipping: {
    title: "Shipping Policy",
    slug: "shipping-policy",
    getContent: () =>
      markdownToTiptap(`# Shipping Policy

Last updated: ${new Date().toLocaleDateString()}

## Processing Time

Orders are processed within 1-3 business days (Monday-Friday, excluding holidays).

## Shipping Rates

Shipping costs are calculated at checkout based on:

- Destination
- Weight and dimensions
- Delivery speed selected

## Delivery Times

- Standard Shipping: 5-7 business days
- Expedited Shipping: 2-3 business days
- Overnight Shipping: 1 business day

## Order Tracking

You will receive a tracking number via email once your order ships.

## Contact Us

Shipping questions? Contact us at [your email].`),
  },
};

type Props = {
  business: {
    id: string;
    name: string;
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
  const formRef = useRef<HTMLFormElement>(null);

  // Get existing policies
  const existingPolicies = new Map(business.pages.map((p) => [p.slug, p]));

  // Create forms for each policy
  const privacyForm = useForm({
    defaultValues: {
      content:
        existingPolicies.get("privacy-policy")?.content ?? EMPTY_TIPTAP_DOC,
    },
  });

  const termsForm = useForm({
    defaultValues: {
      content:
        existingPolicies.get("terms-of-service")?.content ?? EMPTY_TIPTAP_DOC,
    },
  });

  const refundForm = useForm({
    defaultValues: {
      content:
        existingPolicies.get("refund-policy")?.content ?? EMPTY_TIPTAP_DOC,
    },
  });

  const shippingForm = useForm({
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

  const handleUseTemplate = (policyKey: keyof typeof POLICY_TEMPLATES) => {
    const template = POLICY_TEMPLATES[policyKey];
    const form = forms[policyKey];
    form.setValue("content", template.getContent());

    toast.success("Template loaded");
  };

  const handleSaveAll = async () => {
    toast.promise(
      async () => {
        for (const [key, form] of Object.entries(forms)) {
          const content = form.getValues().content;

          // Skip if empty
          if (
            !content ||
            (content.type === "doc" &&
              (!content.content || content.content.length === 0))
          ) {
            continue;
          }

          const template =
            POLICY_TEMPLATES[key as keyof typeof POLICY_TEMPLATES];
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
            await createPage.mutateAsync({ businessId: business.id, data });
            form.reset({ content: data.content });
          }
        }
        router.refresh();
      },
      {
        loading: "Saving policies...",
        success: "All policies saved successfully",
        error: "Failed to save policies",
      },
    );
  };

  // // Check if any policy form has unsaved changes (different from fetched policy pages)
  // const isDirty = Object.entries(forms).some(([key, form]) => {
  //   const template = POLICY_TEMPLATES[key as keyof typeof POLICY_TEMPLATES];
  //   const existing = existingPolicies.get(template.slug);
  //   const formContent = form.getValues().content;

  //   // If no existing, consider dirty if form is not empty
  //   if (!existing) {
  //     return (
  //       !!formContent &&
  //       formContent.type === "doc" &&
  //       formContent.content &&
  //       formContent.content.length > 0
  //     );
  //   }

  //   // Compare form content with existing policy content (TipTap JSON)
  //   // Basic deep comparison using JSON.stringify - adjust for edge cases if needed
  //   return JSON.stringify(formContent) !== JSON.stringify(existing.content);
  // });

  const isSaving = createPage.isPending || updatePage.isPending;

  const handleReset = () => {
    Object.entries(POLICY_TEMPLATES).forEach(([key, template]) => {
      const form = forms[key as keyof typeof forms];
      const existing = existingPolicies.get(template.slug);
      form.reset({
        content: existing?.content ?? EMPTY_TIPTAP_DOC,
      });
    });
  };

  const allForms = Object.entries(POLICY_TEMPLATES).map(([key]) => {
    return forms[key as keyof typeof forms];
  });

  const isDirty = allForms.some((form) => form.formState.isDirty);

  return (
    <div className="min-h-screen bg-gray-50">
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
              className={`admin-status-badge ${
                isDirty ? "isDirty" : "isPublished"
              }`}
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
        <Tabs
          value={activePolicy}
          onValueChange={setActivePolicy}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="terms">Terms</TabsTrigger>
            <TabsTrigger value="refund">Refund</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
          </TabsList>

          {Object.entries(POLICY_TEMPLATES).map(([key, template]) => {
            const form = forms[key as keyof typeof forms];

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
                        onClick={() => handleUseTemplate(key as any)}
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
    </div>
  );
}
