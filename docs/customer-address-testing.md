# Customer and Address Management - Test Plan

This document outlines the test scenarios needed to verify the customer and address management improvements.

## Test Categories

### 1. Webhook Customer Creation & Updates

#### Test: First-time customer purchase
- **Given**: A new email makes a purchase through Stripe
- **When**: Webhook receives checkout.session.completed
- **Then**: 
  - Customer record is created with correct email, first name, last name, phone
  - Customer metrics initialized (totalSpent = order total, orderCount = 1)
  - Customer is linked to User if user exists with same email

#### Test: Repeat customer purchase
- **Given**: An existing customer makes another purchase
- **When**: Webhook receives checkout.session.completed
- **Then**:
  - Existing customer record is updated (not duplicated)
  - Customer metrics are incremented correctly
  - First/last name and phone are updated if changed

#### Test: Customer with missing name fields
- **Given**: Stripe session with no customer name
- **When**: Webhook processes the session
- **Then**:
  - Customer is created with firstName = "Guest", lastName = ""
  - No errors are thrown

#### Test: Customer with missing email
- **Given**: Stripe session without customer email
- **When**: Webhook processes the session
- **Then**:
  - Order is created without customer link
  - Warning is logged
  - Webhook succeeds (doesn't throw error)

### 2. Shipping Address Deduplication

#### Test: First address for customer
- **Given**: New customer with no existing addresses
- **When**: Shipping address is created
- **Then**:
  - Address is created with isDefault = true
  - Address is linked to customer

#### Test: Duplicate address detection
- **Given**: Customer already has address "123 Main St, Boston, MA"
- **When**: Order placed to same address (with different casing/whitespace)
- **Then**:
  - Existing address is reused (no new record created)
  - Normalization handles case/whitespace differences

#### Test: New different address
- **Given**: Customer has existing address in Boston
- **When**: Order placed to different address in New York
- **Then**:
  - New address record is created
  - isDefault remains false for new address
  - Original default address unchanged

#### Test: Address normalization edge cases
- **Test variants**:
  - "123 Main St" vs "123 MAIN ST" → same
  - "02134" vs "02134-1234" → different
  - "Cambridge" vs " Cambridge " → same
- **Then**: Properly normalized and compared

### 3. Manual Order Creation

#### Test: New customer via manual order
- **Given**: Admin creates order for new email
- **When**: createManual mutation is called
- **Then**:
  - Customer record is created first
  - Shipping address is created/found
  - Order is created successfully
  - Customer metrics NOT updated (pending order)

#### Test: Existing customer via manual order
- **Given**: Customer exists from previous purchase
- **When**: Admin creates manual order for same email
- **Then**:
  - Existing customer is reused
  - Address deduplication is applied
  - Order links to existing customer

#### Test: Manual order with no shipping address provided
- **Given**: Manual order with shippingAddress = null
- **When**: createManual mutation is called
- **Then**:
  - Default address is used if exists
  - Error thrown if no default address found

#### Test: Manual order status update to paid
- **Given**: Pending manual order exists
- **When**: Admin updates status to "paid"
- **Then**:
  - Customer metrics are updated (totalSpent, orderCount)
  - Metrics are only incremented once (idempotent)

### 4. Customer-User Linking

#### Test: Guest purchase then user sign-up
- **Given**: Email makes guest purchase, then creates account with same email
- **When**: User signs up/logs in
- **Then**:
  - Customer record is linked to User via userId
  - Order history is accessible via customer.getMyOrders

#### Test: User purchase (already authenticated)
- **Given**: Logged-in user makes purchase
- **When**: Webhook processes checkout
- **Then**:
  - Customer is automatically linked to User (userId is set)
  - Future orders auto-link

#### Test: User with multiple business customers
- **Given**: User email exists in multiple businesses
- **When**: Querying customer data
- **Then**:
  - Only customer records for current business are returned
  - No cross-business data leakage

#### Test: Manual customer linking
- **Given**: User and customer exist separately with same email
- **When**: customer.linkToUser is called
- **Then**:
  - Customer userId is set
  - Order history becomes accessible

### 5. Order History Access

#### Test: Authenticated user order history
- **Given**: User has made 3 purchases
- **When**: customer.getMyOrders is called
- **Then**:
  - All 3 orders are returned
  - Orders include items and shipping address
  - Sorted by most recent first

#### Test: Guest order lookup by email
- **Given**: Guest made order with email
- **When**: customer.getOrdersByEmail is called
- **Then**:
  - Orders for that email are returned (max 10)
  - No authentication required (public endpoint)

#### Test: User with no orders
- **Given**: New user with no purchases
- **When**: customer.getMyOrders is called
- **Then**:
  - Empty array is returned
  - No errors thrown

### 6. Edge Cases & Error Handling

#### Test: Concurrent webhook processing
- **Given**: Two webhooks arrive for same customer simultaneously
- **When**: Both try to update customer metrics
- **Then**:
  - No race condition (database constraints prevent duplicates)
  - Both metrics updates succeed

#### Test: Customer delete cascade
- **Given**: Customer with orders and addresses exists
- **When**: Customer is deleted
- **Then**:
  - Shipping addresses are deleted (cascade)
  - Orders remain but with customerId = null (SetNull)

#### Test: Business delete cascade
- **Given**: Business with customers, orders, addresses
- **When**: Business is deleted
- **Then**:
  - All customers deleted
  - All orders deleted
  - All addresses deleted

## Integration Test Scenarios

### Scenario 1: Complete guest-to-user journey
1. Guest makes purchase (webhook creates customer, address, order)
2. Guest creates account with same email
3. Automatic linking occurs
4. User logs in and views order history
5. User makes another purchase (linked automatically)
6. User has complete order history

### Scenario 2: Manual order workflow
1. Admin creates manual order for new customer
2. Customer and address created automatically
3. Order starts in "pending" status
4. Admin marks as paid
5. Customer metrics updated
6. Customer receives confirmation

### Scenario 3: Address reuse across orders
1. Customer makes first order to home address
2. Address is saved as default
3. Customer makes second order to same address
4. Existing address is reused (no duplicate)
5. Customer makes third order to work address
6. New address is created (not default)
7. Customer makes fourth order to home address again
8. Original default address is reused

## Unit Test Files to Create

### `/tests/unit/address-utils.test.ts`
- normalizeAddress function
- findOrCreateShippingAddress logic
- Edge cases (null fields, special characters)

### `/tests/unit/customer-linking.test.ts`
- linkCustomerToUser function
- Already linked scenarios
- Different user conflict handling

### `/tests/integration/webhook.test.ts`
- Mock Stripe webhook payloads
- Customer creation/update
- Address deduplication
- Metrics updates

### `/tests/integration/manual-orders.test.ts`
- createManual mutation
- Customer upsert
- Address handling
- Status updates and metrics

### `/tests/integration/customer-router.test.ts`
- getMyProfile
- getMyOrders
- getOrdersByEmail
- linkToUser

## Performance Considerations

### Test: Large customer history
- **Given**: Customer with 100+ orders
- **When**: getMyOrders is called
- **Then**: Query completes in < 1s (add pagination if needed)

### Test: Address lookup performance
- **Given**: Customer with 20+ saved addresses
- **When**: Address deduplication runs
- **Then**: Query completes efficiently (indexed properly)

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test address-utils.test.ts

# Run integration tests only
pnpm test:integration

# Run with coverage
pnpm test:coverage
```

## Test Data Fixtures

Create fixtures for:
- Sample Stripe webhook payloads (successful checkout)
- Sample customer data (various name formats)
- Sample address data (various formats and normalizations)
- Sample user/customer linking scenarios
