import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { isSubdomainReserved, slugify } from "~/lib/utils";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

export async function POST(req: NextRequest) {
  try {
    const formData = (await req.json()) as {
      email: string;
      password: string;
      name: string;
      businessName: string;
      subdomain: string;
      customDomain: string;
      templateId: string;
      heroTitle: string;
      heroSubtitle: string;
      aboutText: string;
      primaryColor: string;
    };

    const {
      email,
      password,
      name,
      businessName,
      subdomain,
      customDomain,
      templateId,
      heroTitle,
      heroSubtitle,
      aboutText,
      primaryColor,
    } = formData;

    // Validation
    if (!email || !password || !name || !businessName || !subdomain) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check subdomain availability
    if (isSubdomainReserved(subdomain)) {
      return NextResponse.json(
        { error: "This subdomain is reserved" },
        { status: 400 },
      );
    }

    const existingBusiness = await db.business.findUnique({
      where: { subdomain },
    });

    if (existingBusiness) {
      return NextResponse.json(
        { error: "This subdomain is already taken" },
        { status: 400 },
      );
    }

    // Check if email already exists
    const existingUser = await db.user.findFirst({
      where: { email, businessId: null },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "An account with this email does not exist" },
        { status: 400 },
      );
    }

    //First, create the user.

    // const authUser = await auth.api.signUpEmail({
    //   body: {
    //     email,
    //     password,
    //     name,
    //   },
    // });

    // if (!authUser.user) {
    //   return NextResponse.json(
    //     { error: "Failed to create user" },
    //     { status: 400 },
    //   );
    // }

    // Then, create business, and site content in a transaction
    const business = await db.$transaction(async (tx) => {
      // 1. Create business
      const newBusiness = await tx.business.create({
        data: {
          name: businessName,
          slug: slugify(businessName),
          subdomain,
          customDomain: customDomain || null,
          domainStatus: customDomain ? "PENDING_DNS" : "NONE",
          templateId: templateId || "modern",
          ownerEmail: email,
          status: "active",
          onboardingComplete: false,
        },
      });

      // 2. Create site content
      await tx.siteContent.create({
        data: {
          businessId: newBusiness.id,
          heroTitle: heroTitle || `Welcome to ${businessName}`,
          heroSubtitle: heroSubtitle || "",
          aboutText: aboutText || "",
          primaryColor: primaryColor || "#3b82f6",
          secondaryColor: "#ffffff",
          accentColor: "#3b82f6",
        },
      });

      // 3. Create owner user (WITHOUT password - Better Auth will handle it)
      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          role: "OWNER",
          businessId: newBusiness.id,
          emailVerified: false,
        },
      });

      // 4. If custom domain, add to domain queue
      if (customDomain) {
        await tx.domainQueue.create({
          data: {
            domain: customDomain,
            businessId: newBusiness.id,
            status: "pending",
          },
        });
      }

      return newBusiness;
    });

    // Create a one-time signup token for secure cross-domain session creation
    const { randomBytes } = await import("crypto");
    const token = randomBytes(32).toString("hex");

    await db.signupToken.create({
      data: {
        token,
        userId: existingUser.id,
        businessId: business.id,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        used: false,
      },
    });

    // Redirect to signup completion page with token
    const isDev = process.env.NODE_ENV === "development";
    const subdomainUrl = isDev
      ? `http://${subdomain}.localhost:3000`
      : `https://${subdomain}.myapplication.com`;

    const redirectUrl = `${subdomainUrl}/auth/signup-complete?token=${token}`;

    return NextResponse.json({
      success: true,
      redirectUrl,
      businessId: business.id,
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to create your store. Please try again." },
      { status: 500 },
    );
  }
}
