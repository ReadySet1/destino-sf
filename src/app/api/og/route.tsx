import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

// Note: We're removing the edge runtime directive since it conflicts with static generation
// Edge runtime will be inferred by Next.js based on ImageResponse usage

// Set response headers for better caching and content type specification
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || 'Destino SF';
    const description = searchParams.get('description') || 'Handcrafted Empanadas & Alfajores';
    const pageType = searchParams.get('type') || 'default';
    const bgColor = searchParams.get('bgColor') || '#f77c22';
    const textColor = searchParams.get('textColor') || '#ffffff';

    const fontData = await fetch(
      'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
    ).then(res => res.arrayBuffer());

    // Define different layouts based on page type
    const getLayout = (type: string) => {
      switch (type) {
        case 'catering':
          return {
            bg: 'linear-gradient(135deg, #2d3538 0%, #4a5568 100%)',
            accent: '#f77c22',
            icon: '🍽️',
          };
        case 'menu':
          return {
            bg: 'linear-gradient(135deg, #f77c22 0%, #ed8936 100%)',
            accent: '#ffffff',
            icon: '🥟',
          };
        case 'about':
          return {
            bg: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            accent: '#ffffff',
            icon: '👨‍🍳',
          };
        case 'contact':
          return {
            bg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            accent: '#ffffff',
            icon: '📍',
          };
        case 'product':
          return {
            bg: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
            accent: '#ffffff',
            icon: '🏷️',
          };
        default:
          return {
            bg: 'linear-gradient(135deg, #f77c22 0%, #ed8936 100%)',
            accent: '#ffffff',
            icon: '🍽️',
          };
      }
    };

    const layout = getLayout(pageType);

    const response = new ImageResponse(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: layout.bg,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '60px 80px',
            margin: '40px',
            borderRadius: '24px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
            border: `4px solid ${layout.accent}`,
            width: '85%',
            maxWidth: '900px',
          }}
        >
          {/* Icon */}
          <div
            style={{
              fontSize: 80,
              marginBottom: '20px',
              background: layout.accent,
              borderRadius: '50%',
              width: '120px',
              height: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '-20px',
            }}
          >
            {layout.icon}
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: Math.min(title.length > 50 ? 48 : 60, 60),
              fontWeight: 'bold',
              color: '#1a1a1a',
              margin: '0 0 24px 0',
              textAlign: 'center',
              lineHeight: 1.1,
              fontFamily: 'Inter',
              maxWidth: '100%',
            }}
          >
            {title}
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: Math.min(description.length > 100 ? 24 : 28, 28),
              color: '#4a5568',
              margin: '0 0 20px 0',
              textAlign: 'center',
              lineHeight: 1.4,
              fontFamily: 'Inter',
              maxWidth: '100%',
            }}
          >
            {description}
          </p>

          {/* Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '20px',
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: layout.accent === '#ffffff' ? '#f77c22' : layout.accent,
                fontFamily: 'Inter',
                background: layout.accent === '#ffffff' ? 'transparent' : 'rgba(255, 255, 255, 0.2)',
                padding: '8px 16px',
                borderRadius: '12px',
              }}
            >
              DestinoSF.com
            </div>
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Inter',
            data: fontData,
            style: 'normal',
            weight: 400,
          },
        ],
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

    // Add explicit content type and cache control headers
    response.headers.set('Content-Type', 'image/png');
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    response.headers.set('Access-Control-Allow-Origin', '*');

    return response;
  } catch (e: any) {
    console.log(`Failed to generate OpenGraph image: ${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
