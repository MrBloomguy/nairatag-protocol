# NairaTag Browser Extension (Manifest V3)

The **NairaTag Browser Extension** transforms sovereign tag mentions (`₦MIKKI`, `₦ASAKE`, `₦SEGUN`) across 𝕏 (formerly Twitter) into interactive, actionable on-chain identity cards.

---

## Features
- **In-Timeline Tag Detection**: Uses high-performance `MutationObserver` with strict currency disambiguation (`₦5,000` is kept as fiat, while `₦MIKKI` becomes an interactive identity pill).
- **Interactive Micro-Card (Blink-style)**:
  - Tag verification badge (Dual-Rail: Chain 901 OP Stack + Base Sepolia Settlement).
  - One-click Send ₦ with quick amount chips (₦1k, ₦5k, ₦10k, ₦50k).
  - Instant Tip ₦ button.
  - Direct profile and claim routing.
  - Dedicated NGN receiving account details.
- **Theme Awareness**: Adapts automatically to 𝕏 Dim, Dark (Lights Out), and Default Light themes.

---

## Quick Installation in Chrome / Brave / Edge

1. Open your browser and navigate to `chrome://extensions` (or `brave://extensions` / `edge://extensions`).
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the directory:
   ```
   nairatag-network/extension
   ```
5. Pin the **NairaTag** extension icon to your browser toolbar.

---

## Testing & Verification

### Local Simulation Playground
Visit the local 𝕏 timeline simulator:
```
http://127.0.0.1:8088/hub/social-demo.html
```
- Click any green-accented tag pill (e.g. `₦MIKKI`).
- Test typing a new post in the composer (e.g. `Paying ₦5,000 to ₦ASAKE for tickets`).
- Verify in-timeline payment authorization and instant settlement toasts.

### Live on 𝕏 Web
- Navigate to `https://x.com` or `https://twitter.com`.
- Any post containing valid sovereign tags will automatically display interactive NairaTag pills.
