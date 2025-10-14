import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db-unified';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;

    // Validate product type
    if (!['empanada', 'salsa', 'alfajor', 'other'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid product type' },
        { status: 400 }
      );
    }

    // Use raw query to ensure we get all fields including trust signals
    const result = await withRetry(
      () => prisma.$queryRaw<Array<{
        id: number;
        product_type: string;
        badge1: string;
        badge2: string;
        badge3: string | null;
        icon1: string;
        icon2: string;
        icon3: string | null;
        bg_color: string;
        text_color: string;
        trust_signal1_title: string;
        trust_signal1_desc: string;
        trust_signal1_icon: string;
        trust_signal1_icon_color: string;
        trust_signal1_bg_color: string;
        trust_signal2_title: string;
        trust_signal2_desc: string;
        trust_signal2_icon: string;
        trust_signal2_icon_color: string;
        trust_signal2_bg_color: string;
        trust_signal3_title: string;
        trust_signal3_desc: string;
        trust_signal3_icon: string;
        trust_signal3_icon_color: string;
        trust_signal3_bg_color: string;
        updated_at: Date;
      }>>`
        SELECT * FROM product_type_badges WHERE product_type = ${type}
      `,
      3,
      'fetch product type badges by type'
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Badges not found for this product type' },
        { status: 404 }
      );
    }

    const badges = result[0];

    // Return with camelCase field names including trust signals
    return NextResponse.json({
      id: badges.id,
      productType: badges.product_type,
      badge1: badges.badge1,
      badge2: badges.badge2,
      badge3: badges.badge3,
      icon1: badges.icon1,
      icon2: badges.icon2,
      icon3: badges.icon3,
      bgColor: badges.bg_color,
      textColor: badges.text_color,
      // Trust signals
      trustSignal1Title: badges.trust_signal1_title,
      trustSignal1Desc: badges.trust_signal1_desc,
      trustSignal1Icon: badges.trust_signal1_icon,
      trustSignal1IconColor: badges.trust_signal1_icon_color,
      trustSignal1BgColor: badges.trust_signal1_bg_color,
      trustSignal2Title: badges.trust_signal2_title,
      trustSignal2Desc: badges.trust_signal2_desc,
      trustSignal2Icon: badges.trust_signal2_icon,
      trustSignal2IconColor: badges.trust_signal2_icon_color,
      trustSignal2BgColor: badges.trust_signal2_bg_color,
      trustSignal3Title: badges.trust_signal3_title,
      trustSignal3Desc: badges.trust_signal3_desc,
      trustSignal3Icon: badges.trust_signal3_icon,
      trustSignal3IconColor: badges.trust_signal3_icon_color,
      trustSignal3BgColor: badges.trust_signal3_bg_color,
      updatedAt: badges.updated_at,
    });
  } catch (error) {
    console.error('Error fetching product type badges:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
