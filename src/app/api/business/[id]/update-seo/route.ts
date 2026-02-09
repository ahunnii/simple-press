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

    const { metaTitle, metaDescription, metaKeywords, ogImage } =
      await req.json();

    // Verify user owns this business
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { businessId: true },
    });

    if (user?.businessId !== id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update site content
    const business = await prisma.business.update({
      where: { id },
      data: {
        siteContent: {
          upsert: {
            create: {
              metaTitle,
              metaDescription,
              metaKeywords,
              ogImage,
            },
            update: {
              metaTitle,
              metaDescription,
              metaKeywords,
              ogImage,
            },
          },
        },
      },
      include: {
        siteContent: true,
      },
    });

    return NextResponse.json({ success: true, business });
  } catch (error: any) {
    console.error("Update SEO error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update SEO settings" },
      { status: 500 },
    );
  }
}
