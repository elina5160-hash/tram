
-- Flatten orders table structure for easier integration
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS customer_phone text,
ADD COLUMN IF NOT EXISTS customer_email text,
ADD COLUMN IF NOT EXISTS delivery_address text,
ADD COLUMN IF NOT EXISTS order_items_text text;
