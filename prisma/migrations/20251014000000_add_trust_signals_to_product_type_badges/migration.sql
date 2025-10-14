-- AlterTable: Add trust signal columns to product_type_badges table
-- This extends the existing badge system with customizable trust signals
-- Trust signals are displayed below the "You Might Also Like" section on product pages

ALTER TABLE "product_type_badges"
ADD COLUMN "trust_signal1_title" VARCHAR(100) NOT NULL DEFAULT 'Fresh Ingredients',
ADD COLUMN "trust_signal1_desc" TEXT NOT NULL DEFAULT 'Made with premium, locally-sourced ingredients',
ADD COLUMN "trust_signal1_icon" VARCHAR(50) NOT NULL DEFAULT 'leaf',
ADD COLUMN "trust_signal1_icon_color" VARCHAR(20) NOT NULL DEFAULT 'green',
ADD COLUMN "trust_signal1_bg_color" VARCHAR(20) NOT NULL DEFAULT 'green-100',

ADD COLUMN "trust_signal2_title" VARCHAR(100) NOT NULL DEFAULT 'Flash Frozen',
ADD COLUMN "trust_signal2_desc" TEXT NOT NULL DEFAULT 'Locks in freshness and flavor',
ADD COLUMN "trust_signal2_icon" VARCHAR(50) NOT NULL DEFAULT 'thermometer',
ADD COLUMN "trust_signal2_icon_color" VARCHAR(20) NOT NULL DEFAULT 'blue',
ADD COLUMN "trust_signal2_bg_color" VARCHAR(20) NOT NULL DEFAULT 'blue-100',

ADD COLUMN "trust_signal3_title" VARCHAR(100) NOT NULL DEFAULT 'Quick & Easy',
ADD COLUMN "trust_signal3_desc" TEXT NOT NULL DEFAULT 'Ready in just 15-20 minutes',
ADD COLUMN "trust_signal3_icon" VARCHAR(50) NOT NULL DEFAULT 'clock',
ADD COLUMN "trust_signal3_icon_color" VARCHAR(20) NOT NULL DEFAULT 'orange',
ADD COLUMN "trust_signal3_bg_color" VARCHAR(20) NOT NULL DEFAULT 'orange-100';

-- Add comments for documentation
COMMENT ON COLUMN "product_type_badges"."trust_signal1_title" IS 'Title for first trust signal (e.g., "Fresh Ingredients")';
COMMENT ON COLUMN "product_type_badges"."trust_signal1_desc" IS 'Description for first trust signal';
COMMENT ON COLUMN "product_type_badges"."trust_signal1_icon" IS 'Icon name for first trust signal (lucide-react icon name)';
COMMENT ON COLUMN "product_type_badges"."trust_signal1_icon_color" IS 'Icon color for first trust signal (e.g., "green", "blue")';
COMMENT ON COLUMN "product_type_badges"."trust_signal1_bg_color" IS 'Background color for first trust signal icon container (e.g., "green-100")';

COMMENT ON COLUMN "product_type_badges"."trust_signal2_title" IS 'Title for second trust signal';
COMMENT ON COLUMN "product_type_badges"."trust_signal2_desc" IS 'Description for second trust signal';
COMMENT ON COLUMN "product_type_badges"."trust_signal2_icon" IS 'Icon name for second trust signal';
COMMENT ON COLUMN "product_type_badges"."trust_signal2_icon_color" IS 'Icon color for second trust signal';
COMMENT ON COLUMN "product_type_badges"."trust_signal2_bg_color" IS 'Background color for second trust signal';

COMMENT ON COLUMN "product_type_badges"."trust_signal3_title" IS 'Title for third trust signal';
COMMENT ON COLUMN "product_type_badges"."trust_signal3_desc" IS 'Description for third trust signal';
COMMENT ON COLUMN "product_type_badges"."trust_signal3_icon" IS 'Icon name for third trust signal';
COMMENT ON COLUMN "product_type_badges"."trust_signal3_icon_color" IS 'Icon color for third trust signal';
COMMENT ON COLUMN "product_type_badges"."trust_signal3_bg_color" IS 'Background color for third trust signal';
