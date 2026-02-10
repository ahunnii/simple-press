import { NextRequest, NextResponse } from "next/server";

import { auth } from "~/lib/auth";
import { prisma } from "~/server/db";

export async function POST(req: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const {
      businessId,
      customerName,
      customerEmail,
      shippingName,
      shippingAddress,
      items,
      subtotal,
      shipping,
      tax,
      total,
      notes,
    } = await req.json();

    // Validation
    if (!customerName || !customerEmail || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Customer info and items are required" },
        { status: 400 },
      );
    }

    // Verify user has access to this business
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { businessId: true },
    });

    if (user?.businessId !== businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        businessId,
        customerEmail,
        customerName,

        // Amounts
        subtotal,
        tax: tax || 0,
        shipping: shipping || 0,
        total,

        currency: "usd",
        status: "pending", // Manual orders start as pending
        paymentStatus: "unpaid",

        // Shipping
        shippingAddress: shippingAddress
          ? JSON.stringify(shippingAddress)
          : null,
        shippingName: shippingName || customerName,

        // Items
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // TODO: Send order confirmation email (if configured)
    // TODO: Update inventory if tracking is enabled

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Create manual order error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 },
    );
  }
}
