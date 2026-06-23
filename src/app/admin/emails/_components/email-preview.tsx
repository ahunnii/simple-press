"use client";

import { useState } from "react";
import BackorderAlertEmail from "~/emails/backorder-alert";
import ContactFormEmail from "~/emails/contact-form";
import LowInventoryAlertEmail from "~/emails/low-inventory-alert";
import NewOrderNotificationEmail from "~/emails/new-order-notification";
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

import type { RouterOutputs } from "~/trpc/react";
import { renderEmail } from "~/lib/email/render";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

type Props = {
  business: NonNullable<
    RouterOutputs["business"]["getForEmailPreview"]
  >["business"];
  sampleOrder: NonNullable<
    RouterOutputs["business"]["getForEmailPreview"]
  >["sampleOrder"];
};

export function EmailPreview({ business, sampleOrder }: Props) {
  const [html, setHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const previewOrderConfirmation = async () => {
    setIsLoading(true);
    const rendered = await renderEmail(
      OrderConfirmationEmail({
        orderNumber: sampleOrder?.orderNumber ?? 1001,
        customerName: "John Doe",
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
        businessLogoUrl: business.siteContent?.logoUrl ?? "",
        businessUrl: `https://${business.subdomain}.yourdomain.com`,
      }),
    );
    setHtml(rendered);
    setIsLoading(false);
  };

  const previewOrderConfirmationPickup = async () => {
    setIsLoading(true);
    const rendered = await renderEmail(
      OrderConfirmationEmail({
        orderNumber: sampleOrder?.orderNumber ?? 1001,
        customerName: "Jane Smith",
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
        businessLogoUrl: business.siteContent?.logoUrl ?? "",
        businessUrl: `https://${business.subdomain}.yourdomain.com`,
      }),
    );
    setHtml(rendered);
    setIsLoading(false);
  };

  const previewOrderReadyForPickup = async () => {
    setIsLoading(true);
    const rendered = await renderEmail(
      OrderReadyForPickupEmail({
        orderNumber: sampleOrder?.orderNumber ?? 1001,
        customerName: "Jane Smith",
        businessName: business.name,
        businessLogoUrl: business.siteContent?.logoUrl ?? "",
        businessUrl: `https://${business.subdomain}.yourdomain.com`,
        pickupLocation: "123 Main St, Detroit, MI 48201",
        pickupInstructions:
          "Please bring your order confirmation email.\nPickup hours: Mon–Fri 10am–6pm, Sat 11am–4pm.",
      }),
    );
    setHtml(rendered);
    setIsLoading(false);
  };

  const previewOrderShipped = async () => {
    setIsLoading(true);
    const rendered = await renderEmail(
      OrderShippedEmail({
        orderNumber: 1001,
        customerName: "John Doe",
        trackingNumber: "1Z999AA10123456784",
        trackingUrl: "https://www.ups.com/track?tracknum=1Z999AA10123456784",
        carrier: "UPS",
        estimatedDelivery: "Monday, March 15",
        businessName: business.name,
        businessLogoUrl: business.siteContent?.logoUrl ?? "",
      }),
    );
    setHtml(rendered);
    setIsLoading(false);
  };

  const previewNewOrderOwner = async () => {
    setIsLoading(true);
    const rendered = await renderEmail(
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
        businessLogoUrl: business.siteContent?.logoUrl ?? "",
        adminOrderUrl: `https://${business.subdomain}.yourdomain.com/admin/orders/sample`,
      }),
    );
    setHtml(rendered);
    setIsLoading(false);
  };

  const previewOrderFulfilled = async () => {
    setIsLoading(true);
    const rendered = await renderEmail(
      OrderFulfilledEmail({
        orderNumber: sampleOrder?.orderNumber ?? 1001,
        customerName: "John Doe",
        businessName: business.name,
        businessLogoUrl: business.siteContent?.logoUrl ?? "",
        businessUrl: `https://${business.subdomain}.yourdomain.com`,
      }),
    );
    setHtml(rendered);
    setIsLoading(false);
  };

  const previewOrderRefunded = async () => {
    setIsLoading(true);
    const rendered = await renderEmail(
      OrderRefundedEmail({
        orderNumber: sampleOrder?.orderNumber ?? 1001,
        customerName: "John Doe",
        refundAmountCents: 7038,
        orderTotalCents: 7038,
        isFullRefund: true,
        reason: "Customer requested refund",
        businessName: business.name,
        businessLogoUrl: business.siteContent?.logoUrl ?? "",
        businessUrl: `https://${business.subdomain}.yourdomain.com`,
      }),
    );
    setHtml(rendered);
    setIsLoading(false);
  };

  const previewWelcome = async () => {
    setIsLoading(true);
    const rendered = await renderEmail(
      WelcomeEmail({
        name: "John Doe",
        businessName: business.name,
        businessUrl: `https://${business.subdomain}.yourdomain.com`,
        logoUrl: business.siteContent?.logoUrl ?? "",
      }),
    );
    setHtml(rendered);
    setIsLoading(false);
  };

  const previewContact = async () => {
    setIsLoading(true);
    const rendered = await renderEmail(
      ContactFormEmail({
        name: "Jane Smith",
        email: "jane@example.com",
        subject: "Question about your products",
        message: "Hi, I was wondering if you have this item in stock...",
        businessName: business.name,
        businessLogoUrl: business.siteContent?.logoUrl ?? "",
      }),
    );
    setHtml(rendered);
    setIsLoading(false);
  };

  const previewTestimonialInvite = async () => {
    setIsLoading(true);
    const rendered = await renderEmail(
      TestimonialInviteEmail({
        businessName: business.name,
        inviteUrl: "https://example.com/testimonials/submit?code=sample",
        logoUrl: business.siteContent?.logoUrl ?? "",
      }),
    );
    setHtml(rendered);
    setIsLoading(false);
  };
  const previewVerifyEmail = async () => {
    setIsLoading(true);
    const rendered = await renderEmail(
      VerifyEmail({
        name: "John Doe",
        businessName: business.name,
        verifyUrl: "https://example.com/verify?code=sample",
        logoUrl: business.siteContent?.logoUrl ?? "",
      }),
    );
    setHtml(rendered);
    setIsLoading(false);
  };

  const previewResetPassword = async () => {
    setIsLoading(true);
    const rendered = await renderEmail(
      ResetPasswordEmail({
        name: "John Doe",
        businessName: business.name,
        resetUrl: "https://example.com/reset?code=sample",
        logoUrl: business.siteContent?.logoUrl ?? "",
      }),
    );
  };

  const previewLowInventoryAlert = async () => {
    setIsLoading(true);
    const rendered = await renderEmail(
      LowInventoryAlertEmail({
        productName: "Sample T-Shirt",
        variantName: "Medium / Blue",
        currentQty: 3,
        threshold: 5,
        adminProductUrl: `https://${business.subdomain}.yourdomain.com/admin/products/sample`,
        businessName: business.name,
        businessLogoUrl: business.siteContent?.logoUrl ?? "",
      }),
    );
    setHtml(rendered);
    setIsLoading(false);
  };

  const previewOutOfStockAlert = async () => {
    setIsLoading(true);
    const rendered = await renderEmail(
      OutOfStockAlertEmail({
        productName: "Sample T-Shirt",
        variantName: "Medium / Blue",
        adminProductUrl: `https://${business.subdomain}.yourdomain.com/admin/products/sample`,
        businessName: business.name,
        businessLogoUrl: business.siteContent?.logoUrl ?? "",
      }),
    );
    setHtml(rendered);
    setIsLoading(false);
  };

  const previewBackorderAlert = async () => {
    setIsLoading(true);
    const rendered = await renderEmail(
      BackorderAlertEmail({
        productName: "Sample T-Shirt",
        variantName: "Medium / Blue",
        adminProductUrl: `https://${business.subdomain}.yourdomain.com/admin/products/sample`,
        businessName: business.name,
        businessLogoUrl: business.siteContent?.logoUrl ?? "",
      }),
    );
    setHtml(rendered);
    setIsLoading(false);
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Email Previews</h1>
          <p>See how your emails will look to your customers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              onClick={previewOrderConfirmation}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              Order Confirmation
            </Button>
            <Button
              onClick={previewOrderConfirmationPickup}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              Order Confirmation (pickup)
            </Button>
            <Button
              onClick={previewOrderReadyForPickup}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              Ready for Pickup
            </Button>
            <Button
              onClick={previewOrderShipped}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              Order Shipped
            </Button>
            <Button
              onClick={previewNewOrderOwner}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              New Order (owner)
            </Button>
            <Button
              onClick={previewOrderFulfilled}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              Order Fulfilled (no tracking)
            </Button>
            <Button
              onClick={previewOrderRefunded}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              Order Refunded
            </Button>
            <Button
              onClick={previewWelcome}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              Welcome Email
            </Button>
            <Button
              onClick={previewContact}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              Contact Form
            </Button>
            <Button
              onClick={previewTestimonialInvite}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              Testimonial Invite
            </Button>
            <Button
              onClick={previewVerifyEmail}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              Verify Email
            </Button>
            <Button
              onClick={previewResetPassword}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              Reset Password
            </Button>
            <Button
              onClick={previewLowInventoryAlert}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              Low Inventory Alert (owner)
            </Button>
            <Button
              onClick={previewOutOfStockAlert}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              Out of Stock Alert (owner)
            </Button>
            <Button
              onClick={previewBackorderAlert}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              Out of Stock — Backorders On (owner)
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {html ? (
              <iframe
                srcDoc={html}
                className="h-[600px] w-full rounded border"
                title="Email Preview"
              />
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <p>Select a template to preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
