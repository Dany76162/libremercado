-- Migration: add sales_mode column to products table
-- Run this on your Railway PostgreSQL database

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sales_mode TEXT NOT NULL DEFAULT 'retail';

-- Verify it worked
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'sales_mode';
