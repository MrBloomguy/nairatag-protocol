import crypto from 'node:crypto';

// Embedded RSA Private Key matching the VALID registered public key on Meta Cloud API
const PRIVATE_KEY_PEM = process.env.WHATSAPP_FLOW_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDe8KbLTeaKzo3Q
Ok+5+jEdMz/v8rMQSn8APc/KE7/4x/qMuv6TPPIHpErjl1emLsJAUyjdVNRNWaeC
Vh4na68v8KnfFN1RpY3jbN4MH0k/SPT28VlkcAA0r17OttMWKMqqnmmZKqA+ukm2
dDWDkx5lDfhNF/lK01AZU2ZlfImGMZsmNXY+iYw40HFLhZva53wRpQviYqkvBNqJ
CmYBwWhM379CuPwdISUZQOWMO9zHR4/OKXUgXLAZ++M/1q9Qt7WGOgsnd8NdftRA
cuvL9QF0qb0K0LUBvu8DT5C92bRd//2V9MgM2X42+FZzdt0d9ExAPGZUhRMtTwiy
k5X0X+VZAgMBAAECggEAKI3LMYlaqh5XwqyQyypdW8vyUgIqm4iJoLAdx8se7TDn
fUkYvQzllAlJTCxAF+1CjbPy54wiUG3CIF3s/0vB4u0a4YcomU0NyfSIUdkxGE97
rB4MHk6XYv4Rt3WfYVULRM0rNV8BJlf5x7RM9cHB0i0f4Vo+kWNuGyVGJ6jnVV8C
w9i9JERIvo1tE+YqDUINKKchS+DKfosM3c5rDHtH8SC352YkRo6PYI0tVhHeQTG5
JUR+T2ehFf25LE4znXfqYjQWSYxa+lgHg5uaTabSZfZfhVaAKDXP7MGs65eHECTE
3UoQgGZl9LJGM2At85roTHI1/OzrpqG66Otwkl3INwKBgQD0PPNaOh365RXB19rb
1z1KyIKP8AKzouGQUMKJ/c5/aBk7HM54er7pLa8rDKeknPoDW9wWqd6YozC1SC9x
LgIJ/Of9ezrMktnGkOUqJMyIs23IY2bVBO5DDAuIiLj1F9YZfZ4un1V7IIJNG7O8
eg9zxTgkLimsPrJOdDbmXeXjywKBgQDprSGpq0t0D9CNuyBqthal1JRUIlhvcnGI
HEXSkbC9ZoGKqbMpZajJpRoOsR1a2tbuRUeGxXl5mMTy2XE84C7h1JN7+xj+rc4l
iktOwzt/FV+dAQt3KJySyU9FEb197PRNjTuDvXF+dqXnYPdggghjCF4mMCEsmOxt
OX2gfDIe6wKBgQDSGPxdyVCw2w/0R/ME2grnocRufVBVpu/SbSZr/eD8yFer+gPC
sBQ6Egp1RdWQTVjkOskA1e+d7gOgbhAhlCo83UnTS4YxJMIhhdMchbtMfM0bbCax
aCRtmJbzRGmWrIKIOv8vq/CkkjqEiif7IiTYufapaOyANw67Xk07rdpsMQKBgEtx
mUe1RTQgkv3fZ5TsWx2JJ6aOPC0nLt55+lUEsqJDwRkqtuxrpPYNdv89UbPuqavd
9Dzf7ttCZnvdlkDIRHqm7kL+C9DV/pOCNdQlFkVueiMvnisHkp2VnyE2nA5W/X04
VvmupUDmP6QXW2buNJT8s6DysxM6AEM3Z4bz8h6nAoGBAN+sXaDpo0/eNF40y7ki
gRUV6i4xZn81Lq7cq6lL0KCSFjgx8c214Uh5ljEPE90oa73DD6qxjSz5360f+Gei
L8tdxRv8fh5J152t3kFa9qjEfMISio1snVBuTBBsB89bJ6Qu3JN3EddGdWoe5XLP
2C7AV1j1JhnAg9wk08LStCc3
-----END PRIVATE KEY-----`;

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
        const rawTag = data?.tag_name || data?.tag_input || 'michael';
        const cleanTag = String(rawTag).replace(/^[₦#@]/, '').trim().toUpperCase();

        responsePayload = {
          screen: 'CLAIM_SUMMARY',
          data: {
            tag_display: `₦${cleanTag}`,
            status_badge: '🟢 AVAILABLE',
            status_message: 'This name is available for claim.',
            is_available: true
          }
        };
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
