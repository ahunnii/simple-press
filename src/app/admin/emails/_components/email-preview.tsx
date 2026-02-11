/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import ContactFormEmail from "~/emails/contact-form";
import OrderConfirmationEmail from "~/emails/order-confirmation";
import OrderShippedEmail from "~/emails/order-shipped";
import WelcomeEmail from "~/emails/welcome";

import { renderEmail } from "~/lib/email/render";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export function EmailPreview({ business, sampleOrder }: any) {
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
        businessLogoUrl: business.siteContent?.logoUrl,
        businessUrl: `https://${business.subdomain}.yourdomain.com`,
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
        businessLogoUrl: business.siteContent?.logoUrl,
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
        logoUrl: business.siteContent?.logoUrl,
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
      }),
    );
    setHtml(rendered);
    setIsLoading(false);
  };

  return (
    <div className="mx-auto max-w-7xl p-8">
      <h1 className="mb-8 text-3xl font-bold">Email Previews</h1>

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
              onClick={previewOrderShipped}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              Order Shipped
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
              <div className="py-12 text-center text-gray-500">
                <p>Select a template to preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
