/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Download,
  FileDown,
  Loader2,
  Package,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export function ProductExporter() {
  const [search, setSearch] = useState("");
  const [publishedOnly, setPublishedOnly] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set(),
  );

  const { data: products, isLoading } =
    api.export.getProductsForExport.useQuery({
      search: search || undefined,
      publishedOnly,
    });

  const exportMutation = api.export.exportProducts.useMutation({
    onSuccess: (data) => {
      // Create blob and download
      const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute("download", data.filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${data.productCount} products successfully`);
      setSelectedProducts(new Set()); // Clear selection
    },
    onError: (error) => {
      toast.error(error.message || "Failed to export products");
    },
  });

  const handleSelectAll = () => {
    if (!products) return;

    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((p) => p.id)));
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleExport = () => {
    if (selectedProducts.size === 0) {
      toast.error("Please select at least one product");
      return;
    }

    exportMutation.mutate({
      productIds: Array.from(selectedProducts),
    });
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Export to WordPress
          </h1>
          <p className="mt-2 text-muted-foreground">
            Select products to export to WooCommerce
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Products</CardTitle>
                <CardDescription>
                  Choose which products to include in the export
                </CardDescription>
              </div>

              {selectedProducts.size > 0 && (
                <Button
                  onClick={handleExport}
                  disabled={exportMutation.isPending}
                  size="lg"
                >
                  {exportMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      Export {selectedProducts.size} Product
                      {selectedProducts.size !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Filters */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  aria-label="Search products"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="published-only"
                  checked={publishedOnly}
                  onCheckedChange={(checked) => setPublishedOnly(!!checked)}
                />
                <label
                  htmlFor="published-only"
                  className="cursor-pointer text-sm font-medium whitespace-nowrap"
                >
                  Published only
                </label>
              </div>
            </div>

            {/* Selection Summary */}
            {selectedProducts.size > 0 && (
              <Alert className="border-blue-200 bg-blue-50">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>
                    {selectedProducts.size} product
                    {selectedProducts.size !== 1 ? "s" : ""} selected
                  </strong>{" "}
                  - Ready to export to WooCommerce CSV format
                </AlertDescription>
              </Alert>
            )}

            {/* Products Table */}
            {isLoading ? (
              <div className="py-12 text-center" role="status">
                <Loader2 aria-hidden="true" className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <span className="sr-only">Loading…</span>
                <p className="mt-4 text-muted-foreground" aria-hidden="true">Loading products...</p>
              </div>
            ) : !products || products.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">No products found</p>
                {search && (
                  <Button
                    variant="link"
                    onClick={() => setSearch("")}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <caption className="sr-only">Products available for export</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col" className="w-12">
                        <Checkbox
                          checked={selectedProducts.size === products.length}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all products"
                        />
                      </TableHead>
                      <TableHead scope="col">Product</TableHead>
                      <TableHead scope="col">SKU</TableHead>
                      <TableHead scope="col">Price</TableHead>
                      <TableHead scope="col">Stock</TableHead>
                      <TableHead scope="col">Type</TableHead>
                      <TableHead scope="col">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={() =>
                              handleSelectProduct(product.id)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.images[0] ? (
                              <img
                                src={product.images[0].url}
                                alt={product.name}
                                loading="lazy"
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{product.name}</p>
                              {product.featured && (
                                <Badge variant="secondary" className="mt-1">
                                  Featured
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-muted-foreground">
                            {product.sku ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell>{formatPrice(product.price)}</TableCell>
                        <TableCell>
                          {product.inventoryQty > 0 ? (
                            <span className="text-green-600">
                              {product.inventoryQty} in stock
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Out of stock</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.variantCount > 0 ? (
                            <Badge variant="outline">
                              Variable ({product.variantCount} variants)
                            </Badge>
                          ) : (
                            <Badge variant="outline">Simple</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.published ? (
                            <Badge className="bg-green-600">Published</Badge>
                          ) : (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Help Text */}
            <Alert>
              <FileDown className="h-4 w-4" />
              <AlertDescription>
                <strong>How to import to WordPress:</strong>
                <ol className="mt-2 list-inside list-decimal space-y-1 text-sm">
                  <li>Select the products you want to export</li>
                  <li>Click &quot;Export&quot; to download the CSV file</li>
                  <li>Go to your WordPress admin → WooCommerce → Products</li>
                  <li>Click &quot;Import&quot; at the top</li>
                  <li>Upload the CSV file and follow the wizard</li>
                  <li>Map the columns (should auto-detect)</li>
                  <li>Complete the import</li>
                </ol>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
