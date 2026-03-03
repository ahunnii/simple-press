import { TRPCError } from "@trpc/server";

import { verifyHCaptcha } from "~/lib/captcha/verify-hcaptcha";
import { checkBusiness } from "~/lib/check-business";
import { sendContactFormSubmission } from "~/lib/email/templates";
import { contactSchema } from "~/lib/validators/contact";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const contactRouter = createTRPCRouter({
  send: publicProcedure.input(contactSchema).mutation(async ({ input }) => {
    const isValid = await verifyHCaptcha(input.captchaToken);
    if (!isValid) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Captcha verification failed",
      });
    }

    const { name, email, subject, message, phone, preferredContactMethod } =
      input;

    const business = await checkBusiness();
    if (!business) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Business not found",
      });
    }
    const businessData = await db.business.findUnique({
      where: { id: business.id },
      select: { name: true, ownerEmail: true },
    });

    const contactEmail = await sendContactFormSubmission({
      name,
      email,
      subject,
      message,
      phone,
      preferredContactMethod,
      business: {
        name: businessData?.name ?? "",
        ownerEmail: businessData?.ownerEmail ?? "",
      },
    });

    if (!contactEmail.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to send email",
      });
    }

    return { message: "Your message has been sent successfully" };
  }),
});
