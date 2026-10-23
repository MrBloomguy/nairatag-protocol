/**
 * Browser text-to-speech helpers for saved Arc chat responses.
 * AI requests and chat persistence run through the server-side Arc chat API.
 */
export function speakText(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel();
    const clean = String(text || '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*_#`~\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.05;
    utterance.pitch = 1;
    const naturalVoice = window.speechSynthesis.getVoices().find((voice) =>
      voice.lang.startsWith('en') && /Natural|Google|Samantha/i.test(voice.name)
    );
    if (naturalVoice) utterance.voice = naturalVoice;
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
