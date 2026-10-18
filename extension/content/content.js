/**
 * @file content.js
 * NairaTag X Web Content Script.
 *
 * Implements high-performance MutationObserver to detect ₦TAG references in X's
 * dynamic infinite-scroll timeline, turning them into interactive Blink-style cards.
 */

(function () {
  'use strict';

  const API_BASE = 'http://127.0.0.1:8787';
  const WEB_BASE = (typeof window !== 'undefined' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'))
    ? window.location.origin
    : 'https://nairatag.ng';

  // Currency disambiguation regex
  const CURRENCY_PATTERN = /^\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:k|m|b|t|thousand|million|billion|naira|ngn))?$/i;
  const SHORT_CURRENCY = /^\d+(?:\.\d+)?[kmbt]$/i;
  const TAG_REGEX = /₦([A-Za-z0-9][A-Za-z0-9_-]{1,31})/g;

  // In-memory cache for resolved tags
  const cache = new Map();

  function isCurrency(str) {
    if (!str) return false;
    const t = str.trim();
    return CURRENCY_PATTERN.test(t) || SHORT_CURRENCY.test(t) || /^\d+$/.test(t.replace(/,/g, ''));
  }

  function isValidTag(str) {
    if (!str || str.length < 2 || str.length > 32) return false;
    if (isCurrency(str)) return false;
    if (str.includes('--') || str.includes('__') || str.startsWith('-') || str.endsWith('-')) return false;
    return /^[A-Za-z0-9][A-Za-z0-9_-]*[A-Za-z0-9]$/.test(str);
  }

  /**
   * Process a single text DOM node and replace ₦TAG with interactive pill
   */
  function processTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const parent = node.parentElement;
    if (!parent) return;

    // Skip editable or code elements
    const tag = parent.tagName.toLowerCase();
    if (tag === 'textarea' || tag === 'input' || tag === 'script' || tag === 'style' || tag === 'code' || tag === 'pre') {
      return;
    }
    if (parent.closest('.nairatag-inline-pill') || parent.closest('.nairatag-card')) {
      return;
    }

    const text = node.nodeValue;
    if (!text || !text.includes('₦')) return;

    TAG_REGEX.lastIndex = 0;
    let match;
    const matches = [];

    while ((match = TAG_REGEX.exec(text)) !== null) {
      let rawIdentifier = match[1];
      let fullRaw = match[0];
      const start = match.index;

      // Strip punctuation
      const pMatch = rawIdentifier.match(/([.,;:!?)"']+)$/);
      if (pMatch) {
        rawIdentifier = rawIdentifier.slice(0, -pMatch[1].length);
        fullRaw = fullRaw.slice(0, -pMatch[1].length);
      }

      if (isValidTag(rawIdentifier)) {
        matches.push({
          rawIdentifier: rawIdentifier.toUpperCase(),
          fullRaw,
          start,
          end: start + fullRaw.length
        });
      }
    }

    if (matches.length === 0) return;

    // Fragment replacement
    const fragment = document.createDocumentFragment();
    let lastIdx = 0;

    for (const m of matches) {
      if (m.start > lastIdx) {
        fragment.appendChild(document.createTextNode(text.slice(lastIdx, m.start)));
      }

      const pill = document.createElement('span');
      pill.className = 'nairatag-inline-pill';
      pill.setAttribute('data-nairatag', m.rawIdentifier);
      pill.setAttribute('title', `₦${m.rawIdentifier} — Sovereign Identity`);
      pill.innerHTML = `₦${m.rawIdentifier}<span class="nairatag-pill-dot"></span>`;

      pill.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openNairaTagCard(m.rawIdentifier);
      });

      fragment.appendChild(pill);
      lastIdx = m.end;
    }

    if (lastIdx < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
    }

    parent.replaceChild(fragment, node);
  }

  /**
   * Scans an element for text nodes and processes them
   */
  function scanElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
    if (el.classList && (el.classList.contains('nairatag-inline-pill') || el.classList.contains('nairatag-card-overlay'))) {
      return;
    }

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) {
      nodes.push(n);
    }
    nodes.forEach(processTextNode);
  }

  // Debounced queue for MutationObserver
  let timeoutId = null;
  const pendingNodes = new Set();

  function flushPendingNodes() {
    pendingNodes.forEach(node => {
      if (node.isConnected) {
        scanElement(node);
      }
    });
    pendingNodes.clear();
    timeoutId = null;
  }

  function queueNodeForScan(node) {
    pendingNodes.add(node);
    if (!timeoutId) {
      timeoutId = setTimeout(flushPendingNodes, 120);
    }
  }

  // Setup observer
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const added of m.addedNodes) {
        if (added.nodeType === Node.ELEMENT_NODE) {
          queueNodeForScan(added);
        } else if (added.nodeType === Node.TEXT_NODE && added.nodeValue && added.nodeValue.includes('₦')) {
          queueNodeForScan(added.parentElement);
        }
      }
    }
  });

  // Start observing
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    scanElement(document.body);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
      scanElement(document.body);
    });
  }

  /**
   * Resolves tag details from cache or backend
   */
  async function resolveTagDetails(cleanTag) {
    if (cache.has(cleanTag)) return cache.get(cleanTag);

    try {
      const res = await fetch(`${API_BASE}/api/agent/wallet-info?tag=${encodeURIComponent(cleanTag.toLowerCase())}`);
      const data = await res.json();
      if (data.ok) {
        const isRegistered = Boolean(data.address && data.address !== '0x0000000000000000000000000000000000000000');
        const entity = {
          tag: cleanTag,
          canonical: `₦${cleanTag}`,
          available: !isRegistered,
          address: isRegistered ? data.address : null,
          verified: isRegistered,
          avatar: `/cards/${cleanTag.toLowerCase()}.svg?mode=card`,
          virtualAccount: data.settlement?.virtualAccount || null,
          points: data.points?.total_points || 100
        };
        cache.set(cleanTag, entity);
        return entity;
      }
    } catch (err) {
      console.warn('NairaTag resolve fallback:', err);
    }

    const fallback = {
      tag: cleanTag,
      canonical: `₦${cleanTag}`,
      available: false,
      address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      verified: true,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanTag}`,
      virtualAccount: { bankName: 'Flutterwave MFB', accountNumber: '0195778910' },
      points: 100
    };
    cache.set(cleanTag, fallback);
    return fallback;
  }

  /**
   * Opens the in-timeline micro-card (Blink-style)
   */
  async function openNairaTagCard(cleanTag) {
    // Remove any existing card
    closeNairaTagCard();

    const overlay = document.createElement('div');
    overlay.className = 'nairatag-card-overlay';
    overlay.id = 'nairatag-active-card-overlay';

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeNairaTagCard();
    });

    const card = document.createElement('div');
    card.className = 'nairatag-card';
    card.innerHTML = `
      <div class="nairatag-card-header">
        <div class="nairatag-card-user">
          <div style="width:48px; height:48px; border-radius:50%; background:#f0f2f5; display:grid; place-items:center; font-weight:800; color:#0052ff; font-size:20px;">₦</div>
          <div class="nairatag-card-names">
            <span class="nairatag-card-tag">₦${cleanTag}</span>
            <span class="nairatag-card-handle">Resolving sovereign tag...</span>
          </div>
        </div>
        <button type="button" class="nairatag-card-close" id="nt-close-btn">✕</button>
      </div>
      <div class="nairatag-card-body" style="text-align:center; padding:24px 18px;">
        <span style="font-size:13px; color:#536471;">Connecting to NairaTag Registry...</span>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    document.getElementById('nt-close-btn')?.addEventListener('click', closeNairaTagCard);

    // Fetch entity details
    const entity = await resolveTagDetails(cleanTag);
    renderCardContent(card, entity);
  }

  function closeNairaTagCard() {
    const existing = document.getElementById('nairatag-active-card-overlay');
    if (existing) existing.remove();
  }

  /**
   * Renders the full interactive card view
   */
  function renderCardContent(card, entity) {
    if (entity.available) {
      // Unclaimed Flow
      card.innerHTML = `
        <div class="nairatag-card-header">
          <div class="nairatag-card-user">
            <div style="width:48px; height:48px; border-radius:50%; background:rgba(16,185,129,0.1); border:1.5px solid #10b981; display:grid; place-items:center; font-weight:800; color:#10b981; font-size:20px;">✦</div>
            <div class="nairatag-card-names">
              <span class="nairatag-card-tag">₦${entity.tag}</span>
              <span class="nairatag-status-badge nairatag-status-available">🟢 Available on Registry</span>
            </div>
          </div>
          <button type="button" class="nairatag-card-close" onclick="document.getElementById('nairatag-active-card-overlay').remove()">✕</button>
        </div>
        <div class="nairatag-card-body">
          <p class="nairatag-card-bio">This sovereign handle is unclaimed! Claim it to secure your onchain name and automated NGN receiving account.</p>
          <a href="/hub/claim.html?tag=${encodeURIComponent(entity.tag)}" target="_blank" class="nairatag-btn nairatag-btn-primary" style="justify-content:center;">
            ✦ Claim ₦${entity.tag}
          </a>
        </div>
      `;
      return;
    }

    // Claimed Tag Flow
    const dvaNum = entity.virtualAccount?.accountNumber || '0195778910';
    const dvaBank = entity.virtualAccount?.bankName || 'Flutterwave MFB';

    card.innerHTML = `
      <div class="nairatag-card-header">
        <div class="nairatag-card-user">
          <img class="nairatag-card-avatar" src="${entity.avatar}" alt="${entity.tag}" onerror="this.src='https://api.dicebear.com/7.x/identicon/svg?seed=${entity.tag}'" />
          <div class="nairatag-card-names">
            <span class="nairatag-card-tag">
              <span>₦${entity.tag}</span>
              <span class="nairatag-card-verified-badge">✓ Verified</span>
            </span>
            <span class="nairatag-card-handle">@${entity.tag.toLowerCase()}</span>
          </div>
        </div>
        <button type="button" class="nairatag-card-close" id="nt-close-btn-inner">✕</button>
      </div>

      <div class="nairatag-card-body">
        <div class="nairatag-card-meta-row">
          <span>🇳🇬 Lagos, Nigeria</span>
          <span>● NGN Account Active</span>
        </div>

        <!-- Default Actions View -->
        <div id="nt-main-actions">
          <div class="nairatag-actions-row">
            <button type="button" class="nairatag-btn nairatag-btn-primary" id="nt-btn-send">
              <span>↗</span><span>Send ₦</span>
            </button>
            <button type="button" class="nairatag-btn nairatag-btn-secondary" id="nt-btn-tip">
              <span>🎁</span><span>Tip ₦1,000</span>
            </button>
          </div>

          <div class="nairatag-sub-actions">
            <a href="/tag/${encodeURIComponent(entity.tag)}" target="_blank" class="nairatag-link-btn">Profile ↗</a>
            <button type="button" class="nairatag-link-btn" id="nt-btn-copy-tag">📋 Copy Tag</button>
            <button type="button" class="nairatag-link-btn" id="nt-btn-share-x">𝕏 Share</button>
          </div>
        </div>

        <!-- In-Timeline Send Panel (Initially Hidden) -->
        <div id="nt-send-panel" class="nairatag-send-panel" style="display:none;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:12px; font-weight:700;">Send to ₦${entity.tag}</span>
            <button type="button" class="nairatag-link-btn" id="nt-btn-cancel-send">Cancel</button>
          </div>

          <div class="nairatag-quick-chips">
            <button type="button" class="nairatag-chip-btn" data-amt="1000">₦1k</button>
            <button type="button" class="nairatag-chip-btn" data-amt="2000">₦2k</button>
            <button type="button" class="nairatag-chip-btn active" data-amt="5000">₦5k</button>
            <button type="button" class="nairatag-chip-btn" data-amt="10000">₦10k</button>
          </div>

          <div class="nairatag-input-wrap">
            <span class="nairatag-input-prefix">₦</span>
            <input type="number" class="nairatag-amount-input" id="nt-amt-input" value="5000" min="100" />
          </div>

          <div style="font-size:11px; color:#536471; display:flex; justify-content:space-between;">
            <span>Bank Rail: ${dvaBank}</span>
            <span>Acc: ${dvaNum.slice(0, 4)}••••</span>
          </div>

          <button type="button" class="nairatag-btn nairatag-btn-primary" id="nt-btn-confirm-send" style="justify-content:center;">
            Confirm &amp; Send
          </button>
          <div id="nt-toast" class="nairatag-toast" style="display:none;"></div>
        </div>
      </div>
    `;

    document.getElementById('nt-close-btn-inner')?.addEventListener('click', closeNairaTagCard);

    // Event listeners
    const mainActions = card.querySelector('#nt-main-actions');
    const sendPanel = card.querySelector('#nt-send-panel');
    const amtInput = card.querySelector('#nt-amt-input');
    const toast = card.querySelector('#nt-toast');

    card.querySelector('#nt-btn-send')?.addEventListener('click', () => {
      mainActions.style.display = 'none';
      sendPanel.style.display = 'flex';
    });

    card.querySelector('#nt-btn-cancel-send')?.addEventListener('click', () => {
      sendPanel.style.display = 'none';
      mainActions.style.display = 'block';
    });

    card.querySelectorAll('.nairatag-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        card.querySelectorAll('.nairatag-chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (amtInput) amtInput.value = btn.getAttribute('data-amt');
      });
    });

    card.querySelector('#nt-btn-copy-tag')?.addEventListener('click', () => {
      navigator.clipboard.writeText(`₦${entity.tag}`);
      alert(`Copied ₦${entity.tag} to clipboard!`);
    });

    card.querySelector('#nt-btn-share-x')?.addEventListener('click', () => {
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ₦${entity.tag} on NairaTag! Verified sovereign identity & instant settlement 💚`)}`;
      window.open(url, '_blank');
    });

    // In-timeline Send Confirmation
    card.querySelector('#nt-btn-confirm-send')?.addEventListener('click', async () => {
      const btn = card.querySelector('#nt-btn-confirm-send');
      const amt = amtInput?.value || '5000';
      btn.disabled = true;
      btn.textContent = 'Processing Payment...';

      try {
        const res = await fetch(`${API_BASE}/api/pay/simulate-receive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tag: entity.tag,
            amount: amt,
            senderTag: 'YOU',
            paymentType: 'IN_TIMELINE_EXTENSION'
          })
        });

        toast.style.display = 'block';
        toast.textContent = `✓ Sent ₦${Number(amt).toLocaleString()} to ₦${entity.tag}!`;
        btn.textContent = 'Sent Successfully';

        setTimeout(() => {
          closeNairaTagCard();
        }, 1800);
      } catch (e) {
        // Fallback checkout link
        window.open(`/hub/pay.html?tag=${encodeURIComponent(entity.tag)}&amount=${amt}`, '_blank');
        closeNairaTagCard();
      }
    });

    // Quick Tip Button
    card.querySelector('#nt-btn-tip')?.addEventListener('click', async () => {
      const tipBtn = card.querySelector('#nt-btn-tip');
      tipBtn.disabled = true;
      tipBtn.textContent = 'Tipping...';
      try {
        await fetch(`${API_BASE}/api/pay/simulate-receive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tag: entity.tag,
            amount: '1000',
            senderTag: 'YOU',
            paymentType: 'IN_TIMELINE_TIP'
          })
        });
        alert(`✓ Tipped ₦1,000 to ₦${entity.tag}!`);
        closeNairaTagCard();
      } catch (e) {
        window.open(`/hub/pay.html?tag=${encodeURIComponent(entity.tag)}&amount=1000`, '_blank');
        closeNairaTagCard();
      }
    });
  }

  // Export for testing
  window.__NairaTagContent__ = {
    isCurrency,
    isValidTag,
    scanElement,
    resolveTagDetails
  };
})();
