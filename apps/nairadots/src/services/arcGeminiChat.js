/**
 * Browser text-to-speech helpers for saved Arc chat responses.
 * AI requests and chat persistence run through the server-side Arc chat API.
 */
import { normalizeAgentLanguage } from './agentLanguage.js';

export function speakText(text, languagePreference = 'auto') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel();
    const clean = String(text || '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*_#`~\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const language = normalizeAgentLanguage(languagePreference);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const voiceLanguage = { yo: 'yo', pcm: 'pcm', ha: 'ha', ig: 'ig', en: 'en' }[language];
    if (language !== 'auto') utterance.lang = voiceLanguage || 'en';
    const matchingVoices = language === 'auto'
      ? voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'))
      : voices.filter((voice) => voice.lang.toLowerCase() === voiceLanguage || voice.lang.toLowerCase().startsWith(`${language}-`));
    const naturalVoice = matchingVoices.find((voice) => /Natural|Google|Samantha/i.test(voice.name)) || matchingVoices[0];
    if (naturalVoice) utterance.voice = naturalVoice;
    else if (language !== 'auto' && language !== 'en') return null;
    window.speechSynthesis.speak(utterance);
    return utterance;
  } catch (error) {
    console.warn('[Text-to-Speech]', error);
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch {}
  }
}
