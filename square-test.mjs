#!/usr/bin/env node

// Direct Square SDK test script using ESM
// Run with: node square-test.mjs

console.log('Testing Square SDK initialization with ESM...');

try {
  // Test Square version and available exports
  console.log('\n== Testing Square SDK Imports ==');
  
  // Dynamic import for ESM
  const Square = await import('square');
  console.log('Available exports:', Object.keys(Square));
  
  let client = null;
  let method = 'none';
  
  // Approach 1: Try default import if available
  if (Square.default) {
    try {
      console.log('\n== Approach 1: Default import ==');
      
      if (Square.default.Client) {
        client = new Square.default.Client({
          accessToken: 'FAKE_TOKEN_FOR_TESTING',
          environment: Square.default.Environment?.Sandbox || 'sandbox'
        });
      }
      
      console.log('Client properties:', client ? Object.keys(client) : 'N/A');
      console.log('Has locationsApi:', !!client?.locationsApi);
      console.log('Has catalogApi:', !!client?.catalogApi);
      
      if (client?.locationsApi) {
        method = 'Square.default.Client with accessToken';
      }
    } catch (error) {
      console.log('Approach 1 failed:', error.message);
    }
  }
  
  // Approach 2: Try SquareClient with accessToken
  if (!client?.locationsApi && Square.SquareClient) {
    try {
      console.log('\n== Approach 2: SquareClient with accessToken ==');
      
      client = new Square.SquareClient({
        accessToken: 'FAKE_TOKEN_FOR_TESTING',
        environment: Square.SquareEnvironment?.Sandbox || 'sandbox'
      });
      
      console.log('Client properties:', Object.keys(client));
      console.log('Has locationsApi:', !!client.locationsApi);
      console.log('Has catalogApi:', !!client.catalogApi);
      
      if (client.locationsApi) {
        method = 'SquareClient with accessToken';
      }
    } catch (error) {
      console.log('Approach 2 failed:', error.message);
    }
  }
  
  // Approach 3: Try SquareClient with token
  if (!client?.locationsApi && Square.SquareClient) {
    try {
      console.log('\n== Approach 3: SquareClient with token ==');
      
      client = new Square.SquareClient({
        token: 'FAKE_TOKEN_FOR_TESTING',
        environment: Square.SquareEnvironment?.Sandbox || 'sandbox'
      });
      
      console.log('Client properties:', Object.keys(client));
      console.log('Has locationsApi:', !!client.locationsApi);
      console.log('Has catalogApi:', !!client.catalogApi);
      
      if (client.locationsApi) {
        method = 'SquareClient with token';
      }
    } catch (error) {
      console.log('Approach 3 failed:', error.message);
    }
  }
  
  console.log('\n== Result ==');
  console.log('Working approach:', method);
  console.log('Square SDK version:', Square.version || 'unknown');
} catch (error) {
  console.error('Top level error:', error);
} 