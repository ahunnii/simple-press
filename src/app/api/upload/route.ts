import crypto from "crypto";
import path from "path";
import type { Router } from "@better-upload/server";
import { RejectUpload, route } from "@better-upload/server";
import { toRouteHandler } from "@better-upload/server/adapters/next";

import { env } from "~/env";
import { checkBusiness, checkBusinessMembership } from "~/lib/check-business";
import { s3Client } from "~/lib/s3/client";
import { ROUTE_MAX_FILES } from "~/lib/uploads";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

// Raster formats only — used for content uploads (product/collection/blog/OG
// images, galleries, testimonials). SVG is intentionally excluded here: an SVG
// can carry embedded scripts, so we don't accept it for content that is sourced
// from owners (and, for testimonials, untrusted users).
const ALLOWED_RASTER_IMAGE_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
]);

// Logo/favicon may additionally be SVG — a common, legitimate format for these,
// rendered only in controlled brand contexts.
const ALLOWED_IMAGE_EXTS = new Set([...ALLOWED_RASTER_IMAGE_EXTS, ".svg"]);

const ALLOWED_VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".avi"]);

/** Allows SVG — use only for logo/favicon. */
function safeImageExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_IMAGE_EXTS.has(ext)) throw new RejectUpload("Invalid file type");
  return ext;
}

/** Raster-only (no SVG) — use for all content/user image uploads. */
function safeRasterImageExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_RASTER_IMAGE_EXTS.has(ext))
    throw new RejectUpload("Invalid file type");
  return ext;
}

function safeVideoExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_VIDEO_EXTS.has(ext)) throw new RejectUpload("Invalid file type");
  return ext;
}

function uniqueKey(businessId: string, prefix: string, ext: string): string {
  return `${businessId}/${prefix}-${crypto.randomBytes(8).toString("hex")}${ext}`;
}

async function requireBusinessManager(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) throw new RejectUpload("Not logged in!");
  const business = await checkBusiness();
  if (!business) throw new RejectUpload("Business not found!");
  const isPlatformAdmin = session.user.platformRole === "PLATFORM_ADMIN";
  if (!isPlatformAdmin) {
    const membership = await checkBusinessMembership(
      business.id,
      session.user.id,
    );
    if (
      !membership ||
      (membership.role !== "OWNER" && membership.role !== "MANAGER")
    ) {
      throw new RejectUpload(
        "You do not have permission to upload to this business.",
      );
    }
  }
  return { business, session };
}

// NOTE on metadata key casing: the routes below are NOT consistent about
// whether they emit `pathname` (lowercase) or `pathName` (capital N) in
// objectInfo.metadata. This was the latent cause of a favicon bug where a
// reader expected the wrong casing. The current per-route casing is:
//   - "image", "video"                              -> metadata.pathname
//   - "logo", "favicon", "images", "galleryImages",
//     "testimonials"                                 -> metadata.pathName
// Every current client-side reader has been verified against this mapping
// (see src/lib/uploads.ts's getStoredPath(), which reads both keys defensively,
// and the direct `.pathname` reads in product-form.tsx, collection-form.tsx,
// blog-page-editor.tsx, seo-editor.tsx, page-editor.tsx,
// template-field-widgets.tsx, minimal-tiptap-form-field.tsx, and
// media-picker-dialog.tsx, all of which only ever use routes "image"/"video";
// plus the one direct `.pathName` read in branding-editor.tsx, which is paired
// with the "favicon" route). Do NOT change a route's casing without also
// updating every direct (non-getStoredPath) reader of that route in the same
// change — grep for `.pathname` / `.pathName` first.
const router: Router = {
  client: s3Client,
  bucketName: env.NEXT_PUBLIC_STORAGE_BUCKET_NAME,
  routes: {
    image: route({
      fileTypes: ["image/*"],
      multipleFiles: false,
      maxFileSize: 1024 * 1024 * 5, // 5MB
      onBeforeUpload: async ({ req, file }) => {
        const { business } = await requireBusinessManager(req);

        const ext = safeRasterImageExt(file.name);
        const key = uniqueKey(business.id, "image", ext);
        return {
          objectInfo: {
            key,
            metadata: {
              pathname: `https://${env.NEXT_PUBLIC_STORAGE_URL}/business-sites/${key}`,
            },
          },
        };
      },
      onAfterSignedUrl: async ({ metadata }) => {
        // the files now have the objectInfo property

        return {
          metadata: {
            ...metadata,
          },
        };
      },
    }),
    video: route({
      fileTypes: ["video/*"],
      multipleFiles: false,
      maxFileSize: 1024 * 1024 * 20, // 20MB
      onBeforeUpload: async ({ req, file }) => {
        const { business } = await requireBusinessManager(req);

        const ext = safeVideoExt(file.name);
        const key = uniqueKey(business.id, "video", ext);
        return {
          objectInfo: {
            key,
            metadata: {
              pathname: `https://${env.NEXT_PUBLIC_STORAGE_URL}/business-sites/${key}`,
            },
          },
        };
      },
      onAfterSignedUrl: async ({ metadata }) => {
        return {
          metadata: {
            ...metadata,
          },
        };
      },
    }),
    logo: route({
      fileTypes: ["image/*"],
      multipleFiles: false,
      maxFileSize: 1024 * 1024 * 5, // 5MB
      onBeforeUpload: async ({ req, file }) => {
        const { business } = await requireBusinessManager(req);

        const ext = safeImageExt(file.name);
        const key = `${business.id}/logo${ext}`;
        return {
          objectInfo: {
            key,
            metadata: {
              pathName: `https://${env.NEXT_PUBLIC_STORAGE_URL}/business-sites/${key}`,
            },
          },
        };
      },
      onAfterSignedUrl: async ({ metadata }) => {
        // the files now have the objectInfo property
        return {
          metadata: {
            ...metadata,
          },
        };
      },
    }),
    favicon: route({
      fileTypes: ["image/*"],
      multipleFiles: false,
      maxFileSize: 1024 * 1024 * 5, // 5MB
      onBeforeUpload: async ({ req, file }) => {
        const { business } = await requireBusinessManager(req);

        const ext = safeImageExt(file.name);
        const key = `${business.id}/favicon${ext}`;
        return {
          objectInfo: {
            key,
            metadata: {
              pathName: `https://${env.NEXT_PUBLIC_STORAGE_URL}/business-sites/${key}`,
            },
          },
        };
      },
      onAfterSignedUrl: async ({ metadata }) => {
        // the files now have the objectInfo property
        return {
          metadata: {
            ...metadata,
          },
        };
      },
    }),
    images: route({
      fileTypes: ["image/*"],
      multipleFiles: true,
      // Keep in sync with ROUTE_MAX_FILES.images (src/lib/uploads.ts) — the
      // client's useDeferredImageUpload hook derives its batch size from that
      // shared constant, so it must match the value enforced here.
      maxFiles: ROUTE_MAX_FILES.images,
      maxFileSize: 1024 * 1024 * 5, // 5MB

      onBeforeUpload: async ({ req }) => {
        const { business } = await requireBusinessManager(req);

        return {
          generateObjectInfo: ({ file }) => {
            const ext = safeRasterImageExt(file.name);
            const key = uniqueKey(business.id, "image", ext);
            return {
              key,
              metadata: {
                pathName: `https://${env.NEXT_PUBLIC_STORAGE_URL}/business-sites/${key}`,
              },
            };
          },
        };
      },
    }),
    // Gallery images get their own `gallery-` key prefix so that deleting a
    // gallery only ever targets gallery-owned S3 objects — it can never collide
    // with product/collection/site images (which use the `image-` prefix).
    galleryImages: route({
      fileTypes: ["image/*"],
      multipleFiles: true,
      // Keep in sync with ROUTE_MAX_FILES.galleryImages (src/lib/uploads.ts).
      maxFiles: ROUTE_MAX_FILES.galleryImages,
      maxFileSize: 1024 * 1024 * 5, // 5MB

      onBeforeUpload: async ({ req }) => {
        const { business } = await requireBusinessManager(req);

        return {
          generateObjectInfo: ({ file }) => {
            const ext = safeRasterImageExt(file.name);
            const key = uniqueKey(business.id, "gallery", ext);
            return {
              key,
              metadata: {
                pathName: `https://${env.NEXT_PUBLIC_STORAGE_URL}/business-sites/${key}`,
              },
            };
          },
        };
      },
    }),
    // Reachable by non-members (invite code or any logged-in shopper), so the
    // size cap matters here more than anywhere else.
    testimonials: route({
      fileTypes: ["image/*"],
      multipleFiles: true,
      // Keep in sync with ROUTE_MAX_FILES.testimonials (src/lib/uploads.ts).
      maxFiles: ROUTE_MAX_FILES.testimonials,
      maxFileSize: 1024 * 1024 * 5, // 5MB
      onBeforeUpload: async ({ req, clientMetadata }) => {
        const code = (clientMetadata as { code?: string } | undefined)?.code;
        let businessId: string;

        if (code) {
          const invite = await db.testimonialInvite.findUnique({
            where: { code },
            select: { businessId: true, used: true, expiresAt: true },
          });
          if (!invite) {
            throw new RejectUpload("Invalid invite code");
          }
          if (invite.used) {
            throw new RejectUpload("This invite has already been used");
          }
          if (new Date() > invite.expiresAt) {
            throw new RejectUpload("This invite has expired");
          }
          businessId = invite.businessId;
        } else {
          const user = await auth.api.getSession({ headers: req.headers });
          if (!user) {
            throw new RejectUpload("Not logged in!");
          }
          const business = await checkBusiness();
          if (!business) {
            throw new RejectUpload("Business not found!");
          }
          businessId = business.id;
        }

        return {
          generateObjectInfo: ({ file }) => {
            const ext = safeRasterImageExt(file.name);
            const key = `${businessId}/testimonials/${crypto.randomBytes(8).toString("hex")}${ext}`;
            const pathName = `https://${env.NEXT_PUBLIC_STORAGE_URL}/business-sites/${key}`;
            return {
              key,
              metadata: { pathName },
            };
          },
        };
      },
    }),
  },
};
export const { POST } = toRouteHandler(router);
