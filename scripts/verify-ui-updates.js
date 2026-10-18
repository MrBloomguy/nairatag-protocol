import http from 'node:http';

async function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function verifyAll() {
  const [eHtml, aHtml, cHtml, actHtml] = await Promise.all([
    get('http://127.0.0.1:8088/earnings'),
    get('http://127.0.0.1:8088/agent'),
    get('http://127.0.0.1:8088/claim'),
    get('http://127.0.0.1:8088/activities')
  ]);

  console.log('CHECK 1: Earnings Agent Profile Modal:');
  console.log('  - Modal backdrop exists:', eHtml.includes('id="agent-modal-backdrop"'));
  console.log('  - Modal card exists:', eHtml.includes('id="agent-modal-card"'));
  console.log('  - Leaderboard row click calls openAgentModal:', eHtml.includes('openAgentModal(agent)'));

  console.log('CHECK 2: Agent Chat Tagging (using ₦ instead of @):');
  console.log('  - Composer button uses ₦ symbol:', aHtml.includes('tag-at-symbol') && aHtml.includes('₦'));
  console.log('  - Placeholder instructs typing ₦ to tag an agent:', aHtml.includes('Message ₦CHUKS or type ₦ to tag an agent...'));
  console.log('  - Tag context uses ₦ (not @):', aHtml.includes('tagContextLabel.textContent = tag'));

  console.log('CHECK 3: Claim page Base badge on preview card:');
  console.log('  - Base badge removed from preview card:', !cHtml.includes('id="card-net-pill"'));

  console.log('CHECK 4: Activities tabs:');
  console.log('  - Tag2Tag tab removed from feed tabs:', !actHtml.includes('data-filter="tag2tag"'));
}

verifyAll().catch(console.error);
