import { ProductForm } from "../_components/product-form";

export default async function NewProductPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add Product</h1>
          <p className="mt-1 text-gray-600">
            Create a new product for your store
          </p>
        </div>

        <ProductForm />
      </div>
    </div>
  );
}
