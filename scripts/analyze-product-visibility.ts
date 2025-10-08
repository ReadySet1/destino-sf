import { createClient } from '@supabase/supabase-js';

const DEV_PROJECT_URL = 'https://drrejylrcjbeldnzodjd.supabase.co';
const PROD_PROJECT_URL = 'https://ocusztulyiegeawqptrs.supabase.co';

// Get from environment
const DEV_KEY = process.env.DEV_SUPABASE_KEY || '';
const PROD_KEY = process.env.PROD_SUPABASE_KEY || '';

interface Product {
  id: string;
  name: string;
  visibility: string;
  is_available: boolean;
  is_preorder: boolean;
  active: boolean;
  item_state: string;
  is_archived: boolean;
  syncLocked: boolean;
}

async function analyzeVisibility() {
  // For now, let's analyze the data we already have
  // This would need proper Supabase client setup in production

  console.log('Product Visibility Audit Report');
  console.log('================================\n');

  // Key findings from manual inspection:
  const findings = [
    {
      issue: 'Archive Status Mismatch',
      product: 'Alfajores- 6-pack combo',
      dev: 'is_archived: true',
      prod: 'is_archived: false',
      severity: 'HIGH',
      recommendation: 'Should be archived in production too',
    },
    {
      issue: 'Item State Mismatch',
      product: 'Alfajores- Pride (6-pack)',
      dev: 'item_state: SEASONAL',
      prod: 'item_state: ACTIVE',
      severity: 'MEDIUM',
      recommendation: 'Production should be SEASONAL to match dev',
    },
    {
      issue: 'Availability Mismatch',
      product: "Alfajores- Valentine's (10 per packet)",
      dev: 'is_available: true',
      prod: 'is_available: false',
      severity: 'MEDIUM',
      recommendation: 'Need to decide correct availability state',
    },
    {
      issue: 'Availability Mismatch',
      product: 'Empanadas- Lomo Saltado (frozen- 4 pack)',
      dev: 'is_available: false',
      prod: 'is_available: true',
      severity: 'HIGH',
      recommendation: 'Production should be unavailable to match dev',
    },
  ];

  console.log('CRITICAL INCONSISTENCIES FOUND:\n');
  findings.forEach((finding, i) => {
    console.log(`${i + 1}. ${finding.issue}`);
    console.log(`   Product: ${finding.product}`);
    console.log(`   Dev: ${finding.dev}`);
    console.log(`   Prod: ${finding.prod}`);
    console.log(`   Severity: ${finding.severity}`);
    console.log(`   Recommendation: ${finding.recommendation}`);
    console.log('');
  });

  console.log('\nRECOMMENDED FIXES:');
  console.log('==================\n');

  console.log('1. Archive "Alfajores- 6-pack combo" in production');
  console.log('2. Set "Alfajores- Pride (6-pack)" to SEASONAL in production');
  console.log('3. Set "Empanadas- Lomo Saltado (frozen- 4 pack)" to unavailable in production');
  console.log(
    "4. Decide on Valentine's Alfajores availability (currently available in dev, unavailable in prod)"
  );
}

analyzeVisibility().catch(console.error);
