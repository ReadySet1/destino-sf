#!/usr/bin/env node

// Direct Square SDK test script
// Run with: node square-test.js

console.log('Testing Square SDK initialization...');

try {
  // Test Square version and available exports
  console.log('\n== Testing Square SDK Exports ==');
  const Square = require('square');
  console.log('Available exports:', Object.keys(Square));

  let client = null;
  let method = 'none';

  // Approach 1: Try SquareClient with accessToken
  try {
    console.log('\n== Approach 1: SquareClient with accessToken ==');
    const { SquareClient, SquareEnvironment } = Square;
    
    client = new SquareClient({
      accessToken: 'FAKE_TOKEN_FOR_TESTING',
      environment: SquareEnvironment.Sandbox
    });
    
    console.log('Client properties:', Object.keys(client));
    console.log('Has locationsApi:', !!client.locationsApi);
    console.log('Has catalogApi:', !!client.catalogApi);
    
    if (client.locationsApi) {
      method = 'SquareClient with accessToken';
    }
  } catch (error) {
    console.log('Approach 1 failed:', error.message);
  }

  // Approach 2: Try SquareClient with token
  if (!client?.locationsApi) {
    try {
      console.log('\n== Approach 2: SquareClient with token ==');
      const { SquareClient, SquareEnvironment } = Square;
      
      client = new SquareClient({
        token: 'FAKE_TOKEN_FOR_TESTING',
        environment: SquareEnvironment.Sandbox
      });
      
      console.log('Client properties:', Object.keys(client));
      console.log('Has locationsApi:', !!client.locationsApi);
      console.log('Has catalogApi:', !!client.catalogApi);
      
      if (client.locationsApi) {
        method = 'SquareClient with token';
      }
    } catch (error) {
      console.log('Approach 2 failed:', error.message);
    }
  }

  // Approach 3: Try Square.Client
  if (!client?.locationsApi && Square.Client) {
    try {
      console.log('\n== Approach 3: Square.Client ==');
      
      client = new Square.Client({
        accessToken: 'FAKE_TOKEN_FOR_TESTING',
        environment: 'sandbox'
      });
      
      console.log('Client properties:', Object.keys(client));
      console.log('Has locationsApi:', !!client.locationsApi);
      console.log('Has catalogApi:', !!client.catalogApi);
      
      if (client.locationsApi) {
        method = 'Square.Client with accessToken';
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