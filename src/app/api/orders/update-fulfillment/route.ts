import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/lib/auth";
import { prisma } from "~/server/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Get session
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { fulfillmentStatus, trackingNumber } = await req.json();

    if (!fulfillmentStatus) {
      return NextResponse.json(
        { error: "Fulfillment status is required" },
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

    // Verify order belongs to this business
    const order = await prisma.order.findFirst({
      where: {
        id,
        businessId: user.businessId,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order fulfillment
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        fulfillmentStatus,
        trackingNumber: trackingNumber || null,
      },
    });

    // TODO: Send shipping confirmation email with tracking number

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error("Update order fulfillment error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update order fulfillment" },
      { status: 500 },
    );
  }
}
