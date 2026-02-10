import { NextRequest, NextResponse } from "next/server";

import { prisma } from "~/server/db";

export async function POST(req: NextRequest) {
  try {
    const { code, businessId, cartTotal } = await req.json();

    if (!code || !businessId) {
      return NextResponse.json(
        { error: "Code and business ID are required" },
        { status: 400 },
      );
    }

    // Find discount code
    const discount = await prisma.discountCode.findFirst({
      where: {
        businessId,
        code: code.toUpperCase(),
      },
    });

    if (!discount) {
      return NextResponse.json(
        { error: "Invalid discount code", valid: false },
        { status: 200 }, // Return 200 so frontend can handle gracefully
      );
    }

    // Check if active
    if (!discount.active) {
      return NextResponse.json(
        { error: "This discount code is no longer active", valid: false },
        { status: 200 },
      );
    }

    // Check start date
    if (discount.startsAt && new Date(discount.startsAt) > new Date()) {
      return NextResponse.json(
        { error: "This discount code is not yet valid", valid: false },
        { status: 200 },
      );
    }

    // Check expiry
    if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This discount code has expired", valid: false },
        { status: 200 },
      );
    }

    // Check usage limit
    if (discount.usageLimit && discount.usageCount >= discount.usageLimit) {
      return NextResponse.json(
        {
          error: "This discount code has reached its usage limit",
          valid: false,
        },
        { status: 200 },
      );
    }

    // Check minimum purchase
    if (discount.minPurchase && cartTotal < discount.minPurchase) {
      const minAmount = (discount.minPurchase / 100).toFixed(2);
      return NextResponse.json(
        {
          error: `Minimum purchase of $${minAmount} required`,
          valid: false,
        },
        { status: 200 },
      );
    }

    // Calculate discount amount
    let discountAmount = 0;

    if (discount.type === "percentage") {
      discountAmount = Math.round((cartTotal * discount.value) / 100);
    } else if (discount.type === "fixed") {
      discountAmount = discount.value;
    }

    // Apply max discount cap if set
    if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
      discountAmount = discount.maxDiscount;
    }

    // Ensure discount doesn't exceed cart total
    if (discountAmount > cartTotal) {
      discountAmount = cartTotal;
    }

    return NextResponse.json({
      valid: true,
      discount: {
        id: discount.id,
        code: discount.code,
        type: discount.type,
        value: discount.value,
        discountAmount,
      },
    });
  } catch (error: any) {
    console.error("Validate discount error:", error);
    return NextResponse.json(
      { error: "Failed to validate discount code", valid: false },
      { status: 500 },
    );
  }
}
