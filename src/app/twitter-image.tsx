import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const alt = 'Destino SF - Handcrafted Empanadas & Alfajores';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  try {
    // Load logo as base64
    const logoPath = path.join(process.cwd(), 'public/images/logo/logo-destino.png');
    const logoBuffer = await readFile(logoPath);
    const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;

    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 128,
            background: 'white',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 40,
          }}
        >
          <img src={logoBase64} width={500} height={130} alt="Destino SF Logo" />
          <div
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: '#004225',
              textAlign: 'center',
              maxWidth: '80%',
            }}
          >
            Handcrafted Empanadas & Alfajores
          </div>
        </div>
      ),
      {
        ...size,
      }
    );
  } catch (error) {
    console.error('Error generating Twitter image:', error);

    // Fallback image without logo
    return new ImageResponse(
      (
        <div
          style={{
            fontSize: 128,
            background: 'white',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 40,
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 'bold',
              color: '#004225',
              textAlign: 'center',
              maxWidth: '80%',
            }}
          >
            Destino SF
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: '#004225',
              textAlign: 'center',
              maxWidth: '80%',
            }}
          >
            Handcrafted Empanadas & Alfajores
          </div>
        </div>
      ),
      {
        ...size,
      }
    );
  }
}
