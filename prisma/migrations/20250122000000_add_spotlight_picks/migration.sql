-- Create spotlight_picks table
CREATE TABLE spotlight_picks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  position INTEGER NOT NULL UNIQUE CHECK (position >= 1 AND position <= 4),
  product_id UUID REFERENCES "Product"(id) ON DELETE SET NULL,
  custom_title VARCHAR(255),
  custom_description TEXT,
  custom_image_url TEXT,
  custom_price DECIMAL(10,2),
  is_custom BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_spotlight_picks_updated_at
  BEFORE UPDATE ON spotlight_picks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_spotlight_picks_position ON spotlight_picks(position);
CREATE INDEX idx_spotlight_picks_active ON spotlight_picks(is_active);
CREATE INDEX idx_spotlight_picks_product_id ON spotlight_picks(product_id);

-- Insert default empty positions to ensure all 4 positions exist
INSERT INTO spotlight_picks (position, is_active, is_custom) VALUES 
(1, false, false),
(2, false, false),
(3, false, false),
(4, false, false)
ON CONFLICT (position) DO NOTHING;

-- Create function to get spotlight picks with product data
CREATE OR REPLACE FUNCTION get_spotlight_picks_with_products()
RETURNS TABLE (
  id UUID,
  position INTEGER,
  product_id UUID,
  custom_title VARCHAR(255),
  custom_description TEXT,
  custom_image_url TEXT,
  custom_price DECIMAL(10,2),
  is_custom BOOLEAN,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  product_name TEXT,
  product_description TEXT,
  product_images TEXT[],
  product_price DECIMAL(10,2),
  product_slug TEXT,
  category_name TEXT,
  category_slug TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.position,
    sp.product_id,
    sp.custom_title,
    sp.custom_description,
    sp.custom_image_url,
    sp.custom_price,
    sp.is_custom,
    sp.is_active,
    sp.created_at,
    sp.updated_at,
    p.name as product_name,
    p.description as product_description,
    p.images as product_images,
    p.price as product_price,
    p.slug as product_slug,
    c.name as category_name,
    c.slug as category_slug
  FROM spotlight_picks sp
  LEFT JOIN "Product" p ON sp.product_id = p.id
  LEFT JOIN "Category" c ON p."categoryId" = c.id
  ORDER BY sp.position;
END;
$$ LANGUAGE plpgsql; 