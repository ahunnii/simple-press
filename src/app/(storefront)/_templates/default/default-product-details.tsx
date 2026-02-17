// /* eslint-disable @typescript-eslint/no-unsafe-argument */
// /* eslint-disable @typescript-eslint/no-unsafe-member-access */
// "use client";

// import { useState } from "react";
// import Image from "next/image";
// import { Check, ShoppingCart } from "lucide-react";

// import { Badge } from "~/components/ui/badge";
// import { Button } from "~/components/ui/button";
// import { useCart } from "~/providers/cart-context";

// import { AddToCartButton } from "./add-to-cart";

// type Product = {
//   id: string;
//   name: string;
//   description: string | null;
//   price: number;
//   images: Array<{ url: string; altText: string | null }>;
//   variants: Array<{
//     id: string;
//     name: string;
//     price: number | null;
//     inventoryQty: number;
//     options: Record<string, string>;
//   }>;
// };

// type Business = {
//   siteContent: {
//     primaryColor: string | null;
//   } | null;
// };

// type ProductDetailsProps = {
//   product: Product;
//   business: Business;
// };

// export function ProductDetails({ product, business }: ProductDetailsProps) {
//   const { addItem } = useCart();
//   const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
//     product.variants[0]?.id ?? null,
//   );
//   const [quantity, setQuantity] = useState(1);
//   const [justAdded, setJustAdded] = useState(false);

//   const primaryColor = business.siteContent?.primaryColor ?? "#3b82f6";

//   // Get selected variant
//   const selectedVariant = product.variants.find(
//     (v) => v.id === selectedVariantId,
//   );

//   // Calculate price (treat variant price 0 or null as "use product base price")
//   const displayPrice =
//     selectedVariant?.price != null && selectedVariant.price !== 0
//       ? selectedVariant.price
//       : product.price;

//   const formatPrice = (cents: number) => {
//     return new Intl.NumberFormat("en-US", {
//       style: "currency",
//       currency: "USD",
//     }).format(cents / 100);
//   };

//   // Extract unique option types from variants
//   const getVariantOptions = () => {
//     if (product.variants.length === 0) return {};

//     const optionTypes: Record<string, Set<string>> = {};

//     product.variants.forEach((variant) => {
//       Object.entries(variant.options).forEach(([key, value]) => {
//         if (!optionTypes[key]!) {
//           optionTypes[key] = new Set();
//         }
//         optionTypes[key].add(value);
//       });
//     });

//     return Object.fromEntries(
//       Object.entries(optionTypes).map(([key, values]) => [
//         key,
//         Array.from(values),
//       ]),
//     );
//   };

//   const variantOptions = getVariantOptions();

//   // Get selected options from current variant
//   const getSelectedOptions = () => {
//     if (!selectedVariant) return {};
//     return selectedVariant.options;
//   };

//   const selectedOptions = getSelectedOptions();

//   // Handle option selection
//   const handleOptionSelect = (optionType: string, value: string) => {
//     const newOptions = { ...selectedOptions, [optionType]: value };

//     // Find variant matching these options
//     const matchingVariant = product.variants.find((variant) => {
//       return Object.entries(newOptions).every(
//         ([key, val]) => variant.options[key] === val,
//       );
//     });

//     if (matchingVariant) {
//       setSelectedVariantId(matchingVariant.id);
//     }
//   };

//   const handleAddToCart = () => {
//     addItem({
//       productId: product.id,
//       variantId: selectedVariantId,
//       productName: product.name,
//       variantName: selectedVariant?.name ?? null,
//       price: displayPrice,
//       imageUrl: product.images[0]?.url ?? null,
//     });

//     // Show feedback
//     setJustAdded(true);
//     setTimeout(() => setJustAdded(false), 2000);
//   };

//   const inStock = selectedVariant ? selectedVariant.inventoryQty > 0 : true;

//   return (
//     <div className="grid gap-12 md:grid-cols-2">
//       {/* Images */}
//       <div>
//         {product.images[0] ? (
//           <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
//             <Image
//               src={product.images[0].url}
//               alt={product.images[0].altText ?? product.name}
//               fill
//               className="object-cover"
//             />
//           </div>
//         ) : (
//           <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100">
//             <span className="text-gray-400">No image</span>
//           </div>
//         )}

//         {/* Thumbnail grid */}
//         {product.images.length > 1 && (
//           <div className="mt-4 grid grid-cols-4 gap-4">
//             {product.images.slice(1, 5).map((image, index) => (
//               <div
//                 key={index}
//                 className="relative aspect-square overflow-hidden rounded bg-gray-100"
//               >
//                 <Image
//                   src={image.url}
//                   alt={image.altText ?? `${product.name} ${index + 2}`}
//                   fill
//                   className="object-cover"
//                 />
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* Product Info */}
//       <div>
//         <h1 className="mb-4 text-4xl font-bold text-gray-900">
//           {product.name}
//         </h1>

//         <div className="mb-6 flex items-center gap-4">
//           <p className="text-3xl font-bold" style={{ color: primaryColor }}>
//             {formatPrice(displayPrice)}
//           </p>
//           {inStock ? (
//             <Badge variant="default">In Stock</Badge>
//           ) : (
//             <Badge variant="destructive">Out of Stock</Badge>
//           )}
//         </div>

//         {product.description && (
//           <div className="mb-8">
//             <p className="whitespace-pre-line text-gray-600">
//               {product.description}
//             </p>
//           </div>
//         )}

//         {/* Variant Options */}
//         {Object.keys(variantOptions).length > 0 && (
//           <div className="mb-8 space-y-6">
//             {Object.entries(variantOptions).map(([optionType, values]) => (
//               <div key={optionType}>
//                 <label className="mb-3 block text-sm font-medium text-gray-900 capitalize">
//                   {optionType}
//                 </label>
//                 <div className="flex flex-wrap gap-2">
//                   {values.map((value: string) => {
//                     const isSelected = selectedOptions[optionType] === value;
//                     return (
//                       <button
//                         key={value}
//                         onClick={() => handleOptionSelect(optionType, value)}
//                         className={`rounded-lg border-2 px-4 py-2 transition-all ${
//                           isSelected
//                             ? "border-current text-white"
//                             : "border-gray-300 text-gray-700 hover:border-gray-400"
//                         }`}
//                         style={
//                           isSelected
//                             ? {
//                                 backgroundColor: primaryColor,
//                                 borderColor: primaryColor,
//                               }
//                             : {}
//                         }
//                       >
//                         {value}
//                         {isSelected && (
//                           <Check className="ml-2 inline h-4 w-4" />
//                         )}
//                       </button>
//                     );
//                   })}
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}

//         {/* Quantity */}
//         <div className="mb-8">
//           <label className="mb-3 block text-sm font-medium text-gray-900">
//             Quantity
//           </label>
//           <div className="flex items-center gap-4">
//             <button
//               onClick={() => setQuantity(Math.max(1, quantity - 1))}
//               className="h-10 w-10 rounded-lg border border-gray-300 hover:bg-gray-50"
//             >
//               −
//             </button>
//             <span className="w-12 text-center text-lg font-medium">
//               {quantity}
//             </span>
//             <button
//               onClick={() => setQuantity(quantity + 1)}
//               className="h-10 w-10 rounded-lg border border-gray-300 hover:bg-gray-50"
//             >
//               +
//             </button>
//           </div>
//         </div>

//         {/* Add to Cart */}
//         <Button
//           onClick={handleAddToCart}
//           disabled={!inStock}
//           size="lg"
//           className="w-full text-white"
//           style={{ backgroundColor: justAdded ? "#10b981" : primaryColor }}
//         >
//           {justAdded ? (
//             <>
//               <Check className="mr-2 h-5 w-5" />
//               Added to Cart!
//             </>
//           ) : (
//             <>
//               <ShoppingCart className="mr-2 h-5 w-5" />
//               {inStock ? "Add to Cart" : "Out of Stock"}
//             </>
//           )}
//         </Button>

//         {selectedVariant && (
//           <p className="mt-4 text-sm text-gray-500">
//             {selectedVariant.inventoryQty} in stock
//           </p>
//         )}
//       </div>
//     </div>
//   );
// }

/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { useProduct } from "~/hooks/use-product";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { useCart } from "~/providers/cart-context";

import { DefaultVariantSelector } from "./default-variant-selector";

const UNLIMITED_STOCK = 999;

type Props = {
  product: NonNullable<RouterOutputs["product"]["get"]>;
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
};

