-- Add missing inventory column to products table
ALTER TABLE products ADD COLUMN inventory INTEGER DEFAULT 0;

-- Rename isActive to active in categories table  
ALTER TABLE categories RENAME COLUMN "isActive" TO active;
