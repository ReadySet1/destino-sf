import squareClient from './client';

export async function fetchCatalogItems() {
  try {
    const response = await squareClient.catalogApi.listCatalog(undefined, 'ITEM');
    return response.result.objects || [];
  } catch (error) {
    console.error('Error fetching Square catalog:', error);
    throw error;
  }
}
