import crypto from 'node:crypto';
import { checkTagAvailabilityAsync } from './claims.js';

// Embedded RSA Private Key matching the VALID registered public key on Meta Cloud API
const PRIVATE_KEY_PEM = process.env.WHATSAPP_FLOW_PRIVATE_KEY;

function decryptRequest(body, privatePem) {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

  // Decrypt AES Key using RSA-OAEP with SHA-256
  const decryptedAesKey = crypto.privateDecrypt(
    {
      key: crypto.createPrivateKey(privatePem),
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(encrypted_aes_key, 'base64')
  );

  // Decrypt Flow Data using AES-128-GCM
  const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64');
  const initialVectorBuffer = Buffer.from(initial_vector, 'base64');

  const TAG_LENGTH = 16;
  const encrypted_flow_data_body = flowDataBuffer.subarray(0, -TAG_LENGTH);
  const encrypted_flow_data_tag = flowDataBuffer.subarray(-TAG_LENGTH);

  const decipher = crypto.createDecipheriv('aes-128-gcm', decryptedAesKey, initialVectorBuffer);
  decipher.setAuthTag(encrypted_flow_data_tag);

  const decryptedJSONString = Buffer.concat([
    decipher.update(encrypted_flow_data_body),
    decipher.final()
  ]).toString('utf-8');

  return {
    decryptedBody: JSON.parse(decryptedJSONString),
    aesKeyBuffer: decryptedAesKey,
    initialVectorBuffer
  };
}

function encryptResponse(response, aesKeyBuffer, initialVectorBuffer) {
  // Flip the initialization vector (bitwise NOT each byte)
  const flipped_iv = [];
  for (const pair of initialVectorBuffer.entries()) {
    flipped_iv.push(~pair[1]);
  }

  const cipher = crypto.createCipheriv('aes-128-gcm', aesKeyBuffer, Buffer.from(flipped_iv));
  return Buffer.concat([
    cipher.update(JSON.stringify(response), 'utf-8'),
    cipher.final(),
    cipher.getAuthTag()
  ]).toString('base64');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Health Check
  if (req.method === 'GET') {
    return res.status(200).json({
      version: '3.0',
      data: { status: 'active', service: 'NairaTag Flow Endpoint' }
    });
  }

  // POST: Meta Flow Request
  if (req.method === 'POST') {
    const body = req.body || {};

    // 1. Plaintext Ping or Health Check
    if (body.action === 'ping' || (!body.encrypted_flow_data && !body.encrypted_aes_key)) {
      return res.status(200).json({
        data: { status: 'active' }
      });
    }

    // 2. Encrypted Flow Request (Official Meta Cloud API Flow Protocol)
    try {
      const { decryptedBody, aesKeyBuffer, initialVectorBuffer } = decryptRequest(body, PRIVATE_KEY_PEM);
      const { action, screen, data } = decryptedBody;

      console.log('[Decrypted Meta Flow Action]:', action, screen, data);

      let responsePayload;

      if (action === 'ping') {
        responsePayload = {
          data: { status: 'active' }
        };
      } else if (action === 'INIT') {
        responsePayload = {
          screen: 'FIND_TAG',
          data: {}
        };
      } else if (action === 'data_exchange') {
        const rawTag = data?.tag_name || data?.tag_input || '';
        const cleanTag = String(rawTag).replace(/^[₦#@]/, '').trim().toLowerCase();
        try {
          const availability = await checkTagAvailabilityAsync(cleanTag);
          responsePayload = {
            screen: 'CLAIM_SUMMARY',
            data: {
              tag_display: '₦' + cleanTag.toUpperCase(),
              status_badge: availability.available ? 'AVAILABLE' : 'UNAVAILABLE',
              status_message: availability.available ? 'This name is available in the live registry. Continue in NairaTag to sign the claim.' : availability.reason || 'This name is not available.',
              is_available: Boolean(availability.available)
            }
          };
        } catch (error) {
          responsePayload = {
            screen: 'CLAIM_SUMMARY',
            data: {
              tag_display: '₦' + cleanTag.toUpperCase(),
              status_badge: 'UNAVAILABLE',
              status_message: 'Could not verify this name right now. Please try again.',
              is_available: false
            }
          };
        }
      } else {
        responsePayload = {
          data: { acknowledged: true }
        };
      }

      const encryptedText = encryptResponse(responsePayload, aesKeyBuffer, initialVectorBuffer);
      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(encryptedText);
    } catch (err) {
      console.error('[Decryption Error]:', err.message);
      // HTTP 421 instructs client to refresh public key if decryption fails
      return res.status(421).send('Decryption failed');
    }
  }

  return res.status(405).send('Method Not Allowed');
}
