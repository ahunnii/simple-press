# Collections

## Overview

Collections let you group products together under a single name and page on your storefront. Think of them like curated shelves — you decide which products belong together and give the group a name that makes sense for your business.

**Common uses:**

- **"New Arrivals"** — surface the latest products in one place
- **"Summer Sale"** — group discounted seasonal items
- **"Gift Ideas"** — help customers who aren't sure what to buy
- **"Best Sellers"** — highlight your most popular products
- **"Accessories"** — cross-sell add-ons alongside main products

Each collection gets its own page on your site (e.g. `/collections/new-arrivals`) and shows up on a browsable `/collections` index page. You control what's published, the order products appear in, and all the details customers see.

---

## For Business Owners

### Enabling Collections

Collections are **off by default**. To turn them on:

1. Go to **Settings → Features** in your admin dashboard.
2. Find **Collections** under the E-Commerce section.
3. Toggle it on and save.

Once enabled, a **Collections** link appears in your admin sidebar and your storefront gets the `/collections` pages.

> **Note:** Collections require the **Products** feature to be active. If Products is disabled, Collections will be unavailable regardless of its own toggle.

### Creating a Collection

1. Go to **Collections** in the admin sidebar.
2. Click **New Collection**.
3. Fill in:
   - **Name** — what customers will see (e.g. "Summer Sale")
   - **Description** — optional text shown on the collection page
   - **Image** — a cover image for the collection
   - **Published** — whether the collection is visible on your site
   - **SEO fields** — optional meta title and description for search engines
4. Save the collection, then use the product selector to add products to it.

### Managing Products in a Collection

On any collection's edit page you can add or remove individual products. The order products appear in can be adjusted — drag-and-drop ordering is coming soon (the backend already supports it).

### Deleting a Collection

Deleting a collection removes it and all its product associations. It does **not** delete the products themselves.

### Importing Collections from WooCommerce

If you're migrating from WooCommerce, the product import wizard has a **"Create collections from categories"** checkbox. When checked, each WooCommerce product category becomes a collection and products are linked automatically.

---

## Data Model

Collections are stored across two database tables.

### `Collection`

| Field | Type | Description |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `createdAt` | `DateTime` | Record creation timestamp |
| `updatedAt` | `DateTime` | Last update timestamp |
| `name` | `String` | Display name |
| `slug` | `String` | URL-safe identifier, auto-generated from name |
| `description` | `String?` | Optional long-form description |
| `imageUrl` | `String?` | Cover image URL |
| `published` | `Boolean` | Whether visible on the storefront (default: `true`) |
| `sortOrder` | `Int` | Position in the collection listing (default: `0`) |
| `metaTitle` | `String?` | SEO page title override |
| `metaDescription` | `String?` | SEO meta description override |
| `businessId` | `String` | Foreign key — owning business |

**Constraints:** `(businessId, slug)` is unique — two collections in the same business cannot share a slug.

### `CollectionProduct` (join table)

| Field | Type | Description |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `collectionId` | `String` | FK → `Collection.id` (cascade delete) |
| `productId` | `String` | FK → `Product.id` (cascade delete) |
| `sortOrder` | `Int` | Position of this product within the collection |

**Constraints:** `(collectionId, productId)` is unique — a product can only be added to a collection once.

### Schema reference

```prisma
// prisma/schema.prisma

model Collection {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  name        String
  slug        String
  description String? @db.Text
  imageUrl    String?

  published  Boolean @default(true)
  sortOrder  Int     @default(0)

  metaTitle       String?
  metaDescription String?

  businessId String
  business   Business @relation(fields: [businessId], references: [id], onDelete: Cascade)

  collectionProducts CollectionProduct[]

  @@unique([businessId, slug])
  @@index([businessId])
}

model CollectionProduct {
  id        String @id @default(cuid())
  sortOrder Int    @default(0)

  collectionId String
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)

  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([collectionId, productId])
  @@index([collectionId])
  @@index([productId])
}
```

---

## Feature Flag

Defined in `src/lib/features/registry.ts`:

```ts
collections: {
  key: "collections",
  label: "Collections",
  description: "Create collections of products and display them on your site",
  category: "ecommerce",
  enabledByDefault: false,
  ownerCanToggle: true,
  dependsOn: ["products"],
  hidesNav: ["collections"],
}
```

| Property | Value |
|---|---|
| Key | `"collections"` |
| Category | `ecommerce` |
| Enabled by default | No |
| Owner can toggle | Yes |
| Depends on | `products` |

### What disabling collections affects

| Surface | Behavior when disabled |
|---|---|
| Admin sidebar | "Collections" nav item is hidden |
| `/admin/collections/*` | Shows a "Feature Disabled" page with a link to Settings → Features |
| `/collections` and `/collections/[slug]` | Returns `404 Not Found` |
| All tRPC procedures | Throws `FORBIDDEN` — `"The collections feature is not enabled for this business."` |

