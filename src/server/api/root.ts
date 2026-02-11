import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

import { businessRouter } from "./routers/business";
import { collectionsRouter } from "./routers/collections";
import { contentRouter } from "./routers/content";
import { customerRouter } from "./routers/customer";
import { discountRouter } from "./routers/discount";
import { domainRouter } from "./routers/domain";
import { exportRouter } from "./routers/export";
import { inventoryRouter } from "./routers/inventory";
import { orderRouter } from "./routers/order";
import { productRouter } from "./routers/product";
import { siteContentRouter } from "./routers/site-content";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  domain: domainRouter,
  discount: discountRouter,
  export: exportRouter,
  siteContent: siteContentRouter,
  business: businessRouter,
  product: productRouter,
  order: orderRouter,
  customer: customerRouter,
  inventory: inventoryRouter,
  collections: collectionsRouter,
  content: contentRouter,
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
