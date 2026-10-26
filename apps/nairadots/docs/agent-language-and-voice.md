# NairaDots language and voice layer

## Architecture audit

- `src/components/chat/PersonalAgentPanel.jsx` stores the user's language preference on their personal-agent profile. The selector now uses explicit language codes for Automatic, English, Yoruba, Nigerian Pidgin, Hausa, and Igbo.
- `lib/arc/personal-agent-context.js` loads that preference for all tag-agent conversations, while private memories and goals remain restricted to the personal `arc` agent context.
- `lib/arc/chat.js` is the shared authenticated text-agent boundary. It loads the selected published agent and that agent's enabled tools, adds the language instruction, then retains the existing tool execution, run audit, and conversation persistence paths.
- `lib/arc/voice.js` creates the short-lived Gemini Live session. Voice function calls still return to the existing authenticated chat path and conversation.
- Wallet and Circle email sign-ins both become Arc sessions tied to the user's Arc wallet. The language preference follows that same account identity.

## Current implementation status

| Capability | Status |
|---|---|
| User-selected language setting | Implemented and persisted in the existing profile |
| Text replies in selected language | Wired through the shared Gemini chat prompt for all tag agents; native-speaker quality and tool-task acceptance still need validation |
| Existing agent tools and permissions | Reused without changing per-agent tool registration or execution |
| Live voice in English, Yoruba, Hausa | Routed through the existing Gemini Live path with the selected-language instruction |
| Live voice in Igbo and Nigerian Pidgin | Explicitly unavailable in the current Gemini Live route; the server returns an honest error instead of claiming support |
| Circle email and wallet authentication | Uses the existing Arc session verification and wallet-bound profile |
| Production inference for local-language ASR/TTS | Not deployed; no speech-model endpoint is configured in the current environment |

## Model candidates for the next voice phase

- **ASR:** [NaijaVox 2.0](https://huggingface.co/Axiveri/NaijaVox-2.0) covers Yoruba, Hausa, Igbo, Nigerian Pidgin, and Nigerian English under Apache 2.0. Its model-card WER results are author-reported on 50 samples per language, so they are a benchmark starting point rather than production evidence. Review underlying dataset notices separately.
- **TTS:** [Dynamic Accent Flash](https://huggingface.co/Modularcomputing/dynamic-accent-preview) covers code-switching among English, Yoruba, Hausa, Igbo, and Pidgin. The model card allows commercial use under CC-BY-SA 4.0 with attribution and share-alike conditions. It is a research release, requires CUDA, and reports weaker Pidgin results; native-speaker evaluation remains necessary.
- **N-ATLaS:** [N-ATLaS](https://huggingface.co/NCAIR1/N-ATLaS) is a useful text/ASR research candidate for Yoruba, Hausa, and Igbo, but its terms cap use at 1,000 active end users and require a separate commercial license above that threshold. It does not document Nigerian Pidgin as a supported language.
- **N-Atlas Toolkit:** [Toolkit repository](https://github.com/samolubukun/N-Atlas-Toolkit) is an integration/deployment toolkit; its README labels TTS and speech-to-speech as experimental/playground-only.

Gemini Live's [published supported-language list](https://ai.google.dev/gemini-api/docs/live-api/capabilities) includes Yoruba and Hausa, but does not list Igbo or Nigerian Pidgin. This is why those two languages are not advertised as live-voice capable by the current route.

## Next production work

1. Provision a private GPU inference service for NaijaVox ASR and Dynamic Accent TTS (or an equivalent provider with verified language quality and commercial terms).
2. Add authenticated, bounded audio-turn endpoints that submit transcripts through `lib/arc/chat.js` so voice shares tool authorization, memory, conversation context, and run auditing.
3. Keep raw audio retention disabled by default; add upload size, timeout, rate, and retry handling at the service boundary.
4. Run native-speaker tests for natural speech, code-switching, accents, noisy audio, tool calls, context continuity, and failure behavior before advertising Igbo/Pidgin voice.
5. Configure the production endpoint credentials only on the server, then run a real provider integration test.

## Verification

- Focused frontend language and agent-discovery tests: passing.
- Focused backend language tests and JavaScript syntax checks: passing.
- NairaDots production build: passing.
- The full app test command includes live NairaTag/Arc network checks; four checks failed because the environment could not resolve `nairatag.ng` and `rpc.testnet.arc.io`.
- No live Gemini call or local-language speech-model call was performed in this work session.
