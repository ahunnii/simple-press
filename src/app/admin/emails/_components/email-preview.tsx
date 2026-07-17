"use client";

import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import AbandonedCheckoutEmail from "~/emails/abandoned-checkout";
import BackorderAlertEmail from "~/emails/backorder-alert";
import ContactFormEmail from "~/emails/contact-form";
import LowInventoryAlertEmail from "~/emails/low-inventory-alert";
import NewOrderNotificationEmail from "~/emails/new-order-notification";
import OrderCancelledEmail from "~/emails/order-cancelled";
import OrderConfirmationEmail from "~/emails/order-confirmation";
import OrderFulfilledEmail from "~/emails/order-fulfilled";
import OrderReadyForPickupEmail from "~/emails/order-ready-for-pickup";
import OrderRefundedEmail from "~/emails/order-refunded";
import OrderShippedEmail from "~/emails/order-shipped";
import OutOfStockAlertEmail from "~/emails/out-of-stock-alert";
import ResetPasswordEmail from "~/emails/reset-password";
import { TestimonialInviteEmail } from "~/emails/testimonial-invite";
import VerifyEmail from "~/emails/verify-email";
import WelcomeEmail from "~/emails/welcome";
import { toast } from "sonner";

import type { EmailOverride } from "~/lib/email/customization";
import type { RouterOutputs } from "~/trpc/react";
import { getBusinessUrl } from "~/lib/business-url";
import {
  applySubjectTemplate,
  CUSTOMIZABLE_EMAILS,
} from "~/lib/email/customization";
import { renderEmail } from "~/lib/email/render";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

type Props = {
  business: NonNullable<
    RouterOutputs["business"]["getForEmailPreview"]
  >["business"];
  sampleOrder: NonNullable<
    RouterOutputs["business"]["getForEmailPreview"]
  >["sampleOrder"];
  savedOverrides: Record<string, EmailOverride>;
};

type PreviewDef = {
  key: string;
  label: string;
  /** When set, this preview belongs to a customizable transactional email. */
  overrideId?: string;
  build: (introText?: string) => ReactElement;
};

/** Trim values and drop empty fields/entries so comparisons are stable. */
function cleanOverrides(
  record: Record<string, EmailOverride>,
): Record<string, EmailOverride> {
  const cleaned: Record<string, EmailOverride> = {};
  for (const [id, value] of Object.entries(record)) {
    const entry: EmailOverride = {};
    if (value?.subject?.trim()) entry.subject = value.subject.trim();
    if (value?.introText?.trim()) entry.introText = value.introText.trim();
    if (Object.keys(entry).length > 0) cleaned[id] = entry;
  }
  return cleaned;
}

