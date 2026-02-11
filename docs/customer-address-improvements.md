# Customer and Address Management Improvements

## Overview

This document describes the improvements made to customer and shipping address handling in relation to orders. The changes ensure data consistency, prevent duplicates, and enable proper order history tracking for both guest and authenticated users.

## Problems Solved

### 1. Customer Creation Issues
- **Before**: Webhook used non-existent `individual_name` field, causing names to default to "Guest"
- **After**: Uses correct `customer_details.name` field from Stripe
- **Before**: Manual orders failed if customer didn't exist (tried to connect to non-existent customer)
- **After**: Customer is upserted automatically before order creation

### 2. Customer Metrics Never Updated
- **Before**: `totalSpent` and `orderCount` always remained at 0
- **After**: Metrics are updated when orders are paid (both Stripe and manual orders)

### 3. Address Duplication
- **Before**: New address created for every order, even if identical
- **After**: Addresses are normalized and deduplicated, existing addresses are reused

### 4. Guest vs Authenticated User Orders
- **Before**: No connection between guest orders and user accounts
- **After**: Customers can be linked to users, enabling unified order history

## Schema Changes

### Customer Model
Added `userId` field to link customers with authenticated users:

```prisma
model Customer {
  // ... existing fields ...
  
  // Link to authenticated user (if they've signed in)
  userId String?
  user   User? @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  @@index([userId])
}
```

### User Model
Added relation to customers:

```prisma
model User {
  // ... existing fields ...
  
  customers Customer[]
}
```

## New Utilities

### `src/lib/address-utils.ts`

Shared utilities for address handling:

- **`normalizeAddress()`**: Normalizes address fields for comparison (lowercase, trim whitespace)
- **`findOrCreateShippingAddress()`**: Finds existing matching address or creates new one with deduplication

### `src/lib/customer-linking.ts`

Helper for linking customers to users:

- **`linkCustomerToUser()`**: Links a customer account to user when they share the same email
- Safe handling of already-linked customers
- Prevents overriding existing links

## API Changes

### New Router: `customer`

#### `customer.getMyProfile`
Get customer profile for authenticated user including shipping addresses.

```typescript
const profile = await api.customer.getMyProfile.useQuery();
// Returns: Customer with shippingAddresses[]
```

#### `customer.getMyOrders`
Get order history for authenticated user.

```typescript
const orders = await api.customer.getMyOrders.useQuery();
// Returns: Order[] with items and shippingAddress
```

#### `customer.getOrdersByEmail`
Public endpoint to lookup orders by email (for guest order status checking).

```typescript
const orders = await api.customer.getOrdersByEmail.useQuery({
  email: "customer@example.com"
});
// Returns: Up to 10 most recent orders
```

#### `customer.linkToUser`
Manually link customer account to authenticated user.

```typescript
const customer = await api.customer.linkToUser.useMutation();
// Links customer with user's email to their account
```

### Updated: `order.createManual`

Manual order creation now:
- Upserts customer automatically (no more failures)
- Reuses matching addresses via deduplication
- Falls back to default address if no address provided
- Updates customer metrics when order is marked as paid

### Updated: `order.updateStatus`

Status updates now:
- Update customer metrics when transitioning from unpaid to paid
- Ensures metrics are only incremented once

## Webhook Improvements

### Stripe Webhook (`src/app/api/webhooks/stripe/route.ts`)

1. **Correct Name Parsing**
   - Uses `customer_details.name` instead of non-existent `individual_name`
   - Properly splits into firstName/lastName

2. **Customer Upsert**
   - Always creates/updates customer before order
   - Updates phone number if provided
   - Automatically links to User if one exists with matching email

3. **Address Deduplication**
   - Uses `findOrCreateShippingAddress` utility
   - Prevents duplicate addresses
   - First address marked as `isDefault`

4. **Customer Metrics**
   - Updates `totalSpent` and `orderCount` after successful order
   - Wrapped in try-catch to not fail webhook if update fails

5. **Better Error Handling**
   - Guards against null customer before creating address
   - Logs warnings instead of failing silently
   - Continues webhook processing even if optional steps fail

## Address Deduplication Logic

### How It Works

1. **Normalization**: Address fields are normalized for comparison
   ```typescript
   normalize("123 Main St") === normalize("123 MAIN ST")
   normalize("02134") !== normalize("02134-1234")  // ZIP+4 is different
   ```

2. **Matching**: Compares normalized strings
   - address1, city, province, zip, country
   - Ignores address2, company, phone (not part of uniqueness)

