export const AGENT_LANGUAGES = Object.freeze([
  { value: 'auto', label: 'Automatic', name: 'the language I use' },
  { value: 'en', label: 'English', name: 'English' },
  { value: 'yo', label: 'Yoruba', name: 'Yoruba' },
  { value: 'pcm', label: 'Nigerian Pidgin', name: 'Nigerian Pidgin' },
  { value: 'ha', label: 'Hausa', name: 'Hausa' },
  { value: 'ig', label: 'Igbo', name: 'Igbo' },
]);

const LANGUAGE_STORAGE_PREFIX = 'nairatag:agent-language:';

export function normalizeAgentLanguage(value) {
  const normalized = String(value || 'auto').trim().toLowerCase();
  return AGENT_LANGUAGES.some(({ value: supported }) => supported === normalized)
    ? normalized
    : 'auto';
}

export function getAgentLanguagePreference(walletAddress) {
  if (typeof window === 'undefined' || !walletAddress) return 'auto';
  try {
    return normalizeAgentLanguage(window.localStorage.getItem(`${LANGUAGE_STORAGE_PREFIX}${String(walletAddress).toLowerCase()}`));
  } catch {
    return 'auto';
  }
}

export function saveAgentLanguagePreference(walletAddress, language) {
  if (typeof window === 'undefined' || !walletAddress) return;
  try {
    window.localStorage.setItem(
      `${LANGUAGE_STORAGE_PREFIX}${String(walletAddress).toLowerCase()}`,
      normalizeAgentLanguage(language),
    );
  } catch {
    // The server profile remains authoritative if local storage is unavailable.
  }
}
