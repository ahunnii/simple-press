import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getBusinessByDomain, getCurrentDomain } from "~/lib/domain";
import { sendContactFormSubmission } from "~/lib/email/templates";
import { db } from "~/server/db";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  subject: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
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

    const { name, email, subject, message } = validation.data;

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
      business: {
        name: business.name,
        ownerEmail: business.ownerEmail,
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
        error:
          error instanceof Error ? error.message : "Failed to send message",
      },
      { status: 500 },
    );
  }
}
