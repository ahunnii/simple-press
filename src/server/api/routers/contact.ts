import { TRPCError } from "@trpc/server";

import { verifyHCaptcha } from "~/lib/captcha/verify-hcaptcha";
import { checkBusiness } from "~/lib/check-business";
import { sendContactFormSubmission } from "~/lib/email/templates";
import { contactLimiter, getClientIpFromHeaders } from "~/lib/rate-limit";
import { contactSchema } from "~/lib/validators/contact";
import {
  createTRPCRouter,
  featureGate,
  publicProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";

export const contactRouter = createTRPCRouter({
  send: publicProcedure
    .use(featureGate("contactForm"))
    .input(contactSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await contactLimiter.consume(
          `${getClientIpFromHeaders(ctx.headers)}:${ctx.headers.get("host") ?? ""}`,
        );
      } catch {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many submissions. Please try again later.",
        });
      }

      const isValid =
        process.env.NODE_ENV === "development"
          ? true
          : await verifyHCaptcha(input.captchaToken);

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
        select: {
          name: true,
          ownerEmail: true,
          supportEmail: true,
          siteContent: {
            select: { logoUrl: true },
          },
        },
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
          ownerEmail:
            businessData?.supportEmail ?? businessData?.ownerEmail ?? "",
          siteContent: businessData?.siteContent,
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
