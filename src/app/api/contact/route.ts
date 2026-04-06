import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyHCaptcha } from "~/lib/captcha/verify-hcaptcha";
import { getBusinessByDomain, getCurrentDomain } from "~/lib/domain";
import { sendContactFormSubmission } from "~/lib/email/templates";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  subject: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
  phone: z.string().optional(),
  preferredContactMethod: z
    .enum(["email", "phone", "no-preference"])
    .optional(),
  captchaToken: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    // Parse and validate input
    const body = (await req.json()) as z.infer<typeof contactSchema>;
    const validation = contactSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 },
      );
    }

    const {
      name,
      email,
      subject,
      message,
      phone,
      preferredContactMethod,
      captchaToken,
    } = validation.data;

    const isValid = await verifyHCaptcha(captchaToken);
    if (!isValid) {
      return NextResponse.json(
        { error: "Captcha verification failed" },
        { status: 400 },
      );
    }

    // Get business from domain
    const domain = getCurrentDomain(req.headers);
    const business = await getBusinessByDomain(domain);

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 },
      );
    }

    // Send email to business owner
    const result = await sendContactFormSubmission({
      name,
      email,
      subject,
      message,
      phone,
      preferredContactMethod,
      business: {
        name: business.name,
        ownerEmail: business.ownerEmail,
        siteContent: business.siteContent,
      },
    });

    if (!result.success) {
      throw new Error("Failed to send email");
    }

    return NextResponse.json({
      success: true,
      message: "Your message has been sent successfully",
    });
  } catch (error: unknown) {
    console.error("[Contact] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to send message. Please try again.",
      },
      { status: 500 },
    );
  }
}
