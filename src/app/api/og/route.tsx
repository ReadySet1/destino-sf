import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    return new ImageResponse(
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
            backgroundImage: 'linear-gradient(to bottom right, #4F46E5, #7C3AED)',
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
              borderRadius: '20px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h1
              style={{
                fontSize: 60,
                fontWeight: 'bold',
                background: 'linear-gradient(to right, #4F46E5, #7C3AED)',
                backgroundClip: 'text',
                color: 'transparent',
                margin: 0,
                marginBottom: 20,
              }}
            >
              Destino SF
            </h1>
            <p
              style={{
                fontSize: 30,
                color: '#4B5563',
                margin: 0,
              }}
            >
              Your favorite San Francisco restaurant
            </p>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
