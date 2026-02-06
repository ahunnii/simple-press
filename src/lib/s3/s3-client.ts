import { minio } from "@better-upload/server/clients";
import { env } from "~/env";

export const s3Client = minio({
  region: "us-east-1",
  endpoint: `https://${env.NEXT_PUBLIC_STORAGE_URL}`,
  accessKeyId: env.MINIO_ACCESS_KEY,
  secretAccessKey: env.MINIO_SECRET_KEY,
});
