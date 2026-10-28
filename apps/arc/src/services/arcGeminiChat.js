/**
 * High-Quality Voice Synthesis (Text-to-Speech) for NairaTag Chat
 * Prioritizes natural neural voices (Google / Microsoft Natural / Apple Enhanced)
 * and sanitizes markdown/crypto jargon so spoken output sounds human and clear.
 */
import { normalizeAgentLanguage } from './agentLanguage.js';

let cachedVoices = [];

function loadVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  if (cachedVoices.length) return cachedVoices;
  const list = window.speechSynthesis.getVoices();
  if (list.length) cachedVoices = list;
  return cachedVoices;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

/**
 * Sanitize markdown, crypto jargon, hex addresses, URLs, and symbols for natural speech.
 */
function cleanTextForSpeech(text) {
  if (!text) return '';
  return String(text)
    // Strip URLs
    .replace(/https?:\/\/\S+/g, '')
    // Strip hex addresses (e.g., 0x3600...0000 -> "contract address")
    .replace(/0x[a-fA-F0-9]{30,}/g, 'contract address')
    .replace(/0x[a-fA-F0-9]{4,10}…[a-fA-F0-9]{3,6}/g, 'wallet')
    // Format symbols for natural speech
    .replace(/₦([0-9,.]+)/g, '$1 Naira')
    .replace(/₦([A-Za-z0-9_]+)/g, 'NairaTag $1')
    .replace(/\$([0-9,.]+)/g, '$1 USDC')
    // Strip code blocks & inline backticks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Strip markdown formatting (*, _, #, ~, >, [ ], etc.)
    .replace(/[#*~_>]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Strip emojis
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    // Collapse spacing
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Choose the best natural / neural voice available
 */
function pickNaturalVoice(voices, lang = 'en') {
  if (!voices || !voices.length) return null;

  const targetLang = lang.toLowerCase();
  const matching = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(targetLang) || v.lang.toLowerCase().startsWith('en')
  );

  // Preference order:
  // 1. Natural / Online voices (Edge/Chrome/Safari high quality)
  // 2. Google neural voices
  // 3. Apple premium voices (Samantha, Siri, Karen, Daniel)
  // 4. Any voice that is NOT an old robotic desktop SAPI voice
  const priorityPatterns = [
    /Natural|Online \(Natural\)/i,
    /Google (US|UK) English/i,
    /Samantha|Aria|Jenny|Guy|Serena|Sonia/i,
    /Karen|Moira|Daniel|Alex/i,
  ];

  for (const pattern of priorityPatterns) {
    const found = matching.find((v) => pattern.test(v.name));
    if (found) return found;
  }

  // Fallback to any non-Desktop legacy voice if available
  const nonLegacy = matching.find((v) => !/Desktop|David|Zira|Hazel/i.test(v.name));
  return nonLegacy || matching[0] || voices[0];
}

export function speakText(text, languagePreference = 'auto') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  try {
    window.speechSynthesis.cancel();

    const clean = cleanTextForSpeech(text);
    if (!clean) return null;

    const language = normalizeAgentLanguage(languagePreference);
    const utterance = new SpeechSynthesisUtterance(clean);

    // Natural pacing and pitch
    utterance.rate = 0.98;
    utterance.pitch = 1.0;

    const voices = loadVoices();
    const langCode = { yo: 'yo', pcm: 'pcm', ha: 'ha', ig: 'ig', en: 'en' }[language] || 'en';
    if (language !== 'auto') utterance.lang = langCode;

    const naturalVoice = pickNaturalVoice(voices, langCode);
    if (naturalVoice) utterance.voice = naturalVoice;

    window.speechSynthesis.speak(utterance);
    return utterance;
  } catch (error) {
    console.warn('[Text-to-Speech]', error);
    return null;
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch {}
  }
}
