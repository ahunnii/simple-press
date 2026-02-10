import { postRouter } from "~/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

import { businessRouter } from "./routers/business";
import { clubRouter } from "./routers/club";
import { collectionsRouter } from "./routers/collections";
import { discountRouter } from "./routers/discount";
import { domainRouter } from "./routers/domain";
import { exportRouter } from "./routers/export";
import { inventoryRouter } from "./routers/inventory";
import { memberRouter } from "./routers/member";
import { newsletterRouter } from "./routers/newsletter";
import { orderRouter } from "./routers/order";
import { pageRouter } from "./routers/page";
import { productRouter } from "./routers/product";
import { siteContentRouter } from "./routers/site-content";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  club: clubRouter,
  domain: domainRouter,
  discount: discountRouter,
  export: exportRouter,
  member: memberRouter,
  newsletter: newsletterRouter,
  page: pageRouter,
  siteContent: siteContentRouter,
  business: businessRouter,
  product: productRouter,
  order: orderRouter,
  inventory: inventoryRouter,
  collections: collectionsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
