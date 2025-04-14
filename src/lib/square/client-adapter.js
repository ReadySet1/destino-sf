// src/lib/square/client-adapter.js - CommonJS file to initialize Square client

// Import using CommonJS style since Square SDK doesn't work well with ESM
const Square = require('square');

// Get the access token from environment variables
const accessToken = process.env.SQUARE_ACCESS_TOKEN;

if (!accessToken) {
  console.error("Square access token is not configured in environment variables.");
  throw new Error("Missing Square Access Token");
}

// Initialize the client with version 42.0.1 pattern
const squareClient = new Square.SquareClient({
  accessToken: accessToken,
  environment: process.env.NODE_ENV === 'production' 
    ? Square.SquareEnvironment.Production 
    : Square.SquareEnvironment.Sandbox,
  userAgentDetail: 'destino-sf'
});

// Manually add API services that might be missing from the client instance
// This is a workaround for Square SDK v42.0.1 initialization issues
if (!squareClient.locationsApi) {
  const apiSuffix = process.env.NODE_ENV === 'production' ? '' : '.sandbox';
  
  // Add locationsApi
  squareClient.locationsApi = {
    listLocations: async () => {
      const response = await fetch(`https://connect${apiSuffix}.squareup.com/v2/locations`, {
        method: 'GET',
        headers: {
          'Square-Version': '2023-12-13',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Square API error: ${response.status}`);
      }
      
      const data = await response.json();
      return { result: data };
    }
  };
  
  // Add catalogApi
  squareClient.catalogApi = {
    listCatalog: async (cursor, types) => {
      const url = new URL(`https://connect${apiSuffix}.squareup.com/v2/catalog/list`);
      if (cursor) url.searchParams.append('cursor', cursor);
      if (types) url.searchParams.append('types', types);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Square-Version': '2023-12-13',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Square API error: ${response.status}`);
      }
      
      const data = await response.json();
      return { result: data };
    },
    
    searchCatalogObjects: async (request) => {
      const response = await fetch(`https://connect${apiSuffix}.squareup.com/v2/catalog/search`, {
        method: 'POST',
        headers: {
          'Square-Version': '2023-12-13',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        throw new Error(`Square API error: ${response.status}`);
      }
      
      const data = await response.json();
      return { result: data };
    },
    
    upsertCatalogObject: async (request) => {
      const response = await fetch(`https://connect${apiSuffix}.squareup.com/v2/catalog/object`, {
        method: 'POST',
        headers: {
          'Square-Version': '2023-12-13',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        throw new Error(`Square API error: ${response.status}`);
      }
      
      const data = await response.json();
      return { result: data };
    }
  };
}

console.log('Square client properties after adapter:', Object.keys(squareClient));
console.log('Has locationsApi:', !!squareClient.locationsApi);
console.log('Has catalogApi:', !!squareClient.catalogApi);

// Export the client for use in the application
module.exports = { squareClient }; 