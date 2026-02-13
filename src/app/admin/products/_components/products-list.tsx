// "use client";

// import { useState } from "react";
// // ... other imports
// import { api } from "~/trpc/react";

// export function ProductsList({ initialProducts, businessId }) {
//   const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

//   const exportMutation = api.export.exportProducts.useMutation({
//     onSuccess: (data) => {
//       const blob = new Blob([data.csv], { type: "text/csv" });
//       const link = document.createElement("a");
//       const url = URL.createObjectURL(blob);

//       link.setAttribute("href", url);
//       link.setAttribute("download", data.filename);
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);

//       toast.success(`Exported ${data.productCount} products`);
//       setSelectedProducts(new Set());
//     },
//   });

//   return (
//     <div>
//       {/* Bulk Actions Bar */}
//       {selectedProducts.size > 0 && (
//         <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
//           <div className="flex items-center justify-between">
//             <span className="text-sm font-medium text-blue-900">
//               {selectedProducts.size} product{selectedProducts.size !== 1 ? "s" : ""} selected
//             </span>
//             <div className="flex gap-2">
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => setSelectedProducts(new Set())}
//               >
//                 Clear
//               </Button>
//               <Button
//                 size="sm"
//                 onClick={() => {
//                   exportMutation.mutate({
//                     businessId,
//                     productIds: Array.from(selectedProducts),
//                   });
//                 }}
//                 disabled={exportMutation.isPending}
//               >
//                 {exportMutation.isPending ? (
//                   <Loader2 className="h-4 w-4 animate-spin" />
//                 ) : (
//                   <>
//                     <Download className="mr-2 h-4 w-4" />
//                     Export to WordPress
//                   </>
//                 )}
//               </Button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Products table with checkboxes */}
//       {/* ... existing table code with select checkboxes */}
//     </div>
//   );
// }
