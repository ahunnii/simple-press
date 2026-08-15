import { TRPCError } from "@trpc/server";

import { captchaFailureToTrpcError } from "~/lib/captcha/trpc-error";
import { verifyRecaptcha } from "~/lib/captcha/verify-recaptcha";
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
      const requestHost = ctx.headers.get("host") ?? "";
      const rawIp = getClientIpFromHeaders(ctx.headers);
      const remoteIp = rawIp === "unknown" ? undefined : rawIp;

      try {
        await contactLimiter.consume(`${rawIp}:${requestHost}`);
      } catch {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many submissions. Please try again later.",
        });
      }

      // No `NODE_ENV === "development"` short-circuit here (the hCaptcha
      // version this replaces had one, and testimonials.submit never did —
      // an inconsistency for no reason). verifyRecaptcha now owns the
      // test-bypass decision itself via an explicit sentinel token
      // (RECAPTCHA_TEST_BYPASS_TOKEN), doubly guarded on NODE_ENV !==
      // "production" AND NEXT_PUBLIC_RECAPTCHA_TEST_BYPASS=1, so every call
      // site behaves the same and dev/staging still exercise the real check
      // by default.
      const result = await verifyRecaptcha(input.captchaToken, {
        action: "contact",
        requestHost,
        remoteIp,
      });

      if (!result.ok) {
        throw captchaFailureToTrpcError(result.reason);
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
