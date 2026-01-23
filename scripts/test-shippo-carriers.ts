#!/usr/bin/env npx tsx
/**
 * Test script to verify Shippo API carrier configuration
 * Run with: npx tsx scripts/test-shippo-carriers.ts
 */

import 'dotenv/config';
import { Shippo } from 'shippo';

async function testShippoCarriers() {
  const apiKey = process.env.SHIPPO_API_KEY;

  if (!apiKey) {
    console.error('❌ SHIPPO_API_KEY environment variable is not set');
    process.exit(1);
  }

  console.log('🔑 Using Shippo API key:', apiKey.substring(0, 15) + '...');
  console.log('');

  const client = new Shippo({
    apiKeyHeader: apiKey,
    serverURL: 'https://api.goshippo.com',
  });

  // Test shipment payload - San Francisco to New York
  const shipmentPayload = {
    addressFrom: {
      name: 'Destino SF',
      company: 'Destino SF',
      street1: '123 Mission St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'US',
      phone: '+14155555555',
      email: 'shipping@destinosf.com',
    },
    addressTo: {
      name: 'Test Customer',
      street1: '123 Broadway',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'US',
    },
    parcels: [
      {
        length: '10',
        width: '8',
        height: '6',
        distanceUnit: 'in',
        weight: '2',
        massUnit: 'lb',
      },
    ],
    async: false,
  };

  try {
    console.log('📦 Creating test shipment...');
    console.log('   From: San Francisco, CA 94105');
    console.log('   To: New York, NY 10001');
    console.log('   Package: 10x8x6 in, 2 lbs');
    console.log('');

    const shipmentResp = await client.shipments.create(shipmentPayload);

    if (!shipmentResp || !shipmentResp.rates) {
      console.error('❌ No rates returned from Shippo');
      return;
    }

    console.log('✅ Shippo API Response received');
    console.log('');
    console.log('='.repeat(60));
    console.log('CARRIER ANALYSIS');
    console.log('='.repeat(60));
    console.log('');

    // Group rates by carrier
    const carrierRates = new Map<string, any[]>();
    for (const rate of shipmentResp.rates) {
      const carrier = rate.provider || 'Unknown';
      if (!carrierRates.has(carrier)) {
        carrierRates.set(carrier, []);
      }
      carrierRates.get(carrier)!.push(rate);
    }

    // Display carriers found
    console.log(`📋 Total rates returned: ${shipmentResp.rates.length}`);
    console.log(`📋 Unique carriers found: ${carrierRates.size}`);
    console.log('');

    for (const [carrier, rates] of carrierRates) {
      console.log(`\n🚚 ${carrier.toUpperCase()} (${rates.length} service options)`);
      console.log('-'.repeat(40));
      for (const rate of rates) {
        const serviceName = rate.servicelevel?.name || rate.servicelevel || 'Unknown';
        const amount = rate.amount || 'N/A';
        const currency = rate.currency || 'USD';
        const days = rate.estimated_days || rate.days || 'N/A';
        console.log(`   • ${serviceName}: $${amount} ${currency} (${days} days)`);
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('');

    // Check if only USPS
    const carriers = Array.from(carrierRates.keys());
    if (carriers.length === 1 && carriers[0].toUpperCase() === 'USPS') {
      console.log('✅ CONFIRMED: Only USPS carrier is configured');
      console.log('   Your Shippo account is correctly restricted to USPS only.');
    } else if (carriers.some(c => c.toUpperCase() === 'USPS')) {
      console.log('⚠️  WARNING: Multiple carriers detected!');
      console.log(`   Carriers found: ${carriers.join(', ')}`);
      console.log('   If you only want USPS, check your Shippo account settings.');
    } else {
      console.log('❌ ERROR: USPS not found in carriers');
      console.log(`   Carriers found: ${carriers.join(', ')}`);
    }
  } catch (error) {
    console.error('❌ Error calling Shippo API:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
  }
}

testShippoCarriers();
