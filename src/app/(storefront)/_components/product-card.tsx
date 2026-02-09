import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "~/components/ui/card";

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: Array<{ url: string; altText: string | null }>;
};

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  return (
    <Link href={`/products/${product.slug}`}>
      <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
        <div className="relative aspect-square bg-gray-100">
          {product.images[0] ? (
            <Image
              src={product.images[0].url}
              alt={product.images[0].altText ?? product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="mb-1 line-clamp-2 font-semibold text-gray-900">
            {product.name}
          </h3>
          <p className="text-lg font-bold" style={{ color: "#3b82f6" }}>
            {formatPrice(product.price)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
