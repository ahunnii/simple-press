/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { headers } from "next/headers";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { businessHostFilter } from "~/lib/domain-utils";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth.api.getSession({
    headers: opts.headers,
  });

  return {
    db,
    session,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });

/**
 * Business Owner / Admin  procedure
 *
 * If the current business owner or admin needs to make a query or mutation, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const ownerAdminProcedure = t.procedure
  .use(timingMiddleware)
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const headersList = await headers();
    const hostname = headersList.get("host") ?? "";

    const business = await ctx.db.business.findFirst({
      where: businessHostFilter(hostname),
      select: { id: true },
    });

    if (!business) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
    }

    const user = ctx.session.user;

    // PLATFORM_ADMIN bypasses membership check
    if (user.platformRole !== "PLATFORM_ADMIN") {
      const membership = await ctx.db.businessMembership.findUnique({
        where: {
          userId_businessId: { userId: user.id, businessId: business.id },
        },
        select: { role: true },
      });
      if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a business member",
        });
      }
    }

    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
        businessId: business.id,
      },
    });
  });

/**
 * Staff procedure
 *
 * Like ownerAdminProcedure but also allows the STAFF role (fulfillment-only
 * workers). Use this ONLY for read/fulfillment procedures a fulfillment worker
 * needs (order lookup, marking fulfilled/shipped/ready-for-pickup, customer
 * lookup). Anything touching money, prices, refunds, products, or settings
 * must stay on ownerAdminProcedure (or stricter).
 * PLATFORM_ADMIN still bypasses the membership check.
 */
export const staffProcedure = t.procedure
  .use(timingMiddleware)
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const headersList = await headers();
    const hostname = headersList.get("host") ?? "";

    const business = await ctx.db.business.findFirst({
      where: businessHostFilter(hostname),
      select: { id: true },
    });

    if (!business) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
    }

    const user = ctx.session.user;

    // PLATFORM_ADMIN bypasses membership check
    if (user.platformRole !== "PLATFORM_ADMIN") {
      const membership = await ctx.db.businessMembership.findUnique({
        where: {
          userId_businessId: { userId: user.id, businessId: business.id },
        },
        select: { role: true },
      });
      if (
        !membership ||
        !["OWNER", "MANAGER", "STAFF"].includes(membership.role)
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not a business member",
        });
      }
    }

    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
        businessId: business.id,
      },
    });
  });

/**
 * Owner-Only procedure
 *
 * Like ownerAdminProcedure but only allows OWNER role (not MANAGER).
 * Use this for mutations that managers must NOT be able to perform,
 * such as inviting staff, changing roles, or removing members.
 * PLATFORM_ADMIN still bypasses the membership check.
 */
export const ownerOnlyProcedure = t.procedure
  .use(timingMiddleware)
  .use(async ({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const headersList = await headers();
    const hostname = headersList.get("host") ?? "";

    const business = await ctx.db.business.findFirst({
      where: businessHostFilter(hostname),
      select: { id: true },
    });

    if (!business) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
    }

    const user = ctx.session.user;

    if (user.platformRole !== "PLATFORM_ADMIN") {
      const membership = await ctx.db.businessMembership.findUnique({
        where: {
          userId_businessId: { userId: user.id, businessId: business.id },
        },
        select: { role: true },
      });
      if (membership?.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Owner access required",
        });
      }
    }

    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
        businessId: business.id,
      },
    });
  });

/**
 * Platform Admin procedure
 *
 * For platform-wide administration tasks. Only accessible to users with PLATFORM_ADMIN role.
 * This procedure bypasses business-scoping since platform admins work across all businesses.
 *
 * @see https://trpc.io/docs/procedures
 */
export const platformAdminProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    if (ctx.session.user.platformRole !== "PLATFORM_ADMIN") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Platform admin access required",
      });
    }

    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });

export const featureGate = (featureKey: string) =>
  t.middleware(async ({ next }) => {
    // const businessId = (ctx as unknown as { businessId: string }).businessId;
    // 1. Get the flags using your existing helper
    const { isEnabled, disabledByDependency } = await getBusinessFlags();

    // 2. Check if the feature is active
    if (!isEnabled(featureKey) || disabledByDependency.has(featureKey)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `The ${featureKey} feature is not enabled for this business. To enable it, head to the Features page found in the Settings section of the admin dashboard.`,
      });
    }

    return next();
  });

export const getBusinessProcedure = () =>
  t.middleware(async ({ ctx, next }) => {
    const headersList = await headers();
    const hostname = headersList.get("host") ?? "";

    const business = await ctx.db.business.findFirst({
      where: businessHostFilter(hostname),
      select: { id: true },
    });

    if (!business) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Business not found" });
    }

    return next({
      ctx: {
        ...ctx,
        businessId: business.id,
      },
    });
  });
