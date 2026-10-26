export const AGENT_LANGUAGE_NAMES = Object.freeze({
  auto: 'Automatic',
  en: 'English',
  yo: 'Yoruba',
  pcm: 'Nigerian Pidgin',
  ha: 'Hausa',
  ig: 'Igbo',
});

const LANGUAGE_ALIASES = Object.freeze({
  automatic: 'auto',
  english: 'en',
  yoruba: 'yo',
  pidgin: 'pcm',
  'nigerian pidgin': 'pcm',
  hausa: 'ha',
  igbo: 'ig',
});

export function normalizeAgentLanguage(value) {
  const language = String(value || 'auto').normalize('NFKC').trim().toLowerCase();
  const normalized = LANGUAGE_ALIASES[language] || language;
  return Object.hasOwn(AGENT_LANGUAGE_NAMES, normalized) ? normalized : 'auto';
}

export function agentLanguageName(value) {
  return AGENT_LANGUAGE_NAMES[normalizeAgentLanguage(value)];
}

export function buildAgentLanguageInstruction(value) {
  const language = normalizeAgentLanguage(value);
  if (language === 'auto') {
    return 'Respond in the language the user used most recently. Keep their language and register natural; if they code-switch, follow their mix unless they ask otherwise.';
  }
  return `The user's selected response language is ${agentLanguageName(language)}. Reply in ${agentLanguageName(language)} unless they explicitly ask for another language. Preserve NairaTags, names, URLs, code, identifiers, amounts, and exact tool arguments where needed. Do not change this agent's identity, role, instructions, permissions, tools, confirmation requirements, or task behavior to accommodate the language.`;
}

// Gemini Live's published language list includes Yoruba and Hausa, but not Igbo or Nigerian Pidgin.
// Those languages need the dedicated ASR/TTS path before live voice can be advertised as supported.
export function isGeminiLiveLanguageSupported(value) {
  return ['auto', 'en', 'yo', 'ha'].includes(normalizeAgentLanguage(value));
}