// // lib/woocommerce/batch-importer.ts
// export async function importProductsBatch(
//     products: ParsedProduct[],
//     options: ImportOptions,
//     batchSize: number = 50
//   ) {
//     const batches = [];

//     for (let i = 0; i < products.length; i += batchSize) {
//       batches.push(products.slice(i, i + batchSize));
//     }

//     let totalImported = 0;

//     for (const batch of batches) {
//       const result = await importProducts(batch, options);
//       totalImported += result.imported;

//       // Optional: Update progress in database
//       await db.productImport.update({
//         where: { id: options.importId },
//         data: {
//           importedCount: totalImported,
//           status: "processing",
//         },
//       });
//     }

//     return { imported: totalImported };
//   }