Flags are stored as JSON in the `Business.featureFlags` column and merged with registry defaults at read time via `getBusinessFlags()` in `src/lib/features/get-business-flags.ts`.

---

## Slug Generation

Slugs are auto-generated from the collection name via `generateCollectionSlug(name)` in `src/lib/slug.ts`:

- Lowercases the name
- Replaces any non-alphanumeric characters with `-`
- Trims leading and trailing dashes

If the generated slug already exists for that business, a numeric suffix is appended (`-1`, `-2`, etc.) until a unique slug is found.

Slugs are **regenerated whenever the collection name changes** during an update. Changing the name will change the URL.

---

## Admin UI

| Route | File | Purpose |
|---|---|---|
| `/admin/collections` | `src/app/admin/collections/page.tsx` | Grid listing of all collections with product counts |
| `/admin/collections/new` | `src/app/admin/collections/new/page.tsx` | Create a new collection |
| `/admin/collections/[id]` | `src/app/admin/collections/[id]/page.tsx` | Edit collection details and manage its products |

The collections feature gate is enforced in `src/app/admin/collections/layout.tsx` — it checks `getBusinessFlags()` and renders a `GenericFeatureDisabledPage` if collections are off.

Collections can also be added to site navigation via **Settings → Navigation → Quick Add → Collections**.

---

## Storefront Routes

| Route | Description |
|---|---|
| `/collections` | Lists all published collections, ordered by `sortOrder` |
| `/collections/[slug]` | Detail page for a single collection with its full product listing |

The storefront layout at `src/app/(storefront)/collections/layout.tsx` calls `notFound()` if the feature is disabled, so unauthenticated visitors see a clean 404 rather than an error.

The detail page includes each product's variants and first image (ordered by `sortOrder`). Additional published collections are passed as `additionalCollections` so templates can render a "More Collections" section.

---

## tRPC API Reference

All procedures are defined in `src/server/api/routers/collections.ts` and mounted at `collections.*` on the app router. Every procedure is gated behind `featureGate("collections")`.

### Admin procedures

These require an authenticated owner or admin session (`ownerAdminProcedure`).

#### `collections.getAll`

Returns all collections for the current business, ordered by `sortOrder`. Includes a `_count` of associated products.

```ts
// Returns: Collection & { _count: { collectionProducts: number } }[]
api.collections.getAll()
```

---

#### `collections.getById`

Returns a single collection by ID, including its products with `id`, `name`, `price`, and first image.

```ts
// Input: string (collection id)
// Returns: Collection & { collectionProducts: (CollectionProduct & { product })[] }
api.collections.getById("coll_abc123")
```

Throws `NOT_FOUND` if the collection does not belong to the current business.

---

#### `collections.create`

Creates a new collection. Slug is auto-generated from `name` and guaranteed unique. The new collection is appended to the end of the sort order.

```ts
// Input: collectionCreateSchema
api.collections.create({
  name: "Summer Sale",
  description: "Our hottest deals of the season.",
  imageUrl: "https://...",
  published: true,
  metaTitle: null,
  metaDescription: null,
})
```

---

#### `collections.update`

Updates an existing collection. If `name` changes, the slug is regenerated. Throws `NOT_FOUND` if the collection is not found or doesn't belong to the current business.

```ts
// Input: collectionUpdateSchema (includes `id`)
api.collections.update({
  id: "coll_abc123",
  name: "End of Summer Sale",
  published: false,
  // ...other fields
})
```

---

#### `collections.delete`

Deletes a collection. All `CollectionProduct` rows for that collection are cascade-deleted. The underlying products are unaffected.

```ts
// Input: string (collection id)
// Returns: { success: true }
api.collections.delete("coll_abc123")
```

---

#### `collections.addProduct`

Adds a product to a collection. The product is appended to the end of the collection's sort order. Throws `BAD_REQUEST` if the product is already in the collection.

```ts
// Input: { collectionId: string, productId: string }
// Returns: CollectionProduct
api.collections.addProduct({
  collectionId: "coll_abc123",
  productId: "prod_xyz456",
})
```

---

#### `collections.removeProduct`

Removes a product from a collection (deletes the `CollectionProduct` join row).

```ts
// Input: { collectionId: string, productId: string }
// Returns: { success: true }
api.collections.removeProduct({
  collectionId: "coll_abc123",
  productId: "prod_xyz456",
})
```

---

#### `collections.updateProductOrder`

Reorders all products within a collection. Accepts an ordered array of `productId` strings. Updates `sortOrder` for each via a single DB transaction.

