# Archive Orders Feature Implementation

## Overview

The Archive Orders feature allows admin users to hide testing orders and other orders they want to remove from the main orders list without permanently deleting them from the database. This provides a reversible way to clean up the orders interface while maintaining data integrity.

## Implementation Summary

### ✅ Completed Features

1. **Database Schema Changes**
   - Added archive fields to both `Order` and `CateringOrder` tables
   - Added proper indexes for performance
   - Added foreign key relationships to track who archived orders

2. **Backend Server Actions**
   - `archiveOrder()` - Archive a single regular order
   - `archiveCateringOrder()` - Archive a single catering order
   - `archiveBulkOrders()` - Archive multiple orders at once
   - `unarchiveOrder()` - Restore a single regular order
   - `unarchiveCateringOrder()` - Restore a single catering order
   - `getArchivedOrders()` - Fetch archived orders with filtering and pagination

3. **Frontend Components**
   - Updated main orders page to exclude archived orders by default
   - Added archive buttons to individual orders
   - Added bulk selection and archive functionality
   - Created dedicated archived orders page (`/admin/orders/archived`)
   - Added comprehensive filtering for archived orders

4. **Security & Permissions**
   - All archive operations require ADMIN role
   - Proper authentication checks on all server actions
   - Audit trail of who archived what and when

## Database Schema

### Order Table Changes
```sql
ALTER TABLE orders ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN archived_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN archived_by STRING (UUID);
ALTER TABLE orders ADD COLUMN archive_reason STRING;
CREATE INDEX idx_orders_is_archived ON orders(is_archived);
```

### CateringOrder Table Changes
```sql
ALTER TABLE catering_orders ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE catering_orders ADD COLUMN archived_at TIMESTAMP;
ALTER TABLE catering_orders ADD COLUMN archived_by STRING (UUID);
ALTER TABLE catering_orders ADD COLUMN archive_reason STRING;
CREATE INDEX idx_catering_orders_is_archived ON catering_orders(is_archived);
```

## API Endpoints

### Server Actions (src/app/actions/orders.ts)

#### Archive Single Order
```typescript
archiveOrder(orderId: string, reason?: string): Promise<{ success: boolean; error?: string }>
```

#### Archive Single Catering Order
```typescript
archiveCateringOrder(orderId: string, reason?: string): Promise<{ success: boolean; error?: string }>
```

#### Bulk Archive Orders
```typescript
archiveBulkOrders(orderIds: string[], reason?: string): Promise<{ success: boolean; count: number; errors?: string[] }>
```

#### Unarchive Order
```typescript
unarchiveOrder(orderId: string): Promise<{ success: boolean; error?: string }>
```

#### Unarchive Catering Order
```typescript
unarchiveCateringOrder(orderId: string): Promise<{ success: boolean; error?: string }>
```

#### Get Archived Orders
```typescript
getArchivedOrders(params: {
  page?: number;
  search?: string;
  type?: 'all' | 'regular' | 'catering';
  reason?: string;
  archivedBy?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{
  success: boolean;
  orders: any[];
  totalCount: number;
  totalPages: number;
  error?: string;
}>
```

## Frontend Pages

### Main Orders Page (`/admin/orders`)
- **Updated to exclude archived orders by default**
- Added "View Archived Orders" link
- Added individual archive buttons for each order
- Added bulk selection with archive functionality
- Archive confirmation dialog with optional reason

### Archived Orders Page (`/admin/orders/archived`)
- **New dedicated page for managing archived orders**
- Comprehensive filtering:
  - Search by order ID, customer name, email
  - Filter by order type (regular/catering)
  - Filter by archive reason
  - Filter by who archived the order
  - Date range filtering
- Unarchive functionality for each order
- Pagination support
- Archive metadata display (who, when, why)

## User Interface Features

### Archive Confirmation Dialog
- Confirmation before archiving
- Optional reason field
- Clear explanation of what archiving does

### Bulk Archive Functionality
- Checkbox selection for multiple orders
- Bulk actions toolbar when orders are selected
- Bulk archive confirmation dialog
- Progress feedback during bulk operations

### Archive Metadata Display
- Shows who archived the order
- Shows when it was archived
- Shows the archive reason
- Formatted timestamps

### Filtering and Search
- Real-time search across order details
- Multiple filter types
- Active filter indicators
- Clear filters functionality

## Security Features

### Authentication & Authorization
- All archive operations require valid authentication
- Only users with ADMIN role can archive/unarchive orders
- Proper error handling for unauthorized access

### Data Integrity
- Soft delete approach (no data is actually deleted)
- All relationships maintained
- Orders can be restored at any time
- Audit trail preserved

### Rate Limiting
- Bulk operations limited to 100 orders at once
- Prevents abuse of the system

## Testing

### Schema Tests
- Verified database schema changes work correctly
- Tested archive/unarchive operations
- Confirmed proper indexing
- Validated foreign key relationships

### Test Scripts
- `scripts/test-archive-schema.ts` - Tests database schema functionality
- Comprehensive test coverage of all archive operations

## Performance Considerations

### Database Optimization
- Added indexes on `is_archived` columns
- Efficient queries that exclude archived orders by default
- Pagination for large datasets

### Caching Strategy
- Revalidate relevant paths after archive operations
- Cache invalidation for order lists

## Future Enhancements

### Planned Features
1. **Auto-Archive Rules**
   - Configurable rules for automatic archiving
   - Time-based archiving (e.g., archive orders older than X days)
   - Pattern-based archiving (e.g., test email patterns)

2. **Export Functionality**
   - Export archived orders to CSV/Excel
   - Scheduled reports of archived data

3. **Advanced Analytics**
   - Archive statistics dashboard
   - Most common archive reasons
   - Archive trends over time

4. **Integration with Existing Tools**
   - Update cleanup scripts to use archive instead of delete
   - Integration with Square for test order detection

## Usage Instructions

### For Administrators

#### Archiving Individual Orders
1. Navigate to `/admin/orders`
2. Find the order you want to archive
3. Click the "Archive" button
4. Optionally enter a reason for archiving
5. Confirm the action

#### Bulk Archiving Orders
1. Navigate to `/admin/orders`
2. Select multiple orders using checkboxes
3. Click "Archive Selected" in the toolbar
4. Optionally enter a reason for archiving
5. Confirm the action

#### Viewing Archived Orders
1. Navigate to `/admin/orders/archived`
2. Use filters to find specific archived orders
3. View archive metadata (who, when, why)

#### Restoring Archived Orders
1. Navigate to `/admin/orders/archived`
2. Find the order you want to restore
3. Click the "Unarchive" button
4. The order will be restored to the main orders list

### Filtering Archived Orders
- **Search**: Search by order ID, customer name, or email
- **Type**: Filter by regular orders or catering orders
- **Reason**: Search by archive reason
- **Archived By**: Filter by who archived the order
- **Date Range**: Filter by archive date

## Technical Notes

### Database Migrations
The schema changes were applied using `prisma db push` to avoid migration conflicts. In production, consider creating a proper migration file.

### Error Handling
All archive operations include comprehensive error handling:
- Validation of input parameters
- Database constraint checks
- Authentication and authorization checks
- User-friendly error messages

### Performance Monitoring
Monitor the following metrics:
- Archive/unarchive operation frequency
- Query performance on archived orders
- Storage usage for archived data
- User adoption of the feature

## Conclusion

The Archive Orders feature provides a robust, secure, and user-friendly way to manage order visibility while maintaining data integrity. The implementation follows best practices for security, performance, and user experience, and provides a solid foundation for future enhancements. 