import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function GET() {
  // Usar directamente las variables de entorno
  const useSandbox = process.env.USE_SQUARE_SANDBOX === 'true';
  const accessToken = useSandbox 
    ? process.env.SQUARE_SANDBOX_TOKEN
    : process.env.SQUARE_ACCESS_TOKEN;
  
  // ¡IMPORTANTE! El dominio correcto de Sandbox es sandbox.squareup.com
  const apiHost = useSandbox 
    ? 'sandbox.squareup.com'
    : 'connect.squareup.com';
  
  logger.info(`Probando conexión directa a Square API (${apiHost})`);
  logger.info(`Variables de entorno: useSandbox=${useSandbox}, token disponible: ${!!accessToken}`);
  
  try {
    // 1. Probar listar ubicaciones
    const locationsResponse = await fetch(`https://${apiHost}/v2/locations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2023-12-13',
        'Content-Type': 'application/json'
      }
    });
    
    if (!locationsResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `Error en la API de Square: ${locationsResponse.status}`,
        details: await locationsResponse.text()
      }, { status: 500 });
    }
    
    const locationsData = await locationsResponse.json();
    
    // 2. Probar búsqueda en catálogo
    const searchBody = JSON.stringify({
      object_types: ['ITEM'],
      include_related_objects: true,
      include_deleted_objects: false
    });
    
    const searchResponse = await fetch(`https://${apiHost}/v2/catalog/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2023-12-13',
        'Content-Type': 'application/json'
      },
      body: searchBody
    });
    
    if (!searchResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `Error en la API de búsqueda de Square: ${searchResponse.status}`,
        details: await searchResponse.text()
      }, { status: 500 });
    }
    
    const searchData = await searchResponse.json();
    
    // Devolver ambos resultados
    return NextResponse.json({
      success: true,
      apiEnvironment: useSandbox ? 'sandbox' : 'production',
      apiHost,
      locations: locationsData.locations || [],
      catalog: {
        objectCount: (searchData.objects || []).length,
        objects: searchData.objects || []
      }
    });
  } catch (error) {
    logger.error('Error en la conexión directa a Square:', error);
    return NextResponse.json({
      success: false,
      error: 'Error en la conexión directa a Square API',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 