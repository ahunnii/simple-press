// // lib/woocommerce/image-downloader.ts
// import { writeFile } from "fs/promises";
// import { join } from "path";

// export async function downloadAndUploadImage(
//   imageUrl: string,
//   businessId: string,
//   productId: string
// ): Promise<string> {
//   try {
//     // Download image
//     const response = await fetch(imageUrl);
//     const buffer = await response.arrayBuffer();

//     // Generate filename
//     const ext = imageUrl.split(".").pop()?.split("?")[0] || "jpg";
//     const filename = `${businessId}/${productId}/${Date.now()}.${ext}`;

//     // Upload to MinIO/S3 (implement based on your storage)
//     const uploadedUrl = await uploadToStorage(Buffer.from(buffer), filename);

//     return uploadedUrl;
//   } catch (error) {
//     console.error("Failed to download image:", imageUrl, error);
//     return imageUrl; // Fallback to original URL
//   }
// }
