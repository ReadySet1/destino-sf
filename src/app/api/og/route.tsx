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

    const fontData = await fetch(
      'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
    ).then(res => res.arrayBuffer());

    const response = new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            background: 'linear-gradient(to bottom right, #4F46E5, #7C3AED)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'white',
              padding: '40px 60px',
              margin: '40px',
              borderRadius: '20px',
              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
              width: '80%',
            }}
          >
            <h1
              style={{
                fontSize: 72,
                fontWeight: 'bold',
                color: '#4F46E5',
                margin: '0 0 20px 0',
                textAlign: 'center',
                lineHeight: 1.2,
                fontFamily: 'Inter',
              }}
            >
              {title}
            </h1>
            <p
              style={{
                fontSize: 32,
                color: '#4B5563',
                margin: 0,
                textAlign: 'center',
                lineHeight: 1.4,
                fontFamily: 'Inter',
              }}
            >
              {description}
            </p>
          </div>
        </div>
      ),
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
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
