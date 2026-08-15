import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";
import { verifyPartnerRequest } from "~/lib/partner-auth";
import {
  buildClaimUrl,
  buildStorefrontUrl,
  extFromContentType,
  isImageContentType,
  provisionRequestSchema,
  resolveTemplateId,
} from "~/lib/partner-provision";
import { getClientIp, partnerApiLimiter } from "~/lib/rate-limit";
import { contentAddressedKey, putStoredObject } from "~/lib/s3/put";
import { safeFetch } from "~/lib/safe-fetch";
import { getFreeTemplateIds } from "~/lib/template-ownership";
import { isSubdomainReserved, slugify } from "~/lib/utils";
import { db } from "~/server/db";

/**
 * AF → SP machine-to-machine site provisioning.
 * `POST /api/partner/provision` — spec: docs/integrations/artisanal-futures-provisioning.md
 * ("Shared contract" + item B5). Only the POST handler is exported (Next.js
 * route-handler convention); the pure helpers live in ~/lib/partner-provision.
 */

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

type SuccessResponse = {
  businessId: string;
  subdomain: string;
  storefrontUrl: string;
  claimUrl: string | null;
  claimExpiresAt: string;
  logoIngested: boolean;
  /** Only present (true) when the matched invite was already redeemed. */
  claimed?: true;
};

/**
 * Fire-and-forget Slack platform alert. The repo has no Slack lib yet, so this
 * posts directly to an optional incoming-webhook URL if one is configured via
 * `SLACK_PLATFORM_WEBHOOK_URL`; otherwise it silently no-ops. Never throws.
 */
function alertSlack(subdomain: string): void {
  const webhook = process.env.SLACK_PLATFORM_WEBHOOK_URL;
  if (!webhook) return;
  void fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `New AF-provisioned site: ${subdomain}` }),
  }).catch((err) => {
    Sentry.captureException(err, {
      tags: { service: "artisanal-futures", step: "slack-alert" },
    });
  });
}

/**
 * Best-effort logo ingestion: SSRF-safe fetch → image/type allow-list →
 * re-host to the fixed `{businessId}/logo{ext}` S3 key → persist on SiteContent.
 * Any failure is captured in Sentry and swallowed — provisioning never fails
 * because of the logo.
 */
async function ingestLogo(
  businessId: string,
  logoUrl: string,
): Promise<boolean> {
  try {
    const { bytes, contentType } = await safeFetch(logoUrl, {
      maxBytes: 5 * 1024 * 1024,
      timeoutMs: 10_000,
    });
    if (!isImageContentType(contentType)) {
      throw new Error(`Refusing non-image content-type: ${contentType ?? "?"}`);
    }
    const ext = extFromContentType(contentType);
    if (!ext) {
      throw new Error(`Unsupported image content-type: ${contentType ?? "?"}`);
    }
    const key = contentAddressedKey(businessId, "logo", bytes, ext);
    const publicUrl = await putStoredObject({
      key,
      body: bytes,
      contentType: contentType ?? "application/octet-stream",
    });
    await db.siteContent.update({
      where: { businessId },
      data: { logoUrl: publicUrl },
    });
    return true;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { service: "artisanal-futures", step: "logo-ingestion" },
      extra: { businessId, logoUrl },
    });
    return false;
  }
}

/** Build the success/replay response body from a business + its invite. */
function buildResponse(args: {
  businessId: string;
  subdomain: string;
  inviteCode: string | null;
  claimExpiresAt: Date;
  logoIngested: boolean;
  claimed?: boolean;
}): SuccessResponse {
  const storefrontUrl = buildStorefrontUrl(
    args.subdomain,
    env.NEXT_PUBLIC_PLATFORM_DOMAIN,
  );
  const base: SuccessResponse = {
    businessId: args.businessId,
    subdomain: args.subdomain,
    storefrontUrl,
    claimUrl: args.inviteCode
      ? buildClaimUrl(env.BETTER_AUTH_BASE_URL, args.inviteCode)
      : null,
    claimExpiresAt: args.claimExpiresAt.toISOString(),
    logoIngested: args.logoIngested,
  };
  if (args.claimed) base.claimed = true;
  return base;
}

/**
 * Idempotent replay for an already-provisioned business. Resolves the claim
 * URL from the outstanding invite:
 *   - unused & unexpired → reuse its code
 *   - unused & expired   → mint a fresh 14-day invite, return its URL
 *   - used               → { claimUrl: null, claimed: true }
 */
async function replayResponse(business: {
  id: string;
  subdomain: string;
  ownerEmail: string;
}): Promise<SuccessResponse> {
  const email = business.ownerEmail.toLowerCase();

  const siteContent = await db.siteContent.findUnique({
    where: { businessId: business.id },
    select: { logoUrl: true },
  });
  const logoIngested = Boolean(siteContent?.logoUrl);

  const invite = await db.platformInvite.findFirst({
    where: { businessId: business.id, email },
    orderBy: { createdAt: "desc" },
  });

  const now = Date.now();

  // Used invite → claimed. Keep the rest of the shape identical.
  if (invite?.used) {
    return buildResponse({
      businessId: business.id,
      subdomain: business.subdomain,
      inviteCode: null,
      claimExpiresAt: invite.expiresAt,
      logoIngested,
      claimed: true,
    });
  }

  // Unused & unexpired → reuse.
  if (invite && invite.expiresAt.getTime() > now) {
    return buildResponse({
      businessId: business.id,
      subdomain: business.subdomain,
      inviteCode: invite.code,
      claimExpiresAt: invite.expiresAt,
      logoIngested,
    });
  }

  // Missing or expired-and-unused → mint a fresh invite.
  const expiresAt = new Date(now + INVITE_TTL_MS);
  const fresh = await db.platformInvite.create({
    data: {
      email,
      code: randomBytes(16).toString("hex"),
      role: "OWNER",
      businessId: business.id,
      expiresAt,
      // NOTE: createdBy is a FK to User.id, so the literal "af-partner-api"
      // sentinel from the spec would violate the constraint — left null.
      createdBy: null,
    },
  });
  return buildResponse({
    businessId: business.id,
    subdomain: business.subdomain,
    inviteCode: fresh.code,
    claimExpiresAt: expiresAt,
    logoIngested,
  });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limit. The limiter rejects with a RateLimiterRes (not an Error),
    //    so it can't be caught by the outer catch — handle it up-front (mirrors
    //    the onboarding route).
    try {
      await partnerApiLimiter.consume(getClientIp(req));
    } catch {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    // 2. Read the raw body FIRST (HMAC is over the raw bytes), then verify.
    const rawBody = await req.text();
    const verification = verifyPartnerRequest(req, {
      bearer: env.AF_PARTNER_API_TOKEN,
      hmacSecret: env.AF_SP_WEBHOOK_SECRET,
      rawBody,
    });
    if (!verification.ok) {
      // Log the reason server-side, but never leak it to the caller.
      console.warn("[partner/provision] auth failed:", verification.reason);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3. Parse + validate.
    let json: unknown;
    try {
      json = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid body", details: "Body is not valid JSON" },
        { status: 400 },
      );
    }
    const parsed = provisionRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { afProvisionCode, businessName, email, logoUrl } = parsed.data;
    const ownerEmail = email.toLowerCase();

    const { templateId, fellBack } = resolveTemplateId(
      parsed.data.templateId,
      getFreeTemplateIds(),
    );
    if (fellBack) {
      console.warn(
        `[partner/provision] unknown/paid templateId "${parsed.data.templateId}" — falling back to "modern"`,
      );
    }

    // 4. Idempotency: has this afProvisionCode already provisioned a business?
    const existing = await db.business.findUnique({
      where: { afProvisionCode },
      select: { id: true, subdomain: true, ownerEmail: true, name: true },
    });
    if (existing) {
      if (
        existing.ownerEmail.toLowerCase() !== ownerEmail ||
        existing.name !== businessName
      ) {
        return NextResponse.json(
          { error: "afProvisionCode already used with different payload" },
          { status: 409 },
        );
      }
      const body = await replayResponse(existing);
      return NextResponse.json(body, { status: 200 });
    }

    // 5. Derive a subdomain/slug free of reservations AND collisions. Mirrors
    //    onboarding/route.ts:240–249, extended to check subdomain reservation
    //    and both the subdomain and slug unique columns.
    const base = slugify(businessName) || "store";
    let candidate = base;
    for (let counter = 1; counter <= 100; counter++) {
      const reserved = isSubdomainReserved(candidate);
      const taken = reserved
        ? true
        : await db.business.findFirst({
            where: { OR: [{ subdomain: candidate }, { slug: candidate }] },
            select: { id: true },
          });
      if (!reserved && !taken) break;
      candidate = `${base}-${counter}`;
    }
    const subdomain = candidate;
    const slug = candidate;

    // 6. Create business + site content + invite in one transaction.
    const inviteCode = randomBytes(16).toString("hex"); // 32 hex chars
    const claimExpiresAt = new Date(Date.now() + INVITE_TTL_MS);

    let businessId: string;
    try {
      businessId = await db.$transaction(async (tx) => {
        const business = await tx.business.create({
          data: {
            name: businessName,
            slug,
            subdomain,
            templateId,
            ownerEmail,
            status: "active",
            onboardingComplete: false,
            maintenanceMode: true,
            maintenanceVariant: "coming_soon",
            afProvisionCode,
          },
        });

        await tx.siteContent.create({
          data: {
            businessId: business.id,
            heroTitle: `Welcome to ${businessName}`,
            heroSubtitle: "",
            aboutText: "",
            primaryColor: "#3b82f6",
            secondaryColor: "#ffffff",
            accentColor: "#3b82f6",
          },
        });

        await tx.platformInvite.create({
          data: {
            email: ownerEmail,
            code: inviteCode,
            role: "OWNER",
            businessId: business.id,
            expiresAt: claimExpiresAt,
            // createdBy is a FK to User.id; the "af-partner-api" sentinel from
            // the spec would violate the constraint, so it is left null.
            createdBy: null,
          },
        });

        return business.id;
      });
    } catch (txErr) {
      // Concurrent duplicate on the unique afProvisionCode → re-run the
      // idempotency lookup and return the replay response instead of 500.
      if (
        txErr &&
        typeof txErr === "object" &&
        "code" in txErr &&
        (txErr as { code?: string }).code === "P2002"
      ) {
        const raced = await db.business.findUnique({
          where: { afProvisionCode },
          select: { id: true, subdomain: true, ownerEmail: true, name: true },
        });
        if (raced) {
          const body = await replayResponse(raced);
          return NextResponse.json(body, { status: 200 });
        }
      }
      throw txErr;
    }

    // 7. Best-effort logo ingestion (post-transaction, never fatal).
    const logoIngested = logoUrl
      ? await ingestLogo(businessId, logoUrl)
      : false;

    // 8. Build the response.
    const body = buildResponse({
      businessId,
      subdomain,
      inviteCode,
      claimExpiresAt,
      logoIngested,
    });

    // 9. Slack platform alert — fire-and-forget.
    alertSlack(subdomain);

    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    console.error("[partner/provision] error:", error);
    Sentry.captureException(error, {
      tags: { route: "partner/provision", service: "artisanal-futures" },
    });
    return NextResponse.json({ error: "Provisioning failed" }, { status: 500 });
  }
}
