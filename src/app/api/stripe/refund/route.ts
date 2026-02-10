import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { auth } from "~/lib/auth";
import { prisma } from "~/server/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Get session
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { amount, reason } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Valid refund amount is required" },
        { status: 400 },
      );
    }

    // Get user's business
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { businessId: true },
    });

    if (!user?.businessId) {
      return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    // Get order with business info
    const order = await prisma.order.findFirst({
      where: {
        id,
        businessId: user.businessId,
      },
      include: {
        business: {
          select: { stripeAccountId: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.stripePaymentIntentId) {
      return NextResponse.json(
        { error: "No payment intent found for this order" },
        { status: 400 },
      );
    }

    if (order.status === "refunded") {
      return NextResponse.json(
        { error: "Order is already refunded" },
        { status: 400 },
      );
    }

    if (amount > order.total) {
      return NextResponse.json(
        { error: "Refund amount cannot exceed order total" },
        { status: 400 },
      );
    }

    // Process refund via Stripe
    const refund = await stripe.refunds.create(
      {
        payment_intent: order.stripePaymentIntentId,
        amount,
        reason: reason || undefined,
      },
      {
        stripeAccount: order.business.stripeAccountId!,
      },
    );

    // Update order status
    const isFullRefund = amount === order.total;
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: isFullRefund ? "refunded" : "partial_refund",
      },
    });

    // TODO: Send refund confirmation email to customer

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        status: refund.status,
      },
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error("Refund error:", error);

    // Handle Stripe-specific errors
    if (error.type === "StripeInvalidRequestError") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to process refund" },
      { status: 500 },
    );
  }
}
