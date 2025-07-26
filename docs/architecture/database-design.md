# Database Design

## Overview

Destino SF uses PostgreSQL as the primary database with Prisma as the ORM. The database design follows modern best practices for e-commerce and catering applications.

## Core Tables

### Products
- **products**: Main product catalog
- **product_variants**: Product variations (size, options)
- **product_categories**: Hierarchical category system
- **product_images**: Product image management

### Orders
- **orders**: Customer orders with status tracking
- **order_items**: Individual items within orders
- **order_status_history**: Audit trail for order changes

### Catering System
- **catering_packages**: Package definitions for catering orders
- **delivery_zones**: Geographic delivery areas with pricing
- **minimum_order_requirements**: Zone-specific minimum order rules

### Users & Authentication
- **users**: Customer accounts and profiles
- **user_addresses**: Saved customer addresses
- **admin_users**: Staff and administrative accounts

## Key Features

### Indexing Strategy
- Composite indexes on frequently queried columns
- Optimized for catering order filtering by zone and date
- Performance indexes for product search and recommendations

### Data Integrity
- Foreign key constraints ensure referential integrity
- Check constraints for business rule enforcement
- Triggers for automatic audit logging

### Scalability Considerations
- Partitioning strategy for large order tables
- Archival system for historical data
- Optimized queries for real-time operations

## Schema Migration Strategy

All schema changes are managed through Prisma migrations with proper rollback procedures and staging environment testing.
