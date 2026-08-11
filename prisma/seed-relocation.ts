/**
 * Handy Relocations store seed — creates/updates the `handyrelocations` subdomain
 * business on the `relocation` template (1:1 recreation of handyrelocations.com).
 *
 * DEV-ONLY BY DESIGN: refuses to run unless DATABASE_URL targets the dev DB
 * (port 7676, per .env.local) — set SEED_ALLOW_ANY_DB=1 to override consciously.
 * (.env points at the shared 5657 server; never seed this store there by accident.)
 *
 * Idempotent + non-destructive:
 *   - Business/SiteContent are upserted; feature flags are MERGED (never clobbered).
 *   - Template-field defaults carry all 1:1 copy — customFields are NOT seeded.
 *   - Testimonials (4) + FAQ items (4) are created only when the business has ZERO
 *     rows of that type, so re-runs never duplicate and owner edits are never touched.
 *   - OWNER membership is upserted for SEED_OWNER_EMAIL (default: oldest user).
 *
 * Run with:  pnpm db:seed:relocation
 */
import type { Prisma } from "generated/prisma";

import { db } from "~/server/db";

const SUBDOMAIN = "handyrelocations";

const TESTIMONIALS: { customerName: string; text: string }[] = [
  {
    customerName: "DeAndre N.",
    text: "These guys were great.. they even offered to stay over the time limit I paid for to ensure everything was loaded off the truck!",
  },
  {
    customerName: "Robert M.",
    text: "These guys were awesome, from their customer service to their moving abilities, very helpful and they went above and beyond to help me.",
  },
  {
    customerName: "Ann B.",
    text: "Arrived on time and worked like crazy to get it all done and on time. Great friendly guys.",
  },
  {
    customerName: "Audrey N",
    text: "These guys helped me out when I got stood up by my original moving crew. Friendly, fast, and took good care packing my truck. Thanks again!",
  },
];

const FAQS: { question: string; answer: string }[] = [
  {
    question: "How long will it take to move my home?",
    answer: "Each move is unique, but the average move will take between 2 and 4 hours",
  },
  {
    question: "How far in advance should I schedule my move?",
    answer: "3-7 days",
  },
  {
    question: "Do I need an estimate?",
    answer:
      "Yes, please fill out the short form on our home page and we'll get back to you with an estimate!",
  },
  {
    question: "What payment methods are accepted?",
    answer: "Credit, Debit, PayPal, and CashApp",
  },
];

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  const target = dbUrl.replace(/:\/\/[^:]+:[^@]+@/, "://***@");
  console.log(`Target DB: ${target}`);
  if (!/:7676\//.test(dbUrl) && process.env.SEED_ALLOW_ANY_DB !== "1") {
    throw new Error(
      "Refusing to seed: DATABASE_URL is not the dev DB (port 7676). " +
        "Run via `pnpm db:seed:relocation` (loads .env.local last) or set SEED_ALLOW_ANY_DB=1 to override.",
    );
  }

  // ── Business + SiteContent ────────────────────────────────────────────────
  const existing = await db.business.findUnique({
    where: { subdomain: SUBDOMAIN },
    select: { id: true, featureFlags: true },
  });

  if (!existing) {
    const created = await db.business.create({
      data: {
        name: "Handy Relocations",
        slug: "handy-relocations",
        subdomain: SUBDOMAIN,
        templateId: "relocation",
        ownerEmail: "Handyrelocations@gmail.com",
        status: "active",
        onboardingComplete: true,
        siteContent: {
          create: {
            heroTitle: "Handy Relocations, When all you need is a helping hand",
            heroSubtitle:
              "Moving to a new place can be stressful, but moving your belongings shouldn't be!",
            primaryColor: "#cc4a24",
          },
        },
      },
    });
    console.log(`✓ Created business: ${created.id}`);
  }

  const business = await db.business.findUniqueOrThrow({
    where: { subdomain: SUBDOMAIN },
    select: { id: true, featureFlags: true },
  });
  const businessId = business.id;

  // Merge flags: testimonials + contactForm are default-on but made explicit;
  // `services` is intentionally ABSENT — the relocation template uses the legacy
  // ServicesPage slot, which only renders while the services flag is off.
  const mergedFlags = {
    ...((business.featureFlags as Record<string, boolean> | null) ?? {}),
    testimonials: true,
    contactForm: true,
  } as Prisma.InputJsonValue;

  await db.business.update({
    where: { id: businessId },
    data: {
      templateId: "relocation",
      featureFlags: mergedFlags,
      localBusinessEnabled: true,
      phoneNumber: "(313) 241-0291",
      businessAddress: "440 Burroughs St Suite 131, Detroit, MI 48202",
      timeZone: "America/Detroit",
    },
  });
  console.log(`✓ Business ${businessId} — template "relocation", flags merged, LocalBusiness on`);

  await db.siteContent.upsert({
    where: { businessId },
    update: {},
    create: { businessId, primaryColor: "#cc4a24" },
  });

  // ── OWNER membership ──────────────────────────────────────────────────────
  const ownerEmail = process.env.SEED_OWNER_EMAIL;
  const user = ownerEmail
    ? await db.user.findFirst({ where: { email: ownerEmail } })
    : await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (user) {
    await db.businessMembership.upsert({
      where: { userId_businessId: { userId: user.id, businessId } },
      create: { userId: user.id, businessId, role: "OWNER" },
      update: { role: "OWNER" },
    });
    console.log(`✓ OWNER membership for ${user.email}`);
  } else {
    console.warn(
      `⚠ No user found${ownerEmail ? ` for SEED_OWNER_EMAIL=${ownerEmail}` : ""} — membership skipped. ` +
        "Re-run after signing up, or set SEED_OWNER_EMAIL.",
    );
  }

  // ── Testimonials (only when none exist for this business) ─────────────────
  const testimonialCount = await db.testimonial.count({ where: { businessId } });
  if (testimonialCount === 0) {
    // Backdated so the newest-first list shows them in the site's original order.
    const base = Date.parse("2025-11-01T12:00:00Z");
    await db.testimonial.createMany({
      data: TESTIMONIALS.map((t, i) => ({
        businessId,
        source: "owner",
        text: t.text,
        customerName: t.customerName,
        isApproved: true,
        isHidden: false,
        testimonialDate: new Date(base - i * 7 * 24 * 60 * 60 * 1000),
      })),
    });
    console.log(`✓ Seeded ${TESTIMONIALS.length} testimonials`);
  } else {
    console.log(`• Testimonials exist (${testimonialCount}) — skipped`);
  }

  // ── FAQ items (only when none exist for this business) ────────────────────
  const faqCount = await db.faqItem.count({ where: { businessId } });
  if (faqCount === 0) {
    await db.faqItem.createMany({
      data: FAQS.map((f, i) => ({
        businessId,
        question: f.question,
        answer: f.answer,
        sortOrder: i,
        published: true,
      })),
    });
    console.log(`✓ Seeded ${FAQS.length} FAQ items`);
  } else {
    console.log(`• FAQ items exist (${faqCount}) — skipped`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