```ts
// Input: { collectionId: string, productIds: string[] }
// Returns: { success: true }
api.collections.updateProductOrder({
  collectionId: "coll_abc123",
  productIds: ["prod_3", "prod_1", "prod_2"],
})
```

> **Note:** This procedure is fully implemented but not yet connected to a drag-and-drop UI in the admin.

---

#### `collections.updateCollectionOrder`

Reorders the collections themselves. Accepts an ordered array of collection IDs and updates each `sortOrder` via a single DB transaction.

```ts
// Input: string[] (ordered collection ids)
// Returns: { success: true }
api.collections.updateCollectionOrder(["coll_3", "coll_1", "coll_2"])
```

> **Note:** This procedure is fully implemented but not yet connected to a drag-and-drop UI in the admin.

---

### Public procedures

These require no authentication. They are scoped to the current business automatically via `getBusinessProcedure()`, which resolves the business from the request domain.

#### `collections.getAllPublic`

Returns all **published** collections for the current business, ordered by `sortOrder`. Includes product count.

```ts
// Returns: (Collection & { _count: { collectionProducts: number } })[]
api.collections.getAllPublic()
```

---

#### `collections.getBySlug`

Returns a single published collection by its slug, including all linked products with variants and first image.

```ts
// Input: string (slug)
// Returns: Collection & { collectionProducts: (CollectionProduct & { product })[] }
api.collections.getBySlug("summer-sale")
```

Throws `NOT_FOUND` if no published collection matches the slug for the current business.

---

## Validators

Defined in `src/lib/validators/collections.ts`.

| Schema | Used in | Fields |
|---|---|---|
| `collectionCreateSchema` | `collections.create` | `name`, `description?`, `imageUrl?`, `published`, `metaTitle?`, `metaDescription?` |
| `collectionUpdateSchema` | `collections.update` | Same as create + `id` |
| `collectionModifyProductSchema` | `addProduct`, `removeProduct` | `collectionId`, `productId` |
| `collectionProductOrderSchema` | `updateProductOrder` | `collectionId`, `productIds: string[]` |
| `collectionCollectionOrderSchema` | `updateCollectionOrder` | `string[]` |

`CollectionFormData` is the inferred TypeScript type from `collectionFormSchema` and is used by the admin form component (`collection-form.tsx`). It extends the create schema with `imageFile?: File` and `productIds: string[]` for client-side form state.

---

## Templates

The storefront renders collections using template-specific components. Each template must implement both a listing page and a detail page.

### Implemented templates

| Template | Listing component | Detail component |
|---|---|---|
| Default | `default-collections-page.tsx` | `default-collection-page.tsx` |
| Happy Bamboo | `happy-bamboo-collections-page.tsx` | `happy-bamboo-collection-page.tsx` |

Both live under `src/app/(storefront)/_templates/<template-name>/`.

### Template prop types

```ts
// src/app/(storefront)/_templates/types.ts

export type DefaultCollectionsPageTemplateProps = {
  collections: RouterOutputs["collections"]["getAllPublic"];
};

export type DefaultCollectionPageTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  collection: NonNullable<RouterOutputs["collections"]["getBySlug"]>;
  additionalCollections: RouterOutputs["collections"]["getAllPublic"];
};
```

When adding a new storefront template to the project, both `CollectionsPage` and `CollectionPage` components must be created and wired into the template's routing layer.

---

## WooCommerce Import Integration

The product import wizard at `/admin/products/import` supports migrating collections automatically from WooCommerce exports.

When the **"Create collections from categories"** checkbox is enabled, the importer (`src/lib/woocommerce/product-importer.ts`) will:

1. Read the `categories` column from the WooCommerce CSV
2. Upsert a `Collection` row for each unique category name (slug auto-generated)
3. Link each product to its category collections via `CollectionProduct.createMany`

This works for both simple and variable products. Duplicate products in the same collection are skipped gracefully.

---

## Upcoming / Planned Changes

| Feature | Status | Notes |
|---|---|---|
| Drag-and-drop product ordering | Backend done, UI pending | `updateProductOrder` is implemented and tested; needs a drag handle UI in `collection-form.tsx` |
| Drag-and-drop collection ordering | Backend done, UI pending | `updateCollectionOrder` is implemented; needs a drag handle UI on the collections list page |
| Additional template support | Ongoing | Every new storefront template added to the project requires its own `CollectionsPage` and `CollectionPage` components |
| Collection-specific landing pages | Planned | Per-template custom designs for individual collection pages, beyond the shared default layout |
| Native image upload for collections | Planned | The collection form currently accepts an image URL; native file upload via the upload refactor (see `upload-button.tsx` / `upload-dropzone.tsx`) is a candidate for a future iteration |
