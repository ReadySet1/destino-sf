#!/usr/bin/env tsx

/**
 * Script to identify and optionally fix orders with missing breakdown data
 * This helps debug orders where subtotal + breakdown doesn't equal the total
 */

import { prisma } from '../src/lib/db';

interface OrderBreakdownIssue {
  orderId: string;
  customerName: string;
  total: number;
  calculatedSubtotal: number;
  storedTaxAmount: number;
  storedDeliveryFee: number;
  storedServiceFee: number;
  storedGratuityAmount: number;
  storedShippingCost: number;
  totalStoredBreakdown: number;
  discrepancy: number;
  createdAt: Date;
}

async function identifyOrdersWithBreakdownIssues(limit = 50): Promise<OrderBreakdownIssue[]> {
  console.log('🔍 Identifying orders with breakdown discrepancies...\n');

  const orders = await prisma.order.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      items: true,
    },
  });

  const issues: OrderBreakdownIssue[] = [];

  for (const order of orders) {
    // Calculate subtotal from items
    const calculatedSubtotal = order.items.reduce((sum, item) => {
      return sum + (item.price?.toNumber() || 0) * item.quantity;
    }, 0);

    // Get stored breakdown values
    const storedTaxAmount = order.taxAmount?.toNumber() || 0;
    const storedDeliveryFee = order.deliveryFee?.toNumber() || 0;
    const storedServiceFee = order.serviceFee?.toNumber() || 0;
    const storedGratuityAmount = order.gratuityAmount?.toNumber() || 0;
    const storedShippingCost = order.shippingCostCents ? order.shippingCostCents / 100 : 0;

    const totalStoredBreakdown = storedTaxAmount + storedDeliveryFee + storedServiceFee + storedGratuityAmount + storedShippingCost;
    const calculatedTotal = calculatedSubtotal + totalStoredBreakdown;
    const actualTotal = order.total?.toNumber() || 0;
    const discrepancy = actualTotal - calculatedTotal;

    // If there's a discrepancy > $0.05, flag it
    if (Math.abs(discrepancy) > 0.05) {
      issues.push({
        orderId: order.id,
        customerName: order.customerName,
        total: actualTotal,
        calculatedSubtotal,
        storedTaxAmount,
        storedDeliveryFee,
        storedServiceFee,
        storedGratuityAmount,
        storedShippingCost,
        totalStoredBreakdown,
        discrepancy,
        createdAt: order.createdAt,
      });
    }
  }

  return issues;
}

async function suggestBreakdownFix(issue: OrderBreakdownIssue): Promise<{
  suggestedTax?: number;
  suggestedServiceFee?: number;
  reasoning: string;
}> {
  // Simple heuristic: if all breakdown fields are 0 but there's a discrepancy,
  // assume it's likely tax (8.25%) and possibly service fee (3.5%)
  
  if (issue.totalStoredBreakdown === 0 && issue.discrepancy > 0) {
    // Calculate what 8.25% tax would be on the subtotal
    const estimatedTax = issue.calculatedSubtotal * 0.0825;
    
    // Calculate what 3.5% service fee would be on (subtotal + tax)
    const estimatedServiceFee = (issue.calculatedSubtotal + estimatedTax) * 0.035;
    
    const estimatedTotal = issue.calculatedSubtotal + estimatedTax + estimatedServiceFee;
    
    // If this estimate is close to the actual discrepancy, suggest it
    if (Math.abs(issue.discrepancy - (estimatedTax + estimatedServiceFee)) < 1) {
      return {
        suggestedTax: Math.round(estimatedTax * 100) / 100,
        suggestedServiceFee: Math.round(estimatedServiceFee * 100) / 100,
        reasoning: 'Likely missing tax (8.25%) and service fee (3.5%) calculation',
      };
    } else if (Math.abs(issue.discrepancy - estimatedTax) < 1) {
      return {
        suggestedTax: Math.round(estimatedTax * 100) / 100,
        reasoning: 'Likely missing tax (8.25%) calculation',
      };
    }
  }

  return {
    reasoning: 'Unable to determine breakdown automatically - manual review needed',
  };
}

async function main() {
  console.log('🔧 Order Breakdown Analysis Tool\n');
  
  try {
    const issues = await identifyOrdersWithBreakdownIssues();
    
    if (issues.length === 0) {
      console.log('✅ No breakdown discrepancies found in recent orders!');
      return;
    }

    console.log(`⚠️  Found ${issues.length} orders with breakdown discrepancies:\n`);
    
    for (const issue of issues) {
      console.log(`📋 Order: ${issue.orderId.substring(0, 8)}... (${issue.customerName})`);
      console.log(`   Created: ${issue.createdAt.toLocaleDateString()}`);
      console.log(`   Subtotal: $${issue.calculatedSubtotal.toFixed(2)}`);
      console.log(`   Stored breakdown: $${issue.totalStoredBreakdown.toFixed(2)} (tax: $${issue.storedTaxAmount}, delivery: $${issue.storedDeliveryFee}, service: $${issue.storedServiceFee}, gratuity: $${issue.storedGratuityAmount}, shipping: $${issue.storedShippingCost})`);
      console.log(`   Grand Total: $${issue.total.toFixed(2)}`);
      console.log(`   🚨 Discrepancy: $${issue.discrepancy.toFixed(2)}`);
      
      const suggestion = await suggestBreakdownFix(issue);
      console.log(`   💡 ${suggestion.reasoning}`);
      if (suggestion.suggestedTax) {
        console.log(`      Suggested tax: $${suggestion.suggestedTax.toFixed(2)}`);
      }
      if (suggestion.suggestedServiceFee) {
        console.log(`      Suggested service fee: $${suggestion.suggestedServiceFee.toFixed(2)}`);
      }
      console.log('');
    }

    console.log('\n📝 To fix these orders:');
    console.log('1. Review each order manually in the admin panel');
    console.log('2. Use the "Edit Order" feature to add missing breakdown data');
    console.log('3. Or create a follow-up script to batch update based on patterns found');
    
  } catch (error) {
    console.error('❌ Error analyzing orders:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { identifyOrdersWithBreakdownIssues, suggestBreakdownFix };
