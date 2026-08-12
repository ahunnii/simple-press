/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Save, ShieldAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { isContentEmpty } from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
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
    getContent: (email: string) =>
      markdownToTiptap(`Last updated: ${new Date().toLocaleDateString()}

[Your Business Name] ("we," "our," or "this store") is committed to protecting your privacy. This policy explains what information we collect when you shop with us, how we use it, and the choices you have.

## Information We Collect

When you browse, create an account, or place an order, we may collect:

- Your name and email address
- Billing and shipping address
- Phone number (if provided)
- Payment information (processed securely by our payment provider — see below)
- Order details and purchase history
- Account login credentials (if you create an account)
- Device and browser information, pages visited, and referring URLs

## How We Use Your Information

We use the information we collect to:

- Process and fulfill your orders and send order confirmations
- Communicate with you about your purchases and any questions you send us
- Send marketing emails and promotions (only with your consent — you can opt out at any time)
- Improve our store and understand how customers use it
- Comply with legal obligations

## Payment Processing

All card payments are processed securely by Stripe. We do not see, store, or have access to your full card number, CVV, or other sensitive payment credentials. Please review Stripe's privacy policy for details on how payment data is handled.

## Cookies & Analytics

We use cookies and similar technologies to keep your cart active, remember your preferences, and keep you signed in. We also use privacy-friendly analytics tools to understand traffic and improve the store. You can disable cookies in your browser settings, though some features of the store may not work correctly.

## How We Share Your Information

We do not sell your personal information. We share your data only with service providers that help us operate the store, including:

- Our payment processor (Stripe) to complete transactions
- Shipping carriers to deliver your orders
- The platform that hosts this store, as needed for technical operations

All third parties are required to keep your information confidential and may only use it to perform services on our behalf.

## Data Retention

We retain your order history and account information for as long as your account is active or as needed to fulfill legal, tax, and accounting obligations. You may request deletion of your personal data at any time (subject to legal retention requirements).

## Security

We take reasonable precautions to protect your information, including encrypted connections (HTTPS) and access controls. No method of transmission over the internet is 100% secure, but we work to protect your data as best we can.

## Your Privacy Rights

You may request to access, correct, or delete the personal information we hold about you by contacting us at the address below. You may also opt out of marketing emails via the unsubscribe link in any email we send. Depending on where you live (for example, the EU/UK or California), you may have additional rights — [adjust this section for your region].

## Children's Privacy

Our store is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us and we will delete it promptly.

## Changes to This Policy

We may update this privacy policy from time to time. When we do, we will update the "Last updated" date at the top of this page. Continued use of our store after changes are posted constitutes your acceptance of the revised policy.

## Contact Us

If you have questions about this policy or how we handle your data, contact us at ${email}.`),
  },
  terms: {
    title: "Terms of Service",
    slug: "terms-of-service",
    getContent: (email: string) =>
      markdownToTiptap(`Last updated: ${new Date().toLocaleDateString()}

Please read these Terms of Service carefully before placing an order or using our store. By purchasing from us or using this website, you agree to these terms.

## Agreement to These Terms

By accessing this store or placing an order, you confirm that you are at least 18 years old (or have parental consent), that you have read and understood these terms, and that you agree to be bound by them.

## Orders & Acceptance

Your order is an offer to purchase. We reserve the right to accept, decline, or cancel any order at our discretion — for example, if an item is out of stock, if we identify an error in pricing or product information, or if we are unable to verify payment. We will notify you if your order is declined or cancelled, and any charge will be refunded.

## Pricing & Availability

Prices and product availability are subject to change without notice. If a pricing error occurs, we will contact you before processing your order. We are not obligated to honor an incorrect price.

## Payment

By completing checkout, you authorize us to charge your selected payment method for the total amount shown, including any applicable taxes and shipping fees. All payments are processed securely through our payment provider.

## Shipping & Delivery

We ship to the destinations listed in our Shipping Policy. Once your order is handed off to a carrier, risk of loss and title pass to you. We are not responsible for delays caused by carriers, customs, or circumstances outside our control. See our Shipping Policy for processing times and estimated delivery windows.

## Returns & Refunds

Our returns and refunds process is described in full in our Returns & Refunds Policy. Please review it before purchasing, as some items may be non-returnable.

## Product Descriptions

We make every effort to accurately display products, including colors, dimensions, and materials. However, colors may appear differently depending on your screen, and minor variations in handmade or natural products are normal and not considered defects.

## Intellectual Property

All content on this store — including product photos, copy, logos, and branding — is owned by [Your Business Name] or its licensors. You may not reproduce, distribute, or use any content without our written permission.

## Acceptable Use

You agree not to use this store for any unlawful purpose, to submit false or fraudulent orders, to impersonate any person, or to interfere with the operation of the store or its underlying systems.

## Disclaimer of Warranties

Products and this website are provided "as is" without warranties of any kind, express or implied. We do not warrant that the store will be uninterrupted or error-free, or that any product will meet your specific requirements beyond what is described on the product page.

## Limitation of Liability

To the maximum extent permitted by law, [Your Business Name] shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of this store or any products purchased from us. Our total liability for any claim related to an order shall not exceed the amount you paid for that order.

## Governing Law

These terms are governed by the laws of [your state/country]. Any disputes arising under these terms shall be resolved in the courts of [your jurisdiction].

## Changes to These Terms

We may update these terms from time to time. The updated version will be posted with a revised "Last updated" date. Continued use of our store after changes are posted constitutes acceptance of the revised terms.

## Contact Us

Questions about these terms? Reach us at ${email}.`),
  },
  refund: {
    title: "Returns & Refunds",
    slug: "refund-policy",
    getContent: (email: string) =>
      markdownToTiptap(`Last updated: ${new Date().toLocaleDateString()}

## Our Commitment

Every item from [Your Business Name] is [handmade with care / carefully sourced], and we want you to love what you receive. Please read this policy before purchasing so you know exactly what to expect.

## Return Window

We accept returns within [X] days of delivery. To start a return, contact us at ${email} before sending anything back — we'll walk you through the process.

## Eligible Items

To be eligible for a return, items must be:

- Unused and in their original condition
- Returned in original packaging where applicable
- Accompanied by your order confirmation or proof of purchase

## Non-Returnable Items

The following cannot be returned or refunded:

- Custom, made-to-order, or personalized items
- [Any other categories specific to your shop, e.g. perishables, intimate goods]
- Sale or final-sale items
- Digital downloads
- Gift cards

## Exchanges

We're happy to exchange items for a different [size / color / variation] when available. Contact us within [X] days of delivery to arrange an exchange. Customers are responsible for return shipping on exchanges.

## Damaged or Defective Items

If your order arrives damaged or defective, please contact us within [X] days with a photo of the issue. We will replace or refund the item at no cost to you.

## Refund Process

Once we receive and inspect your return:

- You'll be notified whether your return is approved
- Approved refunds are processed within 5–10 business days
- Refunds are issued to your original payment method

## Return Shipping

[Who pays for return shipping? e.g., "Customers are responsible for return shipping costs unless the item arrived damaged or we made an error."]

## Contact Us

Questions about a return or refund? Reach us at ${email} or through our contact page.`),
  },
  shipping: {
    title: "Shipping Policy",
    slug: "shipping-policy",
    getContent: (email: string) =>
      markdownToTiptap(`Last updated: ${new Date().toLocaleDateString()}

Thank you for your order. This policy explains how we process and ship orders, estimated delivery windows, and what to do if something goes wrong.

## Processing Time

Orders are processed within 1–3 business days (Monday–Friday, excluding holidays). During busy seasons or sales, processing may take a bit longer — we'll keep you informed.

## Shipping Destinations

We currently ship to [List the countries/regions you ship to]. If your location is not listed at checkout, feel free to contact us and we'll do our best to help.

## Shipping Rates

Shipping costs are calculated at checkout based on:

- Destination
- Package weight and dimensions
- Delivery speed selected

## Delivery Times

- Standard Shipping: 5–7 business days
- Expedited Shipping: 2–3 business days
- Overnight Shipping: 1 business day

Delivery times are estimates and begin once your order has been handed to the carrier. We are not responsible for carrier delays.

## Order Tracking

Once your order ships, you will receive a confirmation email with your tracking number. You can use this to follow your package through the carrier's website.

## International Orders — Customs & Duties

[Buyers are responsible for any import duties, taxes, or customs fees charged by their country upon delivery. These charges are outside our control and are not included in your order total or shipping cost.]

## Lost or Delayed Packages

If your tracking shows your package has been delivered but you have not received it, please check with neighbors and your local post office first. If the package is confirmed lost, contact us within [X] days of the expected delivery date and we will work with the carrier to investigate and make it right.

## Contact Us

Shipping questions? We're happy to help — reach us at ${email}.`),
  },
};

