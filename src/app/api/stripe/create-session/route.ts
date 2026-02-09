import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "~/server/db";

export async function POST(req: NextRequest) {
  try {
    const { businessId, items, customerInfo } = await req.json();

    if (!businessId || !items || !customerInfo) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get business with Stripe account
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        stripeAccountId: true,
        name: true,
        subdomain: true,
        customDomain: true,
      },
    });

    if (!business || !business.stripeAccountId) {
      return NextResponse.json(
        { error: "Store payment processing not configured" },
        { status: 400 },
      );
    }

    // Initialize Stripe with platform account
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-11-20.acacia",
    });

    // Create line items for Stripe
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.productName,
          description: item.variantName || undefined,
          images: item.imageUrl ? [item.imageUrl] : undefined,
        },
        unit_amount: item.price,
      },
      quantity: item.quantity,
    }));

    // Determine success/cancel URLs
    const isDev = process.env.NODE_ENV === "development";
    const baseUrl = isDev
      ? `http://${business.subdomain}.localhost:3000`
      : business.customDomain
        ? `https://${business.customDomain}`
        : `https://${business.subdomain}.myapplication.com`;

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: lineItems,
        success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/checkout`,
        customer_email: customerInfo.email,
        shipping_address_collection: {
          allowed_countries: ["US", "CA"],
        },
        metadata: {
          businessId,
          customerName: customerInfo.name,
          customerEmail: customerInfo.email,
        },
      },
      {
        stripeAccount: business.stripeAccountId, // Connect to store's Stripe account
      },
    );

    return NextResponse.json({ sessionUrl: session.url });
  } catch (error: any) {
    console.error("Create checkout session error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
