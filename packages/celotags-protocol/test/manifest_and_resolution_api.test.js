import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import celotagsHandler from '../../../api/celotags.js';
import { CanonicalIdentifier } from '../src/index.js';

/**
 * Helper to dispatch simulated HTTP requests to the handler.
 */
function invokeHandler(reqOptions, body = null) {
  return new Promise((resolve, reject) => {
    const req = new http.IncomingMessage(null);
    req.method = reqOptions.method || 'GET';
    req.url = reqOptions.url || '/';
    req.headers = { host: 'localhost', ...(reqOptions.headers || {}) };
    req.body = body;

    const res = {
      statusCode: 200,
      headers: {},
      body: '',
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      status(code) { this.statusCode = code; return this; },
      json(data) {
        this.setHeader('content-type', 'application/json');
        this.body = JSON.stringify(data);
        resolve({ statusCode: this.statusCode, json: data });
        return this;
      },
      end(str = '') {
        this.body += str;
        let parsed = null;
        try { parsed = JSON.parse(this.body); } catch {}
        resolve({ statusCode: this.statusCode, text: this.body, json: parsed });
      }
    };

    celotagsHandler(req, res).catch(reject);
  });
}

test('CeloTags Public Capability Manifest & Identity Resolution API (ERC-8004)', async (t) => {

  await t.test('1. Protocol Capability Manifest (/.well-known/celotag-agent.json)', async () => {
    const res = await invokeHandler({ url: '/.well-known/celotag-agent.json' });
    assert.equal(res.statusCode, 200, 'Manifest endpoint must return 200');
    assert.equal(res.json.protocol, 'ERC-8004', 'Must conform to ERC-8004');
    assert.equal(res.json.network.chainId, 11142220, 'Target network must be Celo Sepolia 11142220');
    assert.equal(res.json.network.mainnetChainId, 42220, 'Mainnet reference must be 42220');
    assert.ok(Array.isArray(res.json.namespaces.supported), 'Namespaces must be listed');
    assert.ok(res.json.namespaces.supported.includes('ng'), 'Must include Nigeria namespace');
    assert.ok(res.json.namespaces.supported.includes('gh'), 'Must include Ghana namespace');

    // Security invariant verification
    assert.equal(res.json.security.identityIsNotAuthority, true, 'Manifest must declare Identity is Not Authority');
    assert.equal(res.json.security.financialAuthorityConveyed, false, 'Manifest must declare zero financial authority');
    assert.equal(res.json.security.claimAuthentication, 'EIP-712 mandatory in production');
  });

  await t.test('2. Query-based Agent Card (/.well-known/celotag-agent.json?tag=₦SEGUN)', async () => {
    const res = await invokeHandler({ url: '/.well-known/celotag-agent.json?tag=%E2%82%A6SEGUN' });
    assert.equal(res.statusCode, 200, 'Agent card endpoint must return 200');
    assert.equal(res.json.protocol, 'ERC-8004');
    assert.equal(res.json.celotag, 'urn:celotag:ng:segun');
    assert.equal(res.json.displayTag, '₦SEGUN');
    assert.ok(Array.isArray(res.json.capabilities), 'Capabilities must be listed');
    assert.ok(res.json.capabilities.length >= 2, '₦SEGUN must have registered capabilities');
  });

  await t.test('3. Forward Identity Resolution across formats (/api/celotags/resolve/:tag)', async () => {
    // 3a. Display Tag
    const r1 = await invokeHandler({ url: '/api/celotags/resolve/%E2%82%A6SEGUN' });
    assert.equal(r1.statusCode, 200);
    assert.equal(r1.json.ok, true);
    assert.equal(r1.json.data.urn, 'urn:celotag:ng:segun');
    assert.equal(r1.json.data.display, '₦SEGUN');
    assert.equal(r1.json.data.country, 'NG');
    assert.equal(r1.json.data.currency, 'NGN');
    assert.equal(r1.json.data.authority, 'NONE', 'Resolution must convey ZERO authority');
    assert.equal(r1.json.data.financialAuthority, false, 'Resolution must not convey financial authority');

    // 3b. Bare Handle
    const r2 = await invokeHandler({ url: '/api/celotags/resolve/segun' });
    assert.equal(r2.statusCode, 200);
    assert.equal(r2.json.data.urn, 'urn:celotag:ng:segun');

    // 3c. Scoped Tag
    const r3 = await invokeHandler({ url: '/api/celotags/resolve/@ng:segun' });
    assert.equal(r3.statusCode, 200);
    assert.equal(r3.json.data.urn, 'urn:celotag:ng:segun');

    // 3d. Canonical URN
    const r4 = await invokeHandler({ url: '/api/celotags/resolve/urn:celotag:ng:segun' });
    assert.equal(r4.statusCode, 200);
    assert.equal(r4.json.data.urn, 'urn:celotag:ng:segun');

    // 3e. Multi-country namespace (Ghana)
    const r5 = await invokeHandler({ url: '/api/celotags/resolve/GH%E2%82%B5AMA' });
    assert.equal(r5.statusCode, 200);
    assert.equal(r5.json.data.urn, 'urn:celotag:gh:ama');
    assert.equal(r5.json.data.country, 'GH');
    assert.equal(r5.json.data.currency, 'GHS');
  });

  await t.test('4. Reverse Resolution via EVM Wallet Address (/api/celotags/resolve/:address)', async () => {
    // 4a. Known registered wallet
    const knownAddress = '0x8217316A99D41c6dCe89D46e9A34c1143D1A914c';
    const rKnown = await invokeHandler({ url: `/api/celotags/resolve/${knownAddress}` });
    assert.equal(rKnown.statusCode, 200);
    assert.equal(rKnown.json.ok, true);
    assert.equal(rKnown.json.data.urn, 'urn:celotag:ng:segun');
    assert.equal(rKnown.json.data.display, '₦SEGUN');

    // 4b. Unknown wallet (Safe non-error response)
    const unknownAddress = '0x1111111111111111111111111111111111111111';
    const rUnknown = await invokeHandler({ url: `/api/celotags/resolve/${unknownAddress}` });
    assert.equal(rUnknown.statusCode, 200);
    assert.equal(rUnknown.json.ok, true);
    assert.equal(rUnknown.json.data.resolved, false);
    assert.equal(rUnknown.json.data.urn, null);
    assert.equal(rUnknown.json.data.authority, 'NONE');
  });

  await t.test('5. Negative Defenses & Anti-Spoofing in Resolution API', async () => {
    // 5a. Missing parameter
    const rMissing = await invokeHandler({ url: '/api/celotags/resolve' });
    assert.equal(rMissing.statusCode, 400);
    assert.equal(rMissing.json.code, 'MISSING_PARAM');

    // 5b. Cyrillic homoglyph spoofing attack
    // "₦SЕGUN" where 'Е' is Unicode U+0415 (Cyrillic Capital Letter Ie)
    const cyrillicTag = '₦S\u0415GUN';
    const rHomoglyph = await invokeHandler({ url: `/api/celotags/resolve/${encodeURIComponent(cyrillicTag)}` });
    assert.equal(rHomoglyph.statusCode, 400);
    assert.equal(rHomoglyph.json.code, 'INVALID_TAG');
    assert.match(rHomoglyph.json.error, /cyrillic|homoglyph|confusable/i);

    // 5c. Invisible zero-width character attack
    const invisibleTag = '₦SE\u200BGUN';
    const rInvisible = await invokeHandler({ url: `/api/celotags/resolve/${encodeURIComponent(invisibleTag)}` });
    assert.equal(rInvisible.statusCode, 400);
    assert.equal(rInvisible.json.code, 'INVALID_TAG');

    // 5d. Unregistered Tag
    const rUnregistered = await invokeHandler({ url: '/api/celotags/resolve/%E2%82%A6UNREGISTERED9999' });
    assert.equal(rUnregistered.statusCode, 404);
    assert.equal(rUnregistered.json.code, 'TAG_NOT_FOUND');
  });

  await t.test('6. Dynamic Capability Discovery (/api/celotags/discover)', async () => {
    const res = await invokeHandler({ url: '/api/celotags/discover?category=service' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json.ok, true);
    assert.ok(res.json.count >= 3, 'Must return at least 3 seeded service agents');
    const handles = res.json.agents.map(a => a.identifier.handle);
    assert.ok(handles.includes('chowdeck') || handles.includes('dev') || handles.includes('researcher'));
  });

  await t.test('7. Supported Country Namespaces (/api/celotags/namespaces)', async () => {
    const res = await invokeHandler({ url: '/api/celotags/namespaces' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json.ok, true);
    assert.ok(res.json.namespaces.ng, 'Nigeria namespace must be present');
    assert.equal(res.json.namespaces.ng.currency, 'NGN');
    assert.equal(res.json.namespaces.ng.currencyCode, 'NGN');
    assert.ok(res.json.namespaces.ng.supportedChains.includes('celoSepolia'));
    assert.ok(res.json.namespaces.gh, 'Ghana namespace must be present');
    assert.ok(res.json.namespaces.ke, 'Kenya namespace must be present');
    assert.ok(res.json.namespaces.za, 'South Africa namespace must be present');
    assert.ok(res.json.namespaces.br, 'Brazil namespace must be present');
  });

  await t.test('8. Escrow Tasks HTTP API Query & Detail (/api/celotags/escrow/tasks)', async () => {
    // 8a. List active tasks
    const resList = await invokeHandler({ url: '/api/celotags/escrow/tasks' });
    assert.equal(resList.statusCode, 200);
    assert.equal(resList.json.ok, true);
    assert.ok(resList.json.count >= 1);
    assert.ok(resList.json.tasks.some(t => t.id === 'task_ref_001'));

    // 8b. Get single task by ID
    const resDetail = await invokeHandler({ url: '/api/celotags/escrow/tasks/task_ref_001' });
    assert.equal(resDetail.statusCode, 200);
    assert.equal(resDetail.json.ok, true);
    assert.equal(resDetail.json.task.creatorDisplay, '₦SEGUN');
    assert.equal(resDetail.json.task.assigneeDisplay, 'GH₵AMA');
    assert.equal(resDetail.json.task.amount, 15000);
  });

  await t.test('9. Escrow Task Deliverable Submission & Release HTTP API', async () => {
    const workerWallet = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc';
    const creatorWallet = '0x8217316a99d41c6dce89d46e9a34c1143d1a914c';

    // 9a. Submit deliverable
    const deliverRes = await invokeHandler(
      { url: '/api/celotags/escrow/tasks/task_ref_001/deliver', method: 'POST' },
      {
        workerAddress: workerWallet,
        deliverableData: { quote: 'GH₵ / cUSD live market arbitrage benchmark', status: 'verified' }
      }
    );
    assert.equal(deliverRes.statusCode, 200);
    assert.equal(deliverRes.json.ok, true);
    assert.equal(deliverRes.json.task.status, 'Submitted');
    assert.ok(deliverRes.json.task.deliverableHash);

    // 9b. Release task payout
    const releaseRes = await invokeHandler(
      { url: '/api/celotags/escrow/tasks/task_ref_001/release', method: 'POST' },
      { callerAddress: creatorWallet }
    );
    assert.equal(releaseRes.statusCode, 200);
    assert.equal(releaseRes.json.ok, true);
    assert.equal(releaseRes.json.result.status, 'Completed');
  });
});