export function DefaultProductDetails({ product, business }: Props) {
  // const { addItem, getItemQuantity, isHydrated } = useCart();
  // const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
  //   product.variants[0]?.id ?? null,
  // );
  // const [quantity, setQuantity] = useState(1);
  // const [justAdded, setJustAdded] = useState(false);
  const {
    isHydrated,
    formatPrice,
    inStock,
    selectedVariant,
    variantOptions,
    cartQuantity,
    showLowStockWarning,
    displayPrice,
    handleAddToCart,
    remainingStock,
    canAddMore,
    handleDecrement,
    handleQuantityChange,
    handleIncrement,
    quantity,
    justAdded,
    setQuantity,
  } = useProduct(product);

  const primaryColor = business.siteContent?.primaryColor ?? "#3b82f6";

  // // Get selected variant
  // const selectedVariant = product.variants.find(
  //   (v) => v.id === selectedVariantId,
  // );

  // // Calculate price (treat variant price 0 or null as "use product base price")
  // const displayPrice =
  //   selectedVariant?.price != null && selectedVariant.price !== 0
  //     ? selectedVariant.price
  //     : product.price;

  // // Get current cart quantity for this variant
  // const cartQuantity = getItemQuantity(product.id, selectedVariantId);

  // // Calculate remaining stock and max inventory
  // const hasVariants = product.variants.length > 0;
  // const maxInventory = hasVariants
  //   ? (selectedVariant?.inventoryQty ?? 0)
  //   : product.trackInventory && !product.allowBackorders
  //     ? (product.inventoryQty ?? 0)
  //     : UNLIMITED_STOCK;
  // const remainingStock = maxInventory - cartQuantity;
  // const canAddMore = remainingStock > 0;

  // const formatPrice = (cents: number) => {
  //   return new Intl.NumberFormat("en-US", {
  //     style: "currency",
  //     currency: "USD",
  //   }).format(cents / 100);
  // };

  // // Extract unique option types from variants
  // const getVariantOptions = () => {
  //   if (product.variants.length === 0) return {};

  //   const optionTypes: Record<string, Set<string>> = {};

  //   product.variants.forEach((variant) => {
  //     Object.entries(variant.options).forEach(([key, value]) => {
  //       if (!optionTypes[key]!) {
  //         optionTypes[key] = new Set();
  //       }
  //       optionTypes[key]?.add(value);
  //     });
  //   });

  //   return Object.fromEntries(
  //     Object.entries(optionTypes).map(([key, values]) => [
  //       key,
  //       Array.from(values),
  //     ]),
  //   );
  // };

  // const variantOptions = getVariantOptions();

  // // Get selected options from current variant
  // const getSelectedOptions = () => {
  //   if (!selectedVariant) return {};
  //   return selectedVariant.options;
  // };

  // const selectedOptions = getSelectedOptions();

  // // Handle option selection
  // const handleOptionSelect = (optionType: string, value: string) => {
  //   const newOptions = { ...selectedOptions, [optionType]: value };

  //   // Find variant matching these options
  //   const matchingVariant = product.variants.find((variant) => {
  //     return Object.entries(newOptions).every(
  //       ([key, val]) => variant.options[key] === val,
  //     );
  //   });

  //   if (matchingVariant) {
  //     setSelectedVariantId(matchingVariant.id);
  //     // Reset quantity to 1 when changing variants
  //     setQuantity(1);
  //   }
  // };

  // // Handle quantity change
  // const handleQuantityChange = (newQuantity: number) => {
  //   // Clamp between 1 and remaining stock
  //   const clamped = Math.min(remainingStock, Math.max(1, newQuantity));
  //   setQuantity(clamped);
  // };

  // const handleIncrement = () => {
  //   if (quantity < remainingStock) {
  //     setQuantity(quantity + 1);
  //   }
  // };

  // const handleDecrement = () => {
  //   if (quantity > 1) {
  //     setQuantity(quantity - 1);
  //   }
  // };

  // const handleAddToCart = () => {
  //   if (!canAddMore) return;

  //   addItem(
  //     {
  //       productId: product.id,
  //       variantId: selectedVariantId,
  //       productName: product.name,
  //       variantName: selectedVariant?.name ?? null,
  //       price: displayPrice,
  //       imageUrl: product.images[0]?.url ?? null,
  //       sku: selectedVariant?.sku ?? null,
  //       maxInventory, // Pass max for validation
  //     },
  //     quantity, // Add the selected quantity
  //   );

  //   // Show feedback
  //   setJustAdded(true);
  //   setTimeout(() => setJustAdded(false), 2000);

  //   // Reset quantity to 1
  //   setQuantity(1);
  // };

  // const inStock = hasVariants
  //   ? selectedVariant
  //     ? selectedVariant.inventoryQty > 0
  //     : false
  //   : !product.trackInventory ||
  //     (product.allowBackorders ?? false) ||
  //     (product.inventoryQty ?? 0) > 0;

  // const showLowStockWarning = remainingStock > 0 && remainingStock < 10;

  // Don't show interactive elements until cart is hydrated
  if (!isHydrated) {
    return (
      <div className="grid gap-12 md:grid-cols-2">
        {/* Images */}
        <div>
          {product.images[0] ? (
            <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
              <Image
                src={product.images[0].url}
                alt={product.images[0].altText ?? product.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100">
              <span className="text-gray-400">No image</span>
            </div>
          )}
        </div>

        {/* Product Info - Loading State */}
        <div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            {product.name}
          </h1>
          <div className="mb-6">
            <p className="text-3xl font-bold" style={{ color: primaryColor }}>
              {formatPrice(displayPrice)}
            </p>
          </div>
          <Button disabled size="lg" className="w-full">
            Loading...
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-12 md:grid-cols-2">
      {/* Images */}
      <div>
        {product.images[0] ? (
          <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
            <Image
              src={product.images[0].url}
              alt={product.images[0].altText ?? product.name}
              fill
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100">
            <span className="text-gray-400">No image</span>
          </div>
        )}

        {/* Thumbnail grid */}
        {product.images.length > 1 && (
          <div className="mt-4 grid grid-cols-4 gap-4">
            {product.images.slice(1, 5).map((image, index) => (
              <div
                key={index}
                className="relative aspect-square overflow-hidden rounded bg-gray-100"
              >
                <Image
                  src={image.url}
                  alt={image.altText ?? `${product.name} ${index + 2}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div>
        <h1 className="mb-4 text-4xl font-bold text-gray-900">
          {product.name}
        </h1>

        <div className="mb-6 flex items-center gap-4">
          <p className="text-3xl font-bold" style={{ color: primaryColor }}>
            {formatPrice(displayPrice)}
          </p>
          {inStock ? (
            <Badge variant="default" className="bg-green-600">
              In Stock
            </Badge>
          ) : (
            <Badge variant="destructive">Out of Stock</Badge>
          )}
        </div>

        {product.description && (
          <div className="mb-8">
            <p className="whitespace-pre-line text-gray-600">
              {product.description}
            </p>
          </div>
        )}

        {/* Variant Options */}
        {Object.keys(variantOptions).length > 0 && (
          <>
            {/* <div className="mb-8 space-y-6">
              {Object.entries(variantOptions).map(([optionType, values]) => (
                <div key={optionType}>
                  <label className="mb-3 block text-sm font-medium text-gray-900 capitalize">
                    {optionType}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {values.map((value: string) => {
                      const isSelected = selectedOptions[optionType] === value;
                      return (
                        <button
                          key={value}
                          onClick={() => handleOptionSelect(optionType, value)}
                          className={`rounded-lg border-2 px-4 py-2 transition-all ${
                            isSelected
                              ? "border-current text-white"
                              : "border-gray-300 text-gray-700 hover:border-gray-400"
                          }`}
                          style={
                            isSelected
                              ? {
                                  backgroundColor: primaryColor,
                                  borderColor: primaryColor,
                                }
                              : {}
                          }
                        >
                          {value}
                          {isSelected && (
                            <Check className="ml-2 inline h-4 w-4" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <Separator /> */}

            <DefaultVariantSelector product={product} />
          </>
        )}

        {/* Stock Info */}
        {selectedVariant && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {selectedVariant.inventoryQty} in stock
              {cartQuantity > 0 && (
                <span className="ml-2 text-gray-500">
                  ({cartQuantity} in cart)
                </span>
              )}
            </p>
            {showLowStockWarning && (
              <p className="mt-1 text-sm text-amber-600">
                ⚠ Only {remainingStock} left!
              </p>
            )}
          </div>
        )}

        {Object.keys(variantOptions).length === 0 && product.trackInventory && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {product.inventoryQty ?? 0} in stock
              {cartQuantity > 0 && (
                <span className="ml-2 text-gray-500">
                  ({cartQuantity} in cart)
                </span>
              )}
            </p>
            {showLowStockWarning && (
              <p className="mt-1 text-sm text-amber-600">
                ⚠ Only {remainingStock} left!
              </p>
            )}
          </div>
        )}

        {Object.keys(variantOptions).length === 0 && (
          <>
            {/* Quantity Selector */}
            {canAddMore && (
              <div className="mb-6">
                <label className="mb-3 block text-sm font-medium text-gray-900">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDecrement}
                    disabled={quantity <= 1}
                    className="h-10 w-10 p-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>

                  <Input
                    type="number"
                    min={1}
                    max={remainingStock}
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        handleQuantityChange(val);
                      }
                    }}
                    onBlur={() => {
                      // Reset to 1 if empty
                      if (!quantity || quantity < 1) {
                        setQuantity(1);
                      }
                    }}
                    className="w-20 [appearance:textfield] text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleIncrement}
                    disabled={quantity >= remainingStock}
                    className="h-10 w-10 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <span className="text-sm text-gray-500">
                    {remainingStock > 1
                      ? `${remainingStock} available`
                      : "Last one!"}
                  </span>
                </div>
              </div>
            )}

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              disabled={!inStock || !canAddMore}
              size="lg"
              className="w-full text-white"
              style={{ backgroundColor: justAdded ? "#10b981" : primaryColor }}
            >
              {justAdded ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Added to Cart!
                </>
              ) : !inStock ? (
                "Out of Stock"
              ) : !canAddMore ? (
                "No More Available"
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Add {quantity > 1 ? `${quantity} ` : ""}to Cart
                </>
              )}
            </Button>
          </>
        )}

        {!canAddMore && inStock && (
          <p className="mt-3 text-center text-sm text-amber-600">
            You have the maximum available quantity in your cart
          </p>
        )}
      </div>
    </div>
  );
}
