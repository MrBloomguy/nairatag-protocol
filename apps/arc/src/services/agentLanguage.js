export const AGENT_LANGUAGES = Object.freeze([
  { value: 'auto', label: 'Automatic', name: 'the language I use' },
  { value: 'en', label: 'English', name: 'English' }, { value: 'yo', label: 'Yoruba', name: 'Yoruba' },
  { value: 'pcm', label: 'Nigerian Pidgin', name: 'Nigerian Pidgin' }, { value: 'ha', label: 'Hausa', name: 'Hausa' },
  { value: 'ig', label: 'Igbo', name: 'Igbo' },
]);
const preferences = new Map();
export function normalizeAgentLanguage(value) {
  const normalized = String(value || 'auto').trim().toLowerCase();
  return AGENT_LANGUAGES.some(({ value: supported }) => supported === normalized) ? normalized : 'auto';
}
export function getAgentLanguagePreference(walletAddress) { return preferences.get(String(walletAddress || '').toLowerCase()) || 'auto'; }
export function saveAgentLanguagePreference(walletAddress, language) {
  if (!walletAddress) return;
  preferences.set(String(walletAddress).toLowerCase(), normalizeAgentLanguage(language));
}
