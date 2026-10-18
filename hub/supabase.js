/**
 * ═══════════════════════════════════════════════════════════════════════
 * NAIRATAG SUPABASE CLIENT & AUTH ENGINE (Browser & Hub dApp)
 * Connects directly to Supabase for:
 * 1. Profiles & Claims (user_claims table)
 * 2. Points & Rewards (user_points table)
 * 3. Full Supabase Auth (Sign Up, Sign In, Sign Out, Session state)
 * ═══════════════════════════════════════════════════════════════════════
 */

(function () {
  const SUPABASE_URL = 'https://bbpdupijsgdghemfpijr.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_3mRhhwX9BhnJyobyCX7uWw_h2-idCPf';

  let supabaseClient = null;

  function initSupabase() {
    if (supabaseClient) return supabaseClient;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      return supabaseClient;
    }
    return null;
  }

  // Auto-init on script load
  const client = initSupabase();

  window.NairaTagSupabase = {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    getClient: initSupabase,

    // ─────────────────────────────────────────────────────────────────
    // AUTHENTICATION SYSTEM (Supabase Auth)
    // ─────────────────────────────────────────────────────────────────
    async signUp(email, password, userMetadata = {}) {
      const sb = initSupabase();
      if (!sb) throw new Error('Supabase SDK not loaded');
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: userMetadata }
      });
      if (error) throw error;
      this.updateNavbarAuthUI(data.user);
      return data;
    },

    async signIn(email, password) {
      const sb = initSupabase();
      if (!sb) throw new Error('Supabase SDK not loaded');
      const { data, error } = await sb.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      this.updateNavbarAuthUI(data.user);
      return data;
    },

    async signInWithOtp(email) {
      const sb = initSupabase();
      if (!sb) throw new Error('Supabase SDK not loaded');
      const { data, error } = await sb.auth.signInWithOtp({ email });
      if (error) throw error;
      return data;
    },

    async signOut() {
      const sb = initSupabase();
      if (sb) {
        await sb.auth.signOut();
      }
      this.updateNavbarAuthUI(null);
      window.dispatchEvent(new CustomEvent('nairatag:auth:logout'));
    },

    async getUser() {
      const sb = initSupabase();
      if (!sb) return null;
      try {
        const { data: { user } } = await sb.auth.getUser();
        return user || null;
      } catch {
        return null;
      }
    },

    async getSession() {
      const sb = initSupabase();
      if (!sb) return null;
      try {
        const { data: { session } } = await sb.auth.getSession();
        return session || null;
      } catch {
        return null;
      }
    },

    // ─────────────────────────────────────────────────────────────────
    // DATA LAYER (Profiles, Claims & Points)
    // ─────────────────────────────────────────────────────────────────
    async getClaimByWallet(walletAddress) {
      if (!walletAddress) return null;
      const norm = walletAddress.trim().toLowerCase();

      const sb = initSupabase();
      if (sb) {
        try {
          const { data, error } = await sb
            .from('user_claims')
            .select('*')
            .ilike('wallet_address', norm)
            .maybeSingle();

          if (!error && data) return data;
        } catch (e) {
          console.warn('[Supabase getClaimByWallet error]', e);
        }
      }

      try {
        const res = await fetch(`/api/claims?wallet=${encodeURIComponent(norm)}`);
        const json = await res.json();
        if (json.ok && json.claim) return json.claim;
      } catch (e) {}

      return null;
    },

    async getClaimByTag(tag) {
      if (!tag) return null;
      const clean = String(tag).trim().replace(/^[₦@#]/, '').toLowerCase();

      const sb = initSupabase();
      if (sb) {
        try {
          const { data, error } = await sb
            .from('user_claims')
            .select('*')
            .ilike('clean_tag', clean)
            .maybeSingle();

          if (!error && data) return data;
        } catch (e) {
          console.warn('[Supabase getClaimByTag error]', e);
        }
      }

      try {
        const res = await fetch(`/api/claims?action=resolve&tag=${encodeURIComponent(clean)}`);
        const json = await res.json();
        if (json.ok) return json;
      } catch (e) {}

      return null;
    },

    async getAllClaims() {
      const sb = initSupabase();
      if (sb) {
        try {
          const { data, error } = await sb
            .from('user_claims')
            .select('*')
            .order('claimed_at', { ascending: false });

          if (!error && data && data.length > 0) return data;
        } catch (e) {
          console.warn('[Supabase getAllClaims error]', e);
        }
      }

      try {
        const res = await fetch('/api/claims');
        const json = await res.json();
        if (json.ok && json.claims) return json.claims;
      } catch (e) {}

      return [];
    },

    async getUserPoints(walletAddress) {
      if (!walletAddress) return null;
      const norm = walletAddress.trim().toLowerCase();

      const sb = initSupabase();
      if (sb) {
        try {
          const { data, error } = await sb
            .from('user_points')
            .select('*')
            .ilike('wallet_address', norm)
            .maybeSingle();

          if (!error && data) return data;
        } catch (e) {
          console.warn('[Supabase getUserPoints error]', e);
        }
      }

      try {
        const res = await fetch(`/api/points?wallet=${encodeURIComponent(norm)}`);
        const json = await res.json();
        if (json.ok) return json;
      } catch (e) {}

      return null;
    },

    // ─────────────────────────────────────────────────────────────────
    // AUTH MODAL & NAVBAR INJECTION UI
    // ─────────────────────────────────────────────────────────────────
    openAuthModal(defaultMode = 'signin') {
      const modal = document.getElementById('supabase-auth-modal');
      if (modal) {
        this.switchAuthTab(defaultMode);
        modal.style.display = 'flex';
      }
    },

    closeAuthModal() {
      const modal = document.getElementById('supabase-auth-modal');
      if (modal) {
        modal.style.display = 'none';
        const msg = document.getElementById('auth-modal-msg');
        if (msg) msg.textContent = '';
      }
    },

    switchAuthTab(tab) {
      const signinForm = document.getElementById('auth-signin-form');
      const signupForm = document.getElementById('auth-signup-form');
      const btnTabIn = document.getElementById('tab-btn-signin');
      const btnTabUp = document.getElementById('tab-btn-signup');
      const msg = document.getElementById('auth-modal-msg');
      if (msg) msg.textContent = '';

      if (tab === 'signup') {
        if (signinForm) signinForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'flex';
        btnTabUp?.classList.add('active');
        btnTabIn?.classList.remove('active');
      } else {
        if (signinForm) signinForm.style.display = 'flex';
        if (signupForm) signupForm.style.display = 'none';
        btnTabIn?.classList.add('active');
        btnTabUp?.classList.remove('active');
      }
    },

    updateNavbarAuthUI(user) {
      const btn = document.getElementById('header-auth-btn');
      const text = document.getElementById('auth-btn-text');
      const icon = document.getElementById('auth-btn-icon');
      if (!btn) return;

      if (user) {
        if (text) text.textContent = 'Dashboard';
        if (icon) icon.textContent = '📊';
        btn.onclick = () => {
          const isHub = window.location.pathname.startsWith('/hub/');
          window.location.href = isHub ? '/hub/profile.html' : '/profile';
        };
        btn.title = `Signed in as ${user.email} (Open Profile & Wallet)`;
      } else {
        if (text) text.textContent = 'Sign In';
        if (icon) icon.textContent = '👤';
        btn.onclick = () => this.openAuthModal('signin');
        btn.title = 'Sign In or Create Account with Supabase';
      }
    },

    injectAuthDOM() {
      if (document.getElementById('supabase-auth-modal')) return;

      // Inject Modal Styles
      const style = document.createElement('style');
      style.textContent = `
        .header-auth-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: #f8fafc;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .header-auth-btn:hover {
          background: rgba(255, 255, 255, 0.16);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }
        .supabase-auth-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 16px;
        }
        .supabase-auth-modal-box {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 20px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          padding: 24px;
          position: relative;
          color: #f8fafc;
          font-family: inherit;
          box-sizing: border-box;
        }
        .supabase-auth-close-btn {
          position: absolute;
          top: 18px;
          right: 18px;
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 20px;
          cursor: pointer;
        }
        .auth-modal-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .auth-modal-logo {
          font-size: 28px;
          margin-bottom: 6px;
        }
        .auth-modal-title {
          font-size: 18px;
          font-weight: 800;
          margin: 0 0 4px;
        }
        .auth-modal-subtitle {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
        }
        .auth-tab-row {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 20px;
          gap: 4px;
        }
        .auth-tab-btn {
          flex: 1;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-weight: 700;
          font-size: 13px;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .auth-tab-btn.active {
          background: #10b981;
          color: #ffffff;
        }
        .auth-input-group {
          margin-bottom: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .auth-input-label {
          font-size: 12px;
          font-weight: 600;
          color: #cbd5e1;
        }
        .auth-text-input {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 12px;
          padding: 10px 14px;
          color: #ffffff;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .auth-text-input:focus {
          border-color: #10b981;
        }
        .auth-submit-btn {
          background: #10b981;
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 12px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          margin-top: 6px;
          transition: filter 0.2s;
        }
        .auth-submit-btn:hover {
          filter: brightness(1.1);
        }
        .auth-modal-msg {
          font-size: 12px;
          text-align: center;
          margin-top: 14px;
          min-height: 18px;
        }
        .auth-modal-msg.error {
          color: #ef4444;
        }
        .auth-modal-msg.success {
          color: #10b981;
        }
      `;
      document.head.appendChild(style);

      // Inject Modal Markup
      const modal = document.createElement('div');
      modal.id = 'supabase-auth-modal';
      modal.className = 'supabase-auth-modal-backdrop';
      modal.innerHTML = `
        <div class="supabase-auth-modal-box">
          <button type="button" class="supabase-auth-close-btn" onclick="window.NairaTagSupabase.closeAuthModal()">✕</button>
          
          <div class="auth-modal-header">
            <div class="auth-modal-logo">🇳🇬 💚</div>
            <h3 class="auth-modal-title">NairaTag Account</h3>
            <p class="auth-modal-subtitle">Secure sovereign identity powered by Supabase</p>
          </div>

          <div class="auth-tab-row">
            <button type="button" class="auth-tab-btn active" id="tab-btn-signin" onclick="window.NairaTagSupabase.switchAuthTab('signin')">Sign In</button>
            <button type="button" class="auth-tab-btn" id="tab-btn-signup" onclick="window.NairaTagSupabase.switchAuthTab('signup')">Sign Up</button>
          </div>

          <!-- Sign In Form -->
          <form id="auth-signin-form" style="display:flex; flex-direction:column;" onsubmit="event.preventDefault(); window.NairaTagSupabase._submitSignIn();">
            <div class="auth-input-group">
              <label class="auth-input-label">Email</label>
              <input type="email" id="auth-signin-email" class="auth-text-input" placeholder="you@domain.com" required autocomplete="email" />
            </div>
            <div class="auth-input-group">
              <label class="auth-input-label">Password</label>
              <input type="password" id="auth-signin-password" class="auth-text-input" placeholder="••••••••" required autocomplete="current-password" />
            </div>
            <button type="submit" class="auth-submit-btn" id="btn-submit-signin">Sign In</button>
          </form>

          <!-- Sign Up Form -->
          <form id="auth-signup-form" style="display:none; flex-direction:column;" onsubmit="event.preventDefault(); window.NairaTagSupabase._submitSignUp();">
            <div class="auth-input-group">
              <label class="auth-input-label">Email</label>
              <input type="email" id="auth-signup-email" class="auth-text-input" placeholder="you@domain.com" required autocomplete="email" />
            </div>
            <div class="auth-input-group">
              <label class="auth-input-label">Password</label>
              <input type="password" id="auth-signup-password" class="auth-text-input" placeholder="At least 6 characters" required autocomplete="new-password" minlength="6" />
            </div>
            <button type="submit" class="auth-submit-btn" id="btn-submit-signup">Create Account</button>
          </form>

          <div id="auth-modal-msg" class="auth-modal-msg"></div>
        </div>
      `;
      document.body.appendChild(modal);

      // Close on backdrop click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) window.NairaTagSupabase.closeAuthModal();
      });
    },

    async _submitSignIn() {
      const email = document.getElementById('auth-signin-email')?.value.trim();
      const password = document.getElementById('auth-signin-password')?.value;
      const msg = document.getElementById('auth-modal-msg');
      const btn = document.getElementById('btn-submit-signin');

      if (!email || !password) return;
      btn.disabled = true;
      btn.textContent = 'Signing in...';
      if (msg) msg.textContent = '';

      try {
        await this.signIn(email, password);
        if (msg) {
          msg.className = 'auth-modal-msg success';
          msg.textContent = '✓ Signed in successfully!';
        }
        setTimeout(() => this.closeAuthModal(), 900);
      } catch (err) {
        if (msg) {
          msg.className = 'auth-modal-msg error';
          msg.textContent = err.message || 'Failed to sign in';
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    },

    async _submitSignUp() {
      const email = document.getElementById('auth-signup-email')?.value.trim();
      const password = document.getElementById('auth-signup-password')?.value;
      const msg = document.getElementById('auth-modal-msg');
      const btn = document.getElementById('btn-submit-signup');

      if (!email || !password) return;
      btn.disabled = true;
      btn.textContent = 'Creating account...';
      if (msg) msg.textContent = '';

      try {
        await this.signUp(email, password);
        if (msg) {
          msg.className = 'auth-modal-msg success';
          msg.textContent = '✓ Account created! Check your email to confirm.';
        }
        setTimeout(() => this.closeAuthModal(), 1500);
      } catch (err) {
        if (msg) {
          msg.className = 'auth-modal-msg error';
          msg.textContent = err.message || 'Failed to sign up';
        }
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    }
  };

  // On DOM Ready: inject modal and bind auth state
  function setup() {
    window.NairaTagSupabase.injectAuthDOM();
    const sb = initSupabase();
    if (sb) {
      sb.auth.getUser().then(({ data: { user } }) => {
        window.NairaTagSupabase.updateNavbarAuthUI(user);
      }).catch(() => {});

      sb.auth.onAuthStateChange((_event, session) => {
        window.NairaTagSupabase.updateNavbarAuthUI(session?.user || null);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
