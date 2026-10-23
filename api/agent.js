/**
 * ═══════════════════════════════════════════════════════════════════════
 * NAIRATAG AGENTIC BRAIN (Gemini / OpenAI Tool-Calling + Intent Engine)
 * Autonomous conversational agent for WhatsApp with stateful memory & tools.
 * ═══════════════════════════════════════════════════════════════════════
 */

// In-memory session store for WhatsApp conversation context (survives warm lambdas)
import { checkTagAvailabilityAsync, getClaimRecord } from './claims.js';

const sessionStore = new Map();

function getSession(phone) {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (!sessionStore.has(cleanPhone)) {
    sessionStore.set(cleanPhone, {
      messages: [],
      context: {
        lastTag: null,
        pendingAction: null,
        pendingAmount: null,
        userTag: null,
        walletAddress: null
      },
      updatedAt: Date.now()
    });
  }
  return sessionStore.get(cleanPhone);
}

function updateSession(phone, updateFn) {
  const session = getSession(phone);
  updateFn(session);
  session.updatedAt = Date.now();
  // Keep last 12 messages for token efficiency
  if (session.messages.length > 12) {
    session.messages = session.messages.slice(-12);
  }
}

// Gemini 2.5 Flash-Lite integration (Google AI Studio)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const CANDIDATE_MODELS = ['gemini-2.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite'];

async function callGeminiFlashLite(session, userPrompt) {
  if (!GEMINI_API_KEY) return null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const systemInstruction = {
        role: 'system',
        parts: [{
          text: `You are the NairaTag assistant. Be concise and friendly. Never claim a tag is available, owned, claimed, resolved, paid, or linked to an account unless the live NairaTag service explicitly returned that result. This chat cannot submit wallet-signed claims or payments. Direct users to the NairaTag app for those actions.
- Be friendly, concise, and formatted for WhatsApp (use *bold* and bullet points).
- If the user asks to check, claim, or send money, mention the action clearly.`
        }]
      };

      const contents = session.messages.slice(-6).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      contents.push({ role: 'user', parts: [{ text: userPrompt }] });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction,
          contents,
          generationConfig: { maxOutputTokens: 350, temperature: 0.7 }
        })
      });

      if (response.status === 404) {
        continue;
      }
      if (!response.ok) continue;

      const data = await response.json();
      const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (candidate) return candidate.trim();
    } catch (err) {
      console.error(`[Gemini 2.5 Flash-Lite Error with ${model}]:`, err.message);
    }
  }
  return null;
}

export async function toolCheckTag(tag) {
  const clean = String(tag || '').replace(/^[₦@#]/, '').trim().toLowerCase();
  if (!clean || clean.length < 3 || clean.length > 32) return { available: false, reason: 'Tags must be between 3 and 32 characters.' };
  const result = await checkTagAvailabilityAsync(clean);
  return { available: Boolean(result.available), tag: clean, reason: result.reason || null, owner: result.owner || null };
}
export async function toolClaimTag() {
  return { success: false, error: 'A NairaTag claim requires a wallet signature. Open the NairaTag app to continue.' };
}
export async function toolResolveTag(tag) {
  const clean = String(tag || '').replace(/^[₦@#]/, '').trim().toLowerCase();
  const claim = await getClaimRecord(clean);
  if (!claim) return { found: false, tag: clean };
  return { found: true, tag: claim.tag, displayName: claim.tag, walletAddress: claim.address, network: claim.network || null, profileUrl: 'https://nairatag.ng/agent/' + encodeURIComponent(clean.toUpperCase()) };
}
export async function toolPreparePayment() {
  return { success: false, error: 'Payments cannot be initiated from this chat. Open the NairaTag app to review a wallet-signed payment.' };
}
export async function toolGetAccount() {
  return { found: false, message: 'Account details are available in the NairaTag app after signing in.' };
}
// ─────────────────────────────────────────────────────────────────────────────
// 2. AGENTIC REASONING & INTENT DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────

export async function processAgentTurn({ phone, userText }) {
  const session = getSession(phone);
  const text = String(userText || '').trim();
  const lower = text.toLowerCase();
  if (!text) return { text: 'Send a message or open the NairaTag app.' };

  session.messages.push({ role: 'user', content: text });
  updateSession(phone, () => {});

  const checkMatch = text.match(/(?:is\s+([₦@#]?[a-zA-Z0-9_]+)\s+available|check\s+(?:if\s+)?([₦@#]?[a-zA-Z0-9_]+)\s+(?:is\s+available|is\s+free)|check\s+name\s+([₦@#]?[a-zA-Z0-9_]+)|check\s+([₦@#]?[a-zA-Z0-9_]+))/i);
  const queriedTag = checkMatch ? (checkMatch[1] || checkMatch[2] || checkMatch[3] || checkMatch[4]) : null;
  let response;
  if (queriedTag) {
    const cleanTag = queriedTag.replace(/^[₦@#]/, '').toLowerCase();
    const result = await toolCheckTag(cleanTag);
    response = {
      text: result.available
        ? '₦' + cleanTag + ' is available in the live registry. Complete the wallet-signed claim in the NairaTag app.'
        : result.reason || '₦' + cleanTag + ' is not available.',
      buttons: [],
    };
  } else {
    const resolveMatch = text.match(/(?:who\s+is|resolve|lookup|find)\s+([₦@#]?[a-zA-Z0-9_]+)/i);
    if (resolveMatch) {
      const tag = resolveMatch[1].replace(/^[₦@#]/, '').toLowerCase();
      const resolved = await toolResolveTag(tag);
      response = {
        text: resolved.found
          ? resolved.tag + ' resolves to ' + resolved.walletAddress + (resolved.network ? ' on ' + resolved.network : '') + '. Profile: ' + resolved.profileUrl
          : 'No registered NairaTag was found for ' + tag + '.',
        buttons: [],
      };
    } else if (/(?:send|pay|transfer)\s+(?:₦\s*)?[0-9,]+(?:\.[0-9]+)?\s+(?:to|for)\s+/i.test(lower)) {
      response = { text: 'This chat cannot initiate payments. Open the NairaTag app to review and sign a transfer.', buttons: [] };
    } else if (/(?:claim|register|mint)\b/i.test(lower)) {
      response = { text: 'Claims require a wallet signature. Open the NairaTag app to check availability and complete your claim: https://nairatag.ng/claim', buttons: [] };
    } else if (/(?:my\s+tag|my\s+profile|my\s+wallet|my\s+balance|portfolio|account)/i.test(lower)) {
      response = { text: 'Sign in to the NairaTag app to view your tag and linked wallet. No account details are linked to this chat.', buttons: [] };
    } else if (/(?:what\s+is|how\s+does|explain|help|voucher|faq)/i.test(lower)) {
      response = { text: 'NairaTag links a readable tag to an Arc wallet. Claims and payments are completed in the app with wallet approval.', buttons: [] };
    } else {
      const answer = await callGeminiFlashLite(session, text);
      response = answer
        ? { text: answer, buttons: [] }
        : { text: 'Chat is temporarily unavailable. No claim, account change, or payment was made. Please use the NairaTag app for account actions.', buttons: [] };
    }
  }

  session.messages.push({ role: 'assistant', content: response.text });
  updateSession(phone, () => {});
  return response;
}