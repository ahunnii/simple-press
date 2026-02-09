import { postRouter } from "~/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { clubRouter } from "./routers/club";
import { announcementRouter } from "./routers/domain";
import { eventRouter } from "./routers/event";
import { exportRouter } from "./routers/export";
import { memberRouter } from "./routers/member";
import { newsletterRouter } from "./routers/newsletter";
import { pageRouter } from "./routers/page";
import { siteContentRouter } from "./routers/site-content";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  club: clubRouter,
  announcement: announcementRouter,
  event: eventRouter,
  export: exportRouter,
  member: memberRouter,
  newsletter: newsletterRouter,
  page: pageRouter,
  siteContent: siteContentRouter,
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
