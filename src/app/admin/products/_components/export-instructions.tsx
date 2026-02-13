// app/admin/products/import/_components/export-instructions.tsx
export function ExportInstructions() {
  return (
    <div className="prose max-w-none">
      <h3>How to Export from WooCommerce</h3>

      <ol>
        <li>
          <strong>Log in to WordPress Admin</strong>
          <br />
          Navigate to your WordPress dashboard
        </li>

        <li>
          <strong>Go to WooCommerce → Products</strong>
          <br />
          Click on &quot;Products&quot; in the WooCommerce menu
        </li>

        <li>
          <strong>Click &quot;Export&quot;</strong>
          <br />
          You&apos;ll find the Export button at the top of the products page
        </li>

        <li>
          <strong>Select Export Options</strong>
          <br />
          - Choose &quot;All products&quot; or select specific products
          <br />- Make sure to include: ID, Type, SKU, Name, Description, Price,
          Stock, Images
        </li>

        <li>
          <strong>Generate CSV</strong>
          <br />
          Click &quot;Generate CSV&quot; and download the file
        </li>

        <li>
          <strong>Upload Here</strong>
          <br />
          Use the upload button above to import your products
        </li>
      </ol>

      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h4 className="font-medium text-blue-900">Tips for Best Results</h4>
        <ul className="mt-2 text-sm text-blue-800">
          <li>Ensure all product names are unique</li>
          <li>Include SKUs for better inventory tracking</li>
          <li>Export images URLs if possible</li>
          <li>Check for any products with missing prices</li>
          <li>Review variable products and their variations</li>
        </ul>
      </div>
    </div>
  );
}
