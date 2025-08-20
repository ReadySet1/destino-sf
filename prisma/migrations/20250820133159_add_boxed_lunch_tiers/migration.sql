-- Migration: add_boxed_lunch_tiers
-- Creates boxed lunch tier configuration for Build Your Own Box feature

-- Add new category for boxed lunch entrees if not exists
INSERT INTO categories (id, name, description, "order", active, slug, "squareId")
VALUES (
  gen_random_uuid(),
  'CATERING- BOXED LUNCH ENTREES',
  'Build Your Own Box Entrees',
  15,
  true,
  'catering-boxed-lunch-entrees',
  NULL -- Will be populated by Square sync
) ON CONFLICT (name) DO NOTHING;

-- Create index for faster boxed lunch queries if not exists
CREATE INDEX IF NOT EXISTS idx_products_category_active 
ON products("categoryId", active);

-- Create table for boxed lunch tier configurations
CREATE TABLE IF NOT EXISTS boxed_lunch_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_number INTEGER NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  price_cents INTEGER NOT NULL,
  protein_amount VARCHAR(50),
  sides JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert tier configurations
INSERT INTO boxed_lunch_tiers (tier_number, name, price_cents, protein_amount, sides) VALUES
(1, 'Tier #1', 1400, '6oz protein', '["4oz Arroz Rojo", "4oz Sautéed Veggies"]'),
(2, 'Tier #2', 1500, '6oz protein', '["4oz Chipotle Potatoes", "4oz Kale"]'),
(3, 'Tier #3', 1700, '8oz protein', '["4oz Sautéed Veggies", "4oz Chipotle Potatoes"]')
ON CONFLICT (tier_number) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  protein_amount = EXCLUDED.protein_amount,
  sides = EXCLUDED.sides;

-- Create index on tier_number for performance
CREATE INDEX IF NOT EXISTS idx_boxed_lunch_tiers_tier_number 
ON boxed_lunch_tiers(tier_number);

-- Create index on active field for filtering
CREATE INDEX IF NOT EXISTS idx_boxed_lunch_tiers_active 
ON boxed_lunch_tiers(active);