export function EmailPreview({ business, sampleOrder, savedOverrides }: Props) {
  const [html, setHtml] = useState<string>("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [drafts, setDrafts] =
    useState<Record<string, EmailOverride>>(savedOverrides);
  const [savedState, setSavedState] =
    useState<Record<string, EmailOverride>>(savedOverrides);

  const updateOverrides = api.business.updateEmailOverrides.useMutation({
    onSuccess: (data) => {
      setSavedState(data.overrides);
      setDrafts(data.overrides);
      toast.success("Email customizations saved");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save email customizations");
    },
  });

  const previews = useMemo<PreviewDef[]>(() => {
    // business.getForEmailPreview only selects subdomain/customDomain (no
    // domainStatus), so this resolves to the subdomain URL unless a custom
    // domain is confirmed ACTIVE — always a real, valid URL for the business
    // rather than the previous hardcoded "yourdomain.com" placeholder.
    const businessUrl = getBusinessUrl({
      subdomain: business.subdomain,
      customDomain: business.customDomain,
    });
    const logoUrl = business.siteContent?.logoUrl ?? "";

    return [
      {
        key: "order-confirmation",
        label: "Order Confirmation",
        overrideId: "order-confirmation",
        build: (introText) =>
          OrderConfirmationEmail({
            orderNumber: sampleOrder?.orderNumber ?? 1001,
            customerName: "John Doe",
            introText,
            items: sampleOrder?.items ?? [
              {
                productName: "Sample Product",
                variantName: "Medium / Blue",
                quantity: 2,
                price: 2999,
                total: 5998,
              },
            ],
            subtotal: 5998,
            shipping: 500,
            tax: 540,
            discount: 0,
            total: 7038,
            shippingAddress: {
              name: "John Doe",
              line1: "123 Main St",
              line2: "Apt 4B",
              city: "New York",
              state: "NY",
              postalCode: "10001",
              country: "US",
            },
            businessName: business.name,
            businessLogoUrl: logoUrl,
            businessUrl,
          }),
      },
      {
        key: "order-confirmation-pickup",
        label: "Order Confirmation (pickup)",
        overrideId: "order-confirmation",
        build: (introText) =>
          OrderConfirmationEmail({
            orderNumber: sampleOrder?.orderNumber ?? 1001,
            customerName: "Jane Smith",
            introText,
            items: sampleOrder?.items ?? [
              {
                productName: "Sample Product",
                variantName: "Medium / Blue",
                quantity: 1,
                price: 4500,
                total: 4500,
              },
            ],
            subtotal: 4500,
            shipping: 0,
            tax: 405,
            discount: 0,
            total: 4905,
            deliveryMethod: "pickup",
            pickupLocation: "123 Main St, Detroit, MI 48201",
            pickupInstructions:
              "Please bring your order confirmation email.\nPickup hours: Mon–Fri 10am–6pm, Sat 11am–4pm.",
            businessName: business.name,
            businessLogoUrl: logoUrl,
            businessUrl,
          }),
      },
      {
        key: "order-ready-for-pickup",
        label: "Ready for Pickup",
        overrideId: "order-ready-for-pickup",
        build: (introText) =>
          OrderReadyForPickupEmail({
            orderNumber: sampleOrder?.orderNumber ?? 1001,
            customerName: "Jane Smith",
            introText,
            businessName: business.name,
            businessLogoUrl: logoUrl,
            businessUrl,
            pickupLocation: "123 Main St, Detroit, MI 48201",
            pickupInstructions:
              "Please bring your order confirmation email.\nPickup hours: Mon–Fri 10am–6pm, Sat 11am–4pm.",
          }),
      },
      {
        key: "order-shipped",
        label: "Order Shipped",
        overrideId: "order-shipped",
        build: (introText) =>
          OrderShippedEmail({
            orderNumber: 1001,
            customerName: "John Doe",
            introText,
            trackingNumber: "1Z999AA10123456784",
            trackingUrl:
              "https://www.ups.com/track?tracknum=1Z999AA10123456784",
            carrier: "UPS",
            estimatedDelivery: "Monday, March 15",
            businessName: business.name,
            businessLogoUrl: logoUrl,
          }),
      },
      {
        key: "new-order-owner",
        label: "New Order (owner)",
        build: () =>
          NewOrderNotificationEmail({
            orderNumber: sampleOrder?.orderNumber ?? 1001,
            customerName: "John Doe",
            customerEmail: "john@example.com",
            items: sampleOrder?.items?.map((item) => ({
              productName: item.productName,
              variantName: item.variantName,
              quantity: item.quantity,
              total: Math.round(item.total),
            })) ?? [
              {
                productName: "Sample Product",
                variantName: "Medium / Blue",
                quantity: 2,
                total: 5998,
              },
            ],
            subtotal: sampleOrder?.subtotal ?? 5998,
            shipping: sampleOrder?.shipping ?? 500,
            tax: sampleOrder?.tax ?? 540,
            discount: sampleOrder?.discount ?? 0,
            total: sampleOrder?.total ?? 7038,
            businessName: business.name,
            businessLogoUrl: logoUrl,
            adminOrderUrl: `${businessUrl}/admin/orders/sample`,
          }),
      },
      {
        key: "order-fulfilled",
        label: "Order Fulfilled (no tracking)",
        overrideId: "order-fulfilled",
        build: (introText) =>
          OrderFulfilledEmail({
            orderNumber: sampleOrder?.orderNumber ?? 1001,
            customerName: "John Doe",
            introText,
            businessName: business.name,
            businessLogoUrl: logoUrl,
            businessUrl,
          }),
      },
      {
        key: "order-refunded",
        label: "Order Refunded",
        overrideId: "order-refunded",
        build: (introText) =>
          OrderRefundedEmail({
            orderNumber: sampleOrder?.orderNumber ?? 1001,
            customerName: "John Doe",
            introText,
            refundAmountCents: 7038,
            orderTotalCents: 7038,
            isFullRefund: true,
            reason: "Customer requested refund",
            businessName: business.name,
            businessLogoUrl: logoUrl,
            businessUrl,
          }),
      },
      {
        key: "order-cancelled",
        label: "Order Cancelled",
        overrideId: "order-cancelled",
        build: (introText) =>
          OrderCancelledEmail({
            orderNumber: sampleOrder?.orderNumber ?? 1001,
            customerName: "John Doe",
            introText,
            reason: "Item is no longer available",
            businessName: business.name,
            businessLogoUrl: logoUrl,
            businessUrl,
          }),
      },
      {
        key: "abandoned-checkout",
        label: "Abandoned Checkout",
        overrideId: "abandoned-checkout",
        build: (introText) =>
          AbandonedCheckoutEmail({
            customerName: "John Doe",
            introText,
            businessName: business.name,
            businessLogoUrl: logoUrl,
            businessUrl,
          }),
      },
      {
        key: "welcome",
        label: "Welcome Email",
        build: () =>
          WelcomeEmail({
            name: "John Doe",
            businessName: business.name,
            businessUrl,
            logoUrl,
          }),
      },
      {
        key: "contact-form",
        label: "Contact Form",
        build: () =>
          ContactFormEmail({
            name: "Jane Smith",
            email: "jane@example.com",
            subject: "Question about your products",
            message: "Hi, I was wondering if you have this item in stock...",
            businessName: business.name,
            businessLogoUrl: logoUrl,
          }),
      },
      {
        key: "testimonial-invite",
        label: "Testimonial Invite",
        build: () =>
          TestimonialInviteEmail({
            businessName: business.name,
            inviteUrl: "https://example.com/testimonials/submit?code=sample",
            logoUrl,
          }),
      },
      {
        key: "verify-email",
        label: "Verify Email",
        build: () =>
          VerifyEmail({
            name: "John Doe",
            businessName: business.name,
            verifyUrl: "https://example.com/verify?code=sample",
            logoUrl,
          }),
      },
      {
        key: "reset-password",
        label: "Reset Password",
        build: () =>
          ResetPasswordEmail({
            name: "John Doe",
            businessName: business.name,
            resetUrl: "https://example.com/reset?code=sample",
            logoUrl,
          }),
      },
      {
        key: "low-inventory-alert",
        label: "Low Inventory Alert (owner)",
        build: () =>
          LowInventoryAlertEmail({
            productName: "Sample T-Shirt",
            variantName: "Medium / Blue",
            currentQty: 3,
            threshold: 5,
            adminProductUrl: `${businessUrl}/admin/products/sample`,
            businessName: business.name,
            businessLogoUrl: logoUrl,
          }),
      },
      {
        key: "out-of-stock-alert",
        label: "Out of Stock Alert (owner)",
        build: () =>
          OutOfStockAlertEmail({
            productName: "Sample T-Shirt",
            variantName: "Medium / Blue",
            adminProductUrl: `${businessUrl}/admin/products/sample`,
            businessName: business.name,
            businessLogoUrl: logoUrl,
          }),
      },
      {
        key: "backorder-alert",
        label: "Out of Stock — Backorders On (owner)",
        build: () =>
          BackorderAlertEmail({
            productName: "Sample T-Shirt",
            variantName: "Medium / Blue",
            adminProductUrl: `${businessUrl}/admin/products/sample`,
            businessName: business.name,
            businessLogoUrl: logoUrl,
          }),
      },
    ];
  }, [business, sampleOrder]);

  const selected = previews.find((p) => p.key === selectedKey) ?? null;
  const customizable = selected?.overrideId
    ? CUSTOMIZABLE_EMAILS.find((e) => e.id === selected.overrideId)
    : undefined;
  const draft = selected?.overrideId
    ? (drafts[selected.overrideId] ?? {})
    : {};

  const draftIntro = draft.introText ?? "";
  const draftSubject = draft.subject ?? "";

  // Re-render the preview whenever the selection or its draft copy changes.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void renderEmail(selected.build(draftIntro.trim() || undefined)).then(
        (rendered) => {
          if (!cancelled) setHtml(rendered);
        },
      );
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selected, draftIntro]);

  const isDirty =
    JSON.stringify(cleanOverrides(drafts)) !==
    JSON.stringify(cleanOverrides(savedState));

  const subjectPreview = customizable
    ? applySubjectTemplate(draftSubject.trim() || customizable.defaultSubject, {
        orderNumber: sampleOrder?.orderNumber ?? 1001,
        businessName: business.name,
      })
    : null;

  const setDraftField = (field: "subject" | "introText", value: string) => {
    if (!selected?.overrideId) return;
    const id = selected.overrideId;
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const resetSelectedToDefault = () => {
    if (!selected?.overrideId) return;
    const id = selected.overrideId;
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const saveOverrides = () => {
    updateOverrides.mutate(cleanOverrides(drafts));
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Notification Emails</h1>
          <p>
            Preview your transactional emails and customize the subject line
            and intro text of customer-facing ones
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {previews.map((preview) => (
              <Button
                key={preview.key}
                onClick={() => setSelectedKey(preview.key)}
                variant={selectedKey === preview.key ? "secondary" : "outline"}
                className="w-full justify-start"
              >
                {preview.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {selected && customizable && (
            <Card>
              <CardHeader>
                <CardTitle>Customize “{customizable.label}”</CardTitle>
                <p className="text-muted-foreground text-sm">
                  {customizable.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-override-subject">Subject</Label>
                  <Input
                    id="email-override-subject"
                    value={draftSubject}
                    maxLength={150}
                    placeholder={customizable.defaultSubject}
                    onChange={(e) => setDraftField("subject", e.target.value)}
                  />
                  <p className="text-muted-foreground text-xs">
                    Use {"{orderNumber}"} and {"{businessName}"} as
                    placeholders. Leave blank to use the default subject.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-override-intro">Intro text</Label>
                  <Textarea
                    id="email-override-intro"
                    value={draftIntro}
                    maxLength={1000}
                    rows={3}
                    placeholder="Optional message shown at the top of the email, under the heading"
                    onChange={(e) => setDraftField("introText", e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={saveOverrides}
                    disabled={!isDirty || updateOverrides.isPending}
                  >
                    {updateOverrides.isPending ? "Saving…" : "Save changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetSelectedToDefault}
                    disabled={!draftSubject && !draftIntro}
                  >
                    Reset to default
                  </Button>
                  {isDirty && (
                    <span className="text-muted-foreground text-sm">
                      Unsaved changes
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              {subjectPreview && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Subject:</span>{" "}
                  <span className="font-medium">{subjectPreview}</span>
                </p>
              )}
            </CardHeader>
            <CardContent>
              {selected && html ? (
                <iframe
                  srcDoc={html}
                  className="h-[600px] w-full rounded border"
                  title="Email Preview"
                />
              ) : (
                <div className="text-muted-foreground py-12 text-center">
                  <p>Select a template to preview</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
