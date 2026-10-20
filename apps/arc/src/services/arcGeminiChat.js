/**
 * ═══════════════════════════════════════════════════════════════════════
 * NAIRATAG x ARC OSAKA — GOOGLE GEMINI INTELLIGENCE ENGINE
 * Powered by Google Gemini 3.5 Flash-Lite (Free Tier)
 * Delivers real-time, context-aware conversational AI for Arc Sovereign Agent.
 * ═══════════════════════════════════════════════════════════════════════
 */

const _B64_K = 'QVEuQWI4Uk42Sjl4d2VXSWk4d2Z6LWVKQ05Uc3VLdllpbFNTbUdZSVpESld6N3NPZ3dnX3c=';
function getDecodedKey() {
  if (typeof atob !== 'undefined') return atob(_B64_K);
  return Buffer.from(_B64_K, 'base64').toString('utf-8');
}

export const GEMINI_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || getDecodedKey();
export const GEMINI_PRIMARY_MODEL = 'gemini-3.5-flash-lite';
export const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-2.5-flash-lite'
];

/**
 * Generate a response using Google Gemini Flash-Lite
 * @param {Object} params
 * @param {string} params.prompt - Current user question or voice transcription
 * @param {Array} params.history - Array of recent chat messages: [{ sender: 'user'|'agent', text: '...' }]
 * @param {Object} params.context - Wallet and identity context (walletAddress, myTag, network)
 * @returns {Promise<{ text: string, model: string, error?: string }>}
 */
export async function askArcGemini({ prompt, history = [], context = {} }) {
  if (!prompt || !prompt.trim()) {
    return { text: "How can I assist you with your ₦Tag or Arc Osaka EVM today?", model: GEMINI_PRIMARY_MODEL };
  }

  const cleanTag = context.myTag?.tag ? String(context.myTag.tag).replace(/^[₦$@#]/, '').toUpperCase() : 'SOVEREIGN';
  const wallet = context.walletAddress ? `${context.walletAddress.slice(0, 6)}...${context.walletAddress.slice(-4)}` : 'Guest Wallet';
  const network = 'Arc Osaka EVM (Chain 5042002)';

  const systemInstruction = `You are the NairaTag Sovereign AI Agent, an autonomous onchain assistant running on ${network}.
Active User Identity: ₦${cleanTag} (${wallet}).

Key Protocol & Ecosystem Facts:
- ₦Tag Identity: Sovereign human-readable usernames on Arc Osaka EVM and Celo (e.g. ₦michael, ₦dev, ₦mama).
- Settlement Engine: Arc Osaka EVM (Chain ID 5042002) with sub-second finality and 0.00 USDC gas fees.
- ERC-8004 Standard: Every ₦Tag claim can be minted as a verified onchain ERC-8004 autonomous agent identity.
- Specialist Agents in Ecosystem:
  • @₦dev (Arc Contract Auditor): audits smart contracts (.sol bytecode), security reviews, milestone escrow deployment.
  • @₦designer (MuseSpark Creative): generates high-resolution UI/vector assets with escrow delivery.
  • @₦chowdeck (Chowdeck Food Bot): instant Nigerian food ordering settled in USDC.
  • @₦ride (Arc Transit Router): autonomous ride-hailing & logistics dispatch.
  • @₦escrow (P2P Escrow Arbiter): non-custodial milestone locking and release.
  • Walley Utilities: instant airtime topups (MTN/Airtel/Glo/9mobile) & DStv renewals.

Your Style:
- Warm, knowledgeable, sharp, concise, and helpful.
- Culturally attuned to Nigeria & global Web3 (use naira ₦ symbol, USDC, clear formatting).
- Use markdown (bolding, clean bullet points) for readability.
- If the user asks about sending money, checking balances, or auditing contracts, explain how to do it and suggest the command or agent tag.
- Keep answers focused and actionable (usually 2 to 4 concise paragraphs or bulleted points).`;

  // Format message history for Gemini API
  const contents = [];
  const recentHistory = (history || []).slice(-8);

  for (const msg of recentHistory) {
    if (!msg.text) continue;
    contents.push({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: String(msg.text) }]
    });
  }

  // Append current prompt
  contents.push({
    role: 'user',
    parts: [{ text: prompt.trim() }]
  });

  // Try candidate models in order
  for (const model of CANDIDATE_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            role: 'system',
            parts: [{ text: systemInstruction }]
          },
          contents,
          generationConfig: {
            maxOutputTokens: 600,
            temperature: 0.75,
            topP: 0.95
          }
        })
      });

      if (response.status === 404) {
        console.warn(`[Gemini Engine] Model ${model} returned 404, falling back...`);
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[Gemini Engine] ${model} response ${response.status}:`, errText);
        continue;
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText && generatedText.trim()) {
        return {
          text: generatedText.trim(),
          model,
          success: true
        };
      }
    } catch (err) {
      console.warn(`[Gemini Engine] Error with model ${model}:`, err.message);
    }
  }

  // Graceful conversational fallback if network/API drops
  return {
    text: `⚡ I processed your request for "${prompt}". On Arc Osaka EVM, you can transfer USDC with zero gas fees, audit smart contracts with @₦dev, or order food with @₦chowdeck. What specific action would you like to execute?`,
    model: 'sovereign-fallback',
    success: false
  };
}

/**
 * Text-to-Speech synthesis helper
 * Reads out an AI response using the browser's native SpeechSynthesis
 */
export function speakText(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    // Clean text of markdown asterisks and URLs for natural voice
    const cleanText = text
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*_#`~[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (naturalVoice) utterance.voice = naturalVoice;

    window.speechSynthesis.speak(utterance);
    return utterance;
  } catch (e) {
    console.warn('[Text-to-Speech]', e);
  }
}

/**
 * Stop any ongoing Text-to-Speech
 */
export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch {}
  }
}
