export async function POST(req: Request) {
  const formData = await req.json();

  try {
    // 1. Create business
    const subdomain = slugify(formData.businessName);

    const business = await prisma.business.create({
      data: {
        name: formData.businessName,
        slug: subdomain,
        subdomain: subdomain,
        customDomain: formData.customDomain || null,
        domainStatus: formData.customDomain ? "pending_dns" : "none",
        templateId: formData.templateId,
        ownerEmail: formData.ownerEmail,
        status: "active",
        onboardingComplete: false, // Will complete after Stripe setup

        // Create site content
        siteContent: {
          create: {
            heroTitle: formData.heroTitle,
            heroSubtitle: formData.heroSubtitle,
            heroImageUrl: formData.heroImageUrl,
            logoUrl: formData.logoUrl,
            aboutText: formData.aboutText,
          },
        },
      },
    });

    // 2. Create owner user account
    const hashedPassword = await hash(formData.password);

    const user = await prisma.user.create({
      data: {
        email: formData.ownerEmail,
        password: hashedPassword,
        name: formData.ownerName,
        role: "OWNER",
        businessId: business.id,
      },
    });

    // 3. Create Umami analytics website
    const umamiWebsiteId = await createUmamiWebsite(business);
    await prisma.business.update({
      where: { id: business.id },
      data: { umamiWebsiteId, umamiEnabled: true },
    });

    // 4. If custom domain provided, queue for addition
    if (formData.customDomain) {
      await prisma.domainQueue.create({
        data: {
          domain: formData.customDomain,
          businessId: business.id,
          status: "pending",
        },
      });

      // Send yourself notification to add domain to Coolify
      await sendAdminNotification({
        subject: "New Domain to Add",
        message: `Add ${formData.customDomain} to Coolify for ${business.name}`,
      });
    }

    // 5. Auto-login the user
    const session = await auth.api.signInEmail({
      body: {
        email: formData.ownerEmail,
        password: formData.password,
      },
    });

    // 6. Return success with redirect URL
    return Response.json({
      success: true,
      redirectUrl: `https://${business.subdomain}.myapplication.com/admin/welcome`,
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return Response.json(
      { error: "Failed to create account" },
      { status: 500 },
    );
  }
}

// Helper function
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
