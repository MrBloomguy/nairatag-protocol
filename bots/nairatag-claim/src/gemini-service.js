/**
 * Gemini 2.5 Flash-Lite Intelligence Engine
 * Integrates Google Gemini Generative Language API with fallback capabilities
 * for NairaTag Autonomous Agent chat.
 */

const DEFAULT_GEMINI_KEY = process.env.GEMINI_API_KEY || '';

const CANDIDATE_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite'
];

function createGeminiService(options = {}) {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY;
  const primaryModel = options.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

  return {
    modelName: 'Gemini 2.5 Flash-Lite',
    primaryModel,

    /**
     * Generate content via Gemini 2.5 Flash-Lite (with graceful model fallback)
     */
    async generateResponse(userPrompt, context = {}) {
      if (!apiKey) {
        return null;
      }

      const senderTag = context.tag || '₦User';
      const senderWallet = context.wallet || '0x...';
      const network = context.network || 'Celo';

      const systemInstruction = `You are the NairaTag Autonomous Agent, powered by Google Gemini 2.5 Flash-Lite on ${network}.
Active User Identity: ${senderTag} (Wallet: ${senderWallet}).
Capabilities & Ecosystem:
- ₦Tag Decentralized Identity: Human-readable names on Celo (e.g., ₦michael, ₦mama, ₦dev).
- Payments & Transfers: Non-custodial instant cNGN transfers, bill splitting, and escrow contracts.
- Phone & Bank Resolver: Resolves Nigerian phone numbers (+234...) and NUBAN bank accounts to ₦Tags.
- Commerce & Food: Live food ordering via Chowdeck, Nigerian market price checks via OjaLM (Balogun, Computer Village, Alaba).
- Style: Helpful, sharp, concise, culturally attuned to Nigeria (naira symbol ₦, polite Nigerian tone when appropriate), well-formatted with markdown (*bold*, bullet points). Always offer relevant next steps or actions.`;

      const history = Array.isArray(context.messages) ? context.messages : [];

      // Try primary model first, followed by candidate fallbacks if 404 occurs
      const modelsToTry = [primaryModel, ...CANDIDATE_MODELS.filter(m => m !== primaryModel)];

      for (const model of modelsToTry) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

          const contents = [];
          for (const m of history.slice(-6)) {
            contents.push({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: String(m.content || m.text || '') }]
            });
          }
          contents.push({
            role: 'user',
            parts: [{ text: String(userPrompt || '') }]
          });

          const payload = {
            systemInstruction: {
              role: 'system',
              parts: [{ text: systemInstruction }]
            },
            contents,
            generationConfig: {
              maxOutputTokens: 600,
              temperature: 0.7
            }
          };

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.status === 404) {
            // Model discontinued or unavailable for this endpoint, try next in chain
            continue;
          }

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.warn(`[Gemini Service] Model ${model} returned ${response.status}:`, errData?.error?.message);
            continue;
          }

          const data = await response.json();
          const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate) {
            return {
              ok: true,
              text: candidate.trim(),
              model: 'Gemini 2.5 Flash-Lite',
              engineUsed: model
            };
          }
        } catch (err) {
          console.error(`[Gemini Service] Exception calling ${model}:`, err.message);
        }
      }

      return null;
    }
  };
}

module.exports = {
  createGeminiService,
  DEFAULT_GEMINI_KEY
};
