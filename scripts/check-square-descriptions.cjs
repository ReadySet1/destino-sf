const https = require('https');

const squareIds = [
  '2HKY7CZYFOBQMT7NLS2EKV2S', // acorn squash
  'ONJCXBF3ZAYAUYISIZLNBUCX', // Adobo Pork
  'KPWN4NFQCFAQMGNXLHHYDRPR'  // albondigas
];

const token = process.env.SQUARE_PRODUCTION_TOKEN || process.env.SQUARE_ACCESS_TOKEN;

if (!token) {
  console.error('ERROR: No Square token found in environment variables');
  process.exit(1);
}

async function fetchProduct(objectId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'connect.squareup.com',
      path: `/v2/catalog/object/${objectId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Square-Version': '2024-10-17',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

(async () => {
  console.log('Fetching Square product data to check description formatting...\n');

  for (const id of squareIds) {
    try {
      console.log(`========== Product ID: ${id} ==========`);
      const response = await fetchProduct(id);
      const item = response.object;

      if (item && item.item_data) {
        console.log('Name:', item.item_data.name);
        console.log('\n📄 Description (plain):');
        console.log('  ', item.item_data.description || '(none)');
        console.log('\n🏷️  Description HTML:');
        console.log('  ', item.item_data.description_html || '(none)');
        console.log('\n📝 Description Plaintext:');
        console.log('  ', item.item_data.description_plaintext || '(none)');

        // Check if HTML tags are present
        const hasHtml = item.item_data.description_html &&
                       (item.item_data.description_html.includes('<b>') ||
                        item.item_data.description_html.includes('<i>') ||
                        item.item_data.description_html.includes('<strong>') ||
                        item.item_data.description_html.includes('<em>'));

        console.log('\n✅ HTML Formatting Present:', hasHtml ? 'YES' : 'NO');
        console.log('\n' + '='.repeat(60) + '\n');
      }
    } catch (error) {
      console.error(`❌ Error fetching ${id}:`, error.message);
      console.log('\n' + '='.repeat(60) + '\n');
    }
  }

  console.log('\n✅ Check complete!');
})();
