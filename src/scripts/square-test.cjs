// CommonJS test script for Square v42.0.1
// Run with: node square-test.cjs

console.log('Testing Square SDK v42.0.1 with CommonJS...');

try {
  // Import Square
  const Square = require('square');
  console.log('Square SDK exports:', Object.keys(Square));

  // Try the official v42.0.1 pattern based on Square's docs
  try {
    console.log('\nTesting official Square v42 pattern...');
    
    // The documented approach uses Client, not SquareClient
    const client = new Square.Client({
      accessToken: 'FAKE_TOKEN',
      environment: 'sandbox'
    });

    console.log('Client properties:', Object.keys(client));
    console.log('Has locationsApi:', !!client.locationsApi);
    console.log('Has catalogApi:', !!client.catalogApi);
    
    if (client.locationsApi) {
      console.log('SUCCESS: Official Square v42 pattern works!');
      
      // Also log methods on the API objects
      if (client.locationsApi) {
        console.log('locationsApi methods:', Object.keys(client.locationsApi));
      }
      
      if (client.catalogApi) {
        console.log('catalogApi methods:', Object.keys(client.catalogApi));
      }
    }
  } catch (error) {
    console.error('Error with official Square v42 pattern:', error);
  }
  
  // Try with backward compatibility class name
  try {
    console.log('\nTesting with SquareClient...');
    
    const client = new Square.SquareClient({
      accessToken: 'FAKE_TOKEN',
      environment: Square.SquareEnvironment.Sandbox
    });

    console.log('Client properties:', Object.keys(client));
    console.log('Has locationsApi:', !!client.locationsApi);
    console.log('Has catalogApi:', !!client.catalogApi);
    
    if (client.locationsApi) {
      console.log('SUCCESS: SquareClient pattern works!');
    }
  } catch (error) {
    console.error('Error with SquareClient:', error);
  }
  
  // Try with token parameter
  try {
    console.log('\nTesting with token parameter...');
    
    const client = new Square.SquareClient({
      token: 'FAKE_TOKEN',
      environment: Square.SquareEnvironment.Sandbox
    });

    console.log('Client properties:', Object.keys(client));
    console.log('Has locationsApi:', !!client.locationsApi);
    console.log('Has catalogApi:', !!client.catalogApi);
    
    if (client.locationsApi) {
      console.log('SUCCESS: token parameter works!');
    }
  } catch (error) {
    console.error('Error with token parameter:', error);
  }
  
} catch (error) {
  console.error('Top-level error:', error);
} 