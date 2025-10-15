// Script to check Square product descriptions for HTML formatting
import { retrieveCatalogObject } from '../src/lib/square/catalog-api';

const squareIds = [
  '2HKY7CZYFOBQMT7NLS2EKV2S', // acorn squash
  'ONJCXBF3ZAYAUYISIZLNBUCX', // Adobo Pork
  'KPWN4NFQCFAQMGNXLHHYDRPR', // albondigas
];

async function checkDescriptions() {
  console.log('Fetching Square product data to check description formatting...\n');

  for (const id of squareIds) {
    try {
      console.log(`========== Product ID: ${id} ==========`);
      const response = await retrieveCatalogObject(id);
      const item = response.result.object;

      if (item && item.item_data) {
        console.log('Name:', item.item_data.name);
        console.log('\n📄 Description (plain):');
        console.log('  ', item.item_data.description || '(none)');
        console.log('\n🏷️  Description HTML:');
        console.log('  ', item.item_data.description_html || '(none)');
        console.log('\n📝 Description Plaintext:');
        console.log('  ', item.item_data.description_plaintext || '(none)');

        // Check if HTML tags are present
        const descHtml = item.item_data.description_html || '';
        const hasHtml =
          descHtml.includes('<b>') ||
          descHtml.includes('<i>') ||
          descHtml.includes('<strong>') ||
          descHtml.includes('<em>');

        console.log('\n✅ HTML Formatting Present:', hasHtml ? 'YES' : 'NO');

        // Show what the formatting looks like
        if (hasHtml) {
          console.log('\n🎨 Sample HTML tags found:');
          if (descHtml.includes('<b>')) console.log('   - <b> (bold)');
          if (descHtml.includes('<strong>')) console.log('   - <strong> (bold)');
          if (descHtml.includes('<i>')) console.log('   - <i> (italic)');
          if (descHtml.includes('<em>')) console.log('   - <em> (emphasis/italic)');
        }

        console.log('\n' + '='.repeat(60) + '\n');
      }
    } catch (error) {
      console.error(`❌ Error fetching ${id}:`, error instanceof Error ? error.message : error);
      console.log('\n' + '='.repeat(60) + '\n');
    }
  }

  console.log('\n✅ Check complete!');
}

checkDescriptions().catch(console.error);
