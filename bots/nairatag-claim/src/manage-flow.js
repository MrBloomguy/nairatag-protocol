const fs = require('node:fs');
const path = require('node:path');

function loadEnvFile() {
  const filePath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

loadEnvFile();

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WABA_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '1847940299902811';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '1312831581918431';
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v22.0';
const FLOW_ENDPOINT = process.env.WHATSAPP_FLOW_ENDPOINT || 'https://nairatag-network.vercel.app/api/whatsapp-flow';
const FLOW_JSON_PATH = path.resolve(__dirname, '../whatsapp-flow-claim.json');

const GRAPH_BASE = `https://graph.facebook.com/${API_VERSION}`;

async function listFlows() {
  console.log(`\n🔍 Fetching flows for WABA ID ${WABA_ID}...`);
  const res = await fetch(`${GRAPH_BASE}/${WABA_ID}/flows`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
  });
  const data = await res.json();
  console.log('Result:', JSON.stringify(data, null, 2));
  return data;
}

async function createFlow(name = 'nairatag_claim', categories = ['SIGN_UP']) {
  console.log(`\n🚀 Creating flow "${name}" with endpoint ${FLOW_ENDPOINT}...`);
  const body = {
    name,
    categories,
    endpoint_uri: FLOW_ENDPOINT
  };

  const res = await fetch(`${GRAPH_BASE}/${WABA_ID}/flows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ACCESS_TOKEN}`
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  console.log('Create flow response:', JSON.stringify(data, null, 2));
  if (data.id) {
    return data.id;
  }
  throw new Error(`Failed to create flow: ${JSON.stringify(data)}`);
}

async function uploadFlowAsset(flowId) {
  console.log(`\n📤 Uploading Flow JSON asset to Flow ID ${flowId}...`);
  if (!fs.existsSync(FLOW_JSON_PATH)) {
    throw new Error(`Flow JSON not found at ${FLOW_JSON_PATH}`);
  }
  const flowJsonContent = fs.readFileSync(FLOW_JSON_PATH, 'utf-8');

  const formData = new FormData();
  formData.append('name', 'flow.json');
  formData.append('asset_type', 'FLOW_JSON');
  const blob = new Blob([flowJsonContent], { type: 'application/json' });
  formData.append('file', blob, 'flow.json');

  const res = await fetch(`${GRAPH_BASE}/${flowId}/assets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`
    },
    body: formData
  });

  const data = await res.json();
  console.log('Upload asset response:', JSON.stringify(data, null, 2));
  if (data.validation_errors && data.validation_errors.length > 0) {
    console.error('⚠️ Validation Errors in Flow JSON:', JSON.stringify(data.validation_errors, null, 2));
  }
  return data;
}

async function publishFlow(flowId) {
  console.log(`\n📢 Publishing Flow ID ${flowId}...`);
  const res = await fetch(`${GRAPH_BASE}/${flowId}/publish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`
    }
  });
  const data = await res.json();
  console.log('Publish response:', JSON.stringify(data, null, 2));
  return data;
}

async function sendFlowMessage(flowId, recipientPhone) {
  console.log(`\n💬 Sending Flow message to ${recipientPhone} from Phone ID ${PHONE_NUMBER_ID}...`);
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone.replace(/\D/g, ''),
    type: 'interactive',
    interactive: {
      type: 'flow',
      header: {
        type: 'text',
        text: '₦ NAIRATAG'
      },
      body: {
        text: 'Welcome to NairaTag! Claim your verified Nigerian Web3 handle, Base wallet, and Flutterwave Virtual Account.'
      },
      footer: {
        text: 'NairaTag Identity Protocol'
      },
      action: {
        name: 'flow',
        parameters: {
          mode: 'draft',
          flow_message_version: '3',
          flow_token: `token_${Date.now()}`,
          flow_id: flowId,
          flow_cta: 'Claim my ₦Tag',
          flow_action: 'navigate',
          flow_action_payload: {
            screen: 'FIND_TAG'
          }
        }
      }
    }
  };

  const res = await fetch(`${GRAPH_BASE}/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ACCESS_TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('Send Flow message response:', JSON.stringify(data, null, 2));
  return data;
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || '--list';

  try {
    if (cmd === '--list') {
      await listFlows();
    } else if (cmd === '--deploy') {
      const flows = await listFlows();
      let flowId;
      const existing = flows.data?.find(f => f.name === 'nairatag_claim');
      if (existing) {
        flowId = existing.id;
        console.log(`Using existing flow ID: ${flowId} (${existing.status})`);
      } else {
        flowId = await createFlow('nairatag_claim');
      }

      const uploadResult = await uploadFlowAsset(flowId);
      if (uploadResult.success) {
        console.log('✅ Flow JSON successfully validated and uploaded in Meta!');
        
        // Attempt publish
        try {
          await publishFlow(flowId);
        } catch (pubErr) {
          console.log('Publish note (Flow can still be tested in DRAFT mode):', pubErr.message);
        }

        // Save flow ID into .env if not present
        const envPath = path.resolve(__dirname, '../.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        if (!envContent.includes('WHATSAPP_FLOW_ID=')) {
          fs.appendFileSync(envPath, `\nWHATSAPP_FLOW_ID=${flowId}\n`);
          console.log(`💾 Saved WHATSAPP_FLOW_ID=${flowId} to .env`);
        } else {
          const updated = envContent.replace(/WHATSAPP_FLOW_ID=.*(\r?\n|$)/, `WHATSAPP_FLOW_ID=${flowId}$1`);
          fs.writeFileSync(envPath, updated);
          console.log(`💾 Updated WHATSAPP_FLOW_ID=${flowId} in .env`);
        }
      }
    } else if (cmd === '--send') {
      const recipient = args[1] || '+2348120798168';
      const flowId = args[2] || process.env.WHATSAPP_FLOW_ID;
      if (!flowId) {
        throw new Error('No Flow ID provided and WHATSAPP_FLOW_ID is not set in .env');
      }
      await sendFlowMessage(flowId, recipient);
    } else {
      console.log('Usage: node manage-flow.js [--list | --deploy | --send <recipient> <flowId>]');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main();