3. **Reuse or Create**:
   - If match found: Return existing address ID
   - If no match: Create new address
   - First address for customer: Mark as `isDefault`

### Example Flow

```
Customer makes first order:
  → Address "123 Main St, Boston, MA 02134" created (isDefault: true)

Customer makes second order to same address:
  → Existing address reused (no duplicate created)

Customer makes third order to different address:
  → New address "456 Oak Ave, Cambridge, MA 02139" created (isDefault: false)

Customer makes fourth order back to first address:
  → Original address reused again
```

## Customer-User Linking

### Automatic Linking

1. **During Webhook Processing**
   - When customer is created/updated
   - Checks if User exists with same email in business
   - Links automatically via `userId` field

2. **On User Sign-Up/Login**
   - Can call `linkCustomerToUser` utility
   - Links existing customer orders to new user account

### Manual Linking

For cases where automatic linking didn't occur:

```typescript
import { linkCustomerToUser } from "~/lib/customer-linking";

// After user signs in
await linkCustomerToUser({
  userId: user.id,
  email: user.email,
  businessId: user.businessId,
});
```

### Viewing Order History

Once linked, users can view their complete order history:

```typescript
// In a React component
const { data: orders } = api.customer.getMyOrders.useQuery();

orders?.map(order => (
  <div key={order.id}>
    Order #{order.orderNumber} - {order.total / 100}
  </div>
));
```

## Migration Required

Before deploying, run the database migration:

```bash
pnpm prisma migrate dev --name add_customer_user_link
```

This adds:
- `userId` field to Customer model
- `customers` relation to User model
- Index on `Customer.userId`

## Testing

See `docs/customer-address-testing.md` for comprehensive test plan.

Key scenarios to test:
1. First-time customer purchase via Stripe
2. Repeat customer purchase (verify deduplication)
3. Manual order for new customer
4. Guest purchase → user sign-up → order history access
5. Address reuse across multiple orders

## Backwards Compatibility

### Existing Data

- Existing customers: Continue to work, `userId` will be null until linked
- Existing addresses: No migration needed, will be deduplicated going forward
- Existing orders: Continue to work normally

### Migration Path

For existing data, you may want to run a one-time script to:

1. Link existing customers to users by matching email
2. Mark oldest address per customer as `isDefault`
3. Backfill customer metrics from order history

Example script outline:

```typescript
// Link customers to users
const customers = await db.customer.findMany({
  where: { userId: null }
});

for (const customer of customers) {
  const user = await db.user.findFirst({
    where: {
      email: customer.email,
      businessId: customer.businessId,
    }
  });
  
  if (user) {
    await db.customer.update({
      where: { id: customer.id },
      data: { userId: user.id }
    });
  }
}

// Backfill customer metrics
const customersToUpdate = await db.customer.findMany({
  where: {
    OR: [
      { totalSpent: 0 },
      { orderCount: 0 },
    ]
  },
  include: { orders: true }
});

for (const customer of customersToUpdate) {
  const paidOrders = customer.orders.filter(
    o => o.status === 'paid' || o.paymentStatus === 'paid'
  );
  
  await db.customer.update({
    where: { id: customer.id },
    data: {
      totalSpent: paidOrders.reduce((sum, o) => sum + o.total, 0),
      orderCount: paidOrders.length,
    }
  });
}
```

## Monitoring

### Logs to Watch

- `[Webhook] Customer upserted: {id} ({email})` - Customer creation/update
- `[Address] Reusing existing address: {id}` - Address deduplication working
- `[Address] Created new address: {id} (default: {bool})` - New address created
- `[Webhook] Updated customer metrics for {email}` - Metrics update success
- `[Customer Link] Successfully linked customer {id} to user {id}` - Automatic linking

### Metrics to Monitor

- Customer creation rate
- Address reuse rate (should increase over time)
- Average addresses per customer (should stabilize)
- Customer-user linking success rate

## Future Enhancements

Potential improvements to consider:

1. **Address Validation**
   - Integrate with address validation API (e.g., USPS, Google)
   - Prevent invalid addresses at input

2. **Customer Preferences**
   - Allow customers to set preferred default address
   - Manage multiple saved addresses in UI

3. **Address Suggestions**
   - Suggest existing addresses during checkout
   - Reduce duplicate entry

4. **Bulk Operations**
   - Admin tools to merge duplicate customers
   - Bulk address cleanup utilities

5. **Analytics**
   - Customer lifetime value tracking
   - Shipping address heatmaps
   - Repeat purchase analysis
