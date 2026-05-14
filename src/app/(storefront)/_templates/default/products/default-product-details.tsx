"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Minus, Plus, ShieldCheck, ShoppingCart } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../../types";
import { useProduct } from "~/hooks/use-product";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

import { DefaultVariantSelector } from "./default-variant-selector";
import { DefaultProductDetailsTabs } from "./default-product-details-tabs";
import { DefaultRelatedProductsSection } from "./default-related-products-section";

export function DefaultProductDetails({
  product,
}: DefaultProductPageTemplateProps) {
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
    additionalFields,
  } = useProduct(product);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const { data: relatedProducts } = api.product.getRelated.useQuery({
    productId: product.id,
  });

  const primaryColor = product.business?.siteContent?.primaryColor ?? "#3b82f6";

  const selectedImage =
    product.images[selectedImageIndex] ?? product.images[0];

  const trustBadges =
    additionalFields?.productFeatures &&
    additionalFields.productFeatures.length > 0
      ? additionalFields.productFeatures
      : [];

  if (!isHydrated) {
    return (
      <div className="grid gap-12 md:grid-cols-2">
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
    <>
      <div className="grid gap-12 md:grid-cols-2">
        {/* Images */}
        <div>
          {selectedImage ? (
            <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
              <Image
                src={selectedImage.url}
                alt={selectedImage.altText ?? product.name}
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

          {/* Thumbnail gallery */}
          {product.images.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative aspect-square w-16 overflow-hidden rounded border-2 bg-gray-100 transition-all focus:outline-none ${
                    selectedImageIndex === index
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                  style={
                    selectedImageIndex === index
                      ? { borderColor: primaryColor }
                      : {}
                  }
                  aria-label={`View image ${index + 1}`}
                >
                  <Image
                    src={image.url}
                    alt={image.altText ?? `${product.name} ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            {product.name}
          </h1>

          {additionalFields?.productTagline && (
            <p className="mb-4 text-lg font-light text-gray-500">
              {additionalFields.productTagline}
            </p>
          )}

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

          {/* Variant Options */}
          {Object.keys(variantOptions).length > 0 && (
            <DefaultVariantSelector product={product} />
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

              <Button
                onClick={handleAddToCart}
                disabled={!inStock || !canAddMore}
                size="lg"
                className="w-full text-white"
                style={{
                  backgroundColor: justAdded ? "#10b981" : primaryColor,
                }}
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

          {/* Trust badges */}
          {trustBadges.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-2">
              {trustBadges.map((badge, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-500" style={{ color: primaryColor }} />
                  <span className="text-xs text-gray-600">{badge.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DefaultProductDetailsTabs product={product} />
      <DefaultRelatedProductsSection relatedProducts={relatedProducts ?? []} />
    </>
  );
}