type Props = {
  business: {
    id: string;
    name: string;
    supportEmail: string | null;
    ownerEmail: string;
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

  const supportEmail =
    business.supportEmail ?? business.ownerEmail ?? "[your email]";

  // Get existing policies
  const existingPolicies = new Map(business.pages.map((p) => [p.slug, p]));

  // Create forms for each policy
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

  const handleUseTemplate = (policyKey: keyof typeof POLICY_TEMPLATES) => {
    const template = POLICY_TEMPLATES[policyKey];
    const form = forms[policyKey];
    form.setValue("content", template.getContent(supportEmail));

    toast.success("Template loaded");
  };

  const handleSaveAll = async () => {
    toast.promise(
      async () => {
        const skipped: string[] = [];
        let savedCount = 0;

        for (const [key, form] of Object.entries(forms)) {
          const content = form.getValues().content;

          // Skip if empty
          if (
            !content ||
            (content.type === "doc" &&
              (!content.content || content.content.length === 0))
          ) {
            const template =
              POLICY_TEMPLATES[key as keyof typeof POLICY_TEMPLATES];
            skipped.push(template.title);
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
            await createPage.mutateAsync({ data });
            form.reset({ content: data.content });
          }
          savedCount++;
        }
        router.refresh();

        // Return the message details for the toast
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

  // A checkout will soon tell buyers "you agree to this store's Terms of
  // Service" — hollow if these two pages aren't actually live. Published +
  // non-empty is the same bar the dashboard nudge uses.
  const isPolicyLive = (slug: string) => {
    const page = existingPolicies.get(slug);
    return !!page && page.published && !isContentEmpty(page.content);
  };
  const missingRequiredPolicies =
    !isPolicyLive("terms-of-service") || !isPolicyLive("refund-policy");

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
        {missingRequiredPolicies && (
          <Alert className="mb-4">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>No published Terms of Service or Refund Policy</AlertTitle>
            <AlertDescription>
              Checkout tells buyers they&apos;re agreeing to this store&apos;s
              Terms of Service — publish at least the Terms and Refunds tabs
              below so that isn&apos;t hollow.
            </AlertDescription>
          </Alert>
        )}
        <p className="text-muted-foreground mb-4 text-sm">
          These templates are starting points you can edit. Review and customize
          them for your business — they are not legal advice.
        </p>
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
