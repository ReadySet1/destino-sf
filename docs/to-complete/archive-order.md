## ✅ COMPLETED: Archive Orders for Admin Users

### Overview

This feature allows admin users to archive (hide) testing orders and other orders they want to remove from the main orders list without permanently deleting them from the database. This provides a reversible way to clean up the orders interface while maintaining data integrity.

**Status: ✅ IMPLEMENTED**  
**Implementation Date: July 2025**  
**Documentation: See `docs/features/archive-orders-implementation.md`**

### 1. Database Schema Changes

#### Add Archive Fields to Existing Tables (Recommended)

Add the following fields to both `orders` and `catering_orders` tables:

sql

```sql
-- For orders table
ALTER TABLE orders ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN archived_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN archived_by STRING (UUID);
ALTER TABLE orders ADD COLUMN archive_reason STRING;

-- For catering_orders table
ALTER TABLE catering_orders ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE catering_orders ADD COLUMN archived_at TIMESTAMP;
ALTER TABLE catering_orders ADD COLUMN archived_by STRING (UUID);
ALTER TABLE catering_orders ADD COLUMN archive_reason STRING;

-- Add indexes for performance
CREATE INDEX idx_orders_is_archived ON orders(is_archived);
CREATE INDEX idx_catering_orders_is_archived ON catering_orders(is_archived);
```

### 2. Prisma Schema Updates

Update the Prisma schema to include the new fields:

prisma

```prisma
model Order {
  // ... existing fields ...

  // Archive fields
  isArchived    Boolean   @default(false) @map("is_archived")
  archivedAt    DateTime? @map("archived_at")
  archivedBy    String?   @db.Uuid @map("archived_by")
  archiveReason String?   @map("archive_reason")
  archivedByUser Profile? @relation("ArchivedOrders", fields: [archivedBy], references: [id])

  @@index([isArchived])
}

model CateringOrder {
  // ... existing fields ...

  // Archive fields
  isArchived    Boolean   @default(false) @map("is_archived")
  archivedAt    DateTime? @map("archived_at")
  archivedBy    String?   @db.Uuid @map("archived_by")
  archiveReason String?   @map("archive_reason")
  archivedByUser Profile? @relation("ArchivedCateringOrders", fields: [archivedBy], references: [id])

  @@index([isArchived])
}

model Profile {
  // ... existing fields ...
  archivedOrders         Order[]         @relation("ArchivedOrders")
  archivedCateringOrders CateringOrder[] @relation("ArchivedCateringOrders")
}
```

### 3. Backend Implementation

#### 3.1 Server Actions (`src/app/actions/orders.ts`)

Add new server actions for archiving functionality:

typescript

```typescript
// Archive single order
async function archiveOrder(
  orderId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }>;

// Archive multiple orders
async function archiveBulkOrders(
  orderIds: string[],
  reason?: string
): Promise<{ success: boolean; count: number; errors?: string[] }>;

// Unarchive order
async function unarchiveOrder(orderId: string): Promise<{ success: boolean; error?: string }>;

// Get archived orders
async function getArchivedOrders(params: {
  page?: number;
  search?: string;
  type?: 'all' | 'regular' | 'catering';
}): Promise<ArchivedOrdersResponse>;
```

#### 3.2 API Routes (Optional)

Create API endpoints if needed for external integrations:

- `POST /api/admin/orders/archive`
- `POST /api/admin/orders/unarchive`
- `GET /api/admin/orders/archived`

### 4. Frontend Implementation

#### 4.1 Update Orders Table UI

Modify `OrdersTable.tsx` to include archive actions:

1. Single Order Archive

   :
   - Add "Archive" button in the Actions column
   - Show confirmation dialog with optional reason input
   - Display success/error toast notifications

2. Bulk Archive

   :
   - Add checkbox column for multi-select
   - Add bulk actions toolbar when items are selected
   - Include "Archive Selected" button

3. Visual Indicators

   :
   - Different styling for orders marked for archiving
   - Loading states during archive operations

#### 4.2 Add Archive Filters

Update `OrderFilters.tsx` to include:

- Toggle to show/hide archived orders
- Filter by archive reason
- Filter by archive date range

#### 4.3 Create Archived Orders View

New page at `/admin/orders/archived` with:

- List of all archived orders
- Ability to unarchive orders
- View archive metadata (who, when, why)
- Export archived orders functionality

### 5. Testing Order Detection

Implement smart detection of testing orders based on:

1. Email Patterns
   - Common test email patterns (test@, demo@, example@)
   - Temporary email services
   - Plus addressing patterns (+test)

2. Order Patterns
   - Repeated orders from same email in short time
   - Orders with specific test product names
   - Orders with $0.00 or $0.01 amounts
   - Orders with specific notes/comments

3. Payment Patterns
   - Test card numbers (if stored)
   - Failed payment attempts
   - Specific payment methods marked as test

### 6. Automation Features

#### 6.1 Auto-Archive Rules

Create configurable rules to automatically archive orders:

- Orders older than X days with specific criteria
- Orders matching test patterns
- Failed payment orders after X days

#### 6.2 Scheduled Tasks

- Daily/weekly job to identify and suggest orders for archiving
- Email digest to admins with archiving suggestions

### 7. Security & Permissions

1. Role-Based Access
   - Only ADMIN role can archive/unarchive orders
   - Add audit log for all archive operations

2. Data Protection

   :
   - Archived orders remain in database (soft delete)
   - All relationships maintained
   - Can be restored anytime

### 8. Migration & Rollout Strategy

1. Phase 1

   : Database migration
   - Add archive fields
   - Create indexes
   - Update Prisma schema

2. Phase 2

   : Backend implementation
   - Implement server actions
   - Add validation and error handling
   - Create automated tests

3. Phase 3

   : Frontend implementation
   - Update orders table UI
   - Add archive management pages
   - Implement filtering

4. Phase 4

   : Automation
   - Implement auto-detection
   - Add scheduled tasks
   - Create admin notifications

### 9. Performance Considerations

1. Query Optimization

   :
   - Default queries exclude archived orders (`WHERE is_archived = false`)
   - Separate indexes for archived status
   - Consider partitioning for very large datasets

2. Caching Strategy

   :
   - Cache archived order counts
   - Invalidate cache on archive/unarchive operations

### 10. Monitoring & Analytics

1. Metrics to Track

   :
   - Number of archived orders over time
   - Archive/unarchive frequency
   - Most common archive reasons
   - Performance impact of archive filtering

2. Admin Dashboard Widget

   :
   - Show archive statistics
   - Quick access to recent archives
   - Alerts for unusual patterns

### 11. Future Enhancements

1. Bulk Operations UI

   :
   - Advanced search and filter before archiving
   - Archive by date range
   - Archive by customer

2. Export Features

   :
   - Export archived orders to CSV/Excel
   - Scheduled reports of archived data

3. Integration with Existing Tools

   :
   - Update the `clean-testing-orders.ts` script to use archive instead of delete
   - Integration with Square/payment systems for test order detection

This comprehensive plan provides a robust, scalable solution for archiving orders while maintaining data integrity and providing excellent user experience for administrators.
