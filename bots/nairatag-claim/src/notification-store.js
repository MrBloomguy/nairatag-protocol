const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

function createNotificationStore(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const database = new DatabaseSync(filePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS telegram_links (
      chat_id TEXT PRIMARY KEY,
      username TEXT,
      wallet_address TEXT,
      privy_user_id TEXT,
      notifications TEXT NOT NULL DEFAULT 'both',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS whatsapp_links (
      phone_number TEXT PRIMARY KEY,
      name TEXT,
      wallet_address TEXT,
      tag TEXT,
      notifications TEXT NOT NULL DEFAULT 'both',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_wa_wallet ON whatsapp_links(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_wa_tag ON whatsapp_links(tag);
    CREATE TABLE IF NOT EXISTS whatsapp_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL,
      text TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      available_at INTEGER NOT NULL,
      sent_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS link_codes (
      code TEXT PRIMARY KEY,
      wallet_address TEXT,
      privy_user_id TEXT,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL,
      text TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      available_at INTEGER NOT NULL,
      sent_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS lifecycle_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT,
      event_type TEXT NOT NULL,
      handle TEXT,
      network TEXT,
      transaction_hash TEXT,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS web_push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS in_app_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'system',
      action_url TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS phone_resolvers (
      phone_hash TEXT PRIMARY KEY,
      phone_e164 TEXT NOT NULL,
      tag TEXT NOT NULL,
      wallet_address TEXT NOT NULL,
      allow_phone_discovery INTEGER NOT NULL DEFAULT 1,
      whatsapp_discovery INTEGER NOT NULL DEFAULT 1,
      contact_discovery INTEGER NOT NULL DEFAULT 1,
      phone_verified INTEGER NOT NULL DEFAULT 1,
      identity_verified INTEGER NOT NULL DEFAULT 0,
      verification_provider TEXT,
      verification_reference TEXT,
      verified_at TEXT,
      agent_tag TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_phone_tag ON phone_resolvers(tag);
    CREATE INDEX IF NOT EXISTS idx_phone_wallet ON phone_resolvers(wallet_address);
    CREATE TABLE IF NOT EXISTS identity_verifications (
      tag TEXT PRIMARY KEY,
      wallet_address TEXT,
      phone_hash TEXT,
      identity_verified INTEGER NOT NULL DEFAULT 1,
      verification_provider TEXT NOT NULL,
      verification_reference TEXT NOT NULL,
      verified_at TEXT NOT NULL,
      consent_given INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_idv_wallet ON identity_verifications(wallet_address);
    CREATE TABLE IF NOT EXISTS user_points (
      wallet_address TEXT PRIMARY KEY,
      tag TEXT,
      total_points INTEGER NOT NULL DEFAULT 0,
      referral_code TEXT UNIQUE,
      referred_by TEXT,
      profile_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS points_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT NOT NULL,
      action TEXT NOT NULL,
      points INTEGER NOT NULL,
      reference_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tag_marketplace (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      node TEXT NOT NULL UNIQUE,
      tag TEXT NOT NULL,
      owner TEXT NOT NULL,
      price TEXT,
      currency TEXT DEFAULT 'ETH',
      listing_type TEXT NOT NULL,
      swap_target_tag TEXT,
      extra_amount TEXT,
      status TEXT NOT NULL DEFAULT 'listed',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_claimed_tags (
      wallet_address TEXT PRIMARY KEY,
      tag TEXT NOT NULL,
      network TEXT NOT NULL,
      claimed_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_user_claimed_tag ON user_claimed_tags(tag);
    CREATE TABLE IF NOT EXISTS chowdeck_orders (
      id TEXT PRIMARY KEY,
      tag TEXT NOT NULL,
      wallet_address TEXT NOT NULL,
      restaurant_id TEXT NOT NULL,
      restaurant_name TEXT NOT NULL,
      items_json TEXT NOT NULL,
      total_amount TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      status TEXT NOT NULL,
      eta_minutes INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS avatar_assets (
      avatar_id TEXT PRIMARY KEY,
      tag TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      source_type TEXT NOT NULL,
      style TEXT NOT NULL DEFAULT 'nairatag-pixel-v1',
      avatar_hash TEXT NOT NULL,
      svg_data TEXT,
      png_32 TEXT,
      png_64 TEXT,
      png_128 TEXT,
      png_256 TEXT,
      agent_svg TEXT,
      agent_png_128 TEXT,
      metadata_json TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_avatar_tag ON avatar_assets(tag);
    CREATE TABLE IF NOT EXISTS nairatag_payments (
      tx_ref TEXT PRIMARY KEY,
      tag TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'NGN',
      rail TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'flutterwave',
      payer_email TEXT,
      payer_wallet TEXT,
      recipient_wallet TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      provider_reference TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_payments_tag ON nairatag_payments(tag);

    CREATE TABLE IF NOT EXISTS virtual_accounts (
      id TEXT PRIMARY KEY,
      nairatag_user_id TEXT NOT NULL UNIQUE,
      flutterwave_customer_id TEXT,
      flutterwave_account_id TEXT,
      account_number TEXT NOT NULL UNIQUE,
      bank_name TEXT NOT NULL,
      account_name TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'NGN',
      account_type TEXT NOT NULL DEFAULT 'static',
      status TEXT NOT NULL DEFAULT 'active',
      flutterwave_reference TEXT UNIQUE,
      bvn_hash TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_va_account_num ON virtual_accounts(account_number);

    CREATE TABLE IF NOT EXISTS ngn_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      nairatag_id TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'flutterwave',
      provider_customer_id TEXT,
      provider_account_id TEXT,
      account_type TEXT NOT NULL DEFAULT 'static',
      bank_name TEXT,
      bank_code TEXT,
      account_number TEXT UNIQUE,
      account_name TEXT,
      currency TEXT NOT NULL DEFAULT 'NGN',
      status TEXT NOT NULL DEFAULT 'PROVISIONING',
      kyc_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
      provider_reference TEXT UNIQUE,
      idempotency_key TEXT UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      activated_at TEXT,
      failed_at TEXT,
      failure_reason TEXT,
      metadata TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ngn_user ON ngn_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_ngn_tag ON ngn_accounts(nairatag_id);
    CREATE INDEX IF NOT EXISTS idx_ngn_account_num ON ngn_accounts(account_number);

    CREATE TABLE IF NOT EXISTS ngn_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      nairatag_id TEXT NOT NULL,
      ngn_account_id TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'flutterwave',
      provider_transaction_id TEXT UNIQUE,
      type TEXT NOT NULL DEFAULT 'deposit',
      direction TEXT NOT NULL DEFAULT 'credit',
      amount_kobo INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'NGN',
      status TEXT NOT NULL DEFAULT 'confirmed',
      counterparty TEXT,
      reference TEXT NOT NULL UNIQUE,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ngn_tx_user ON ngn_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_ngn_tx_account ON ngn_transactions(ngn_account_id);

    CREATE TABLE IF NOT EXISTS payment_events (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'flutterwave',
      provider_event_id TEXT,
      provider_transaction_id TEXT,
      reference TEXT NOT NULL,
      status TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      processed_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(provider, provider_event_id),
      UNIQUE(provider, provider_transaction_id)
    );

    CREATE TABLE IF NOT EXISTS wallet_ledger (
      id TEXT PRIMARY KEY,
      nairatag_user_id TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'NGN',
      type TEXT NOT NULL,
      amount_kobo INTEGER NOT NULL,
      direction TEXT NOT NULL,
      reference TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      metadata_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ledger_user ON wallet_ledger(nairatag_user_id);

    CREATE TABLE IF NOT EXISTS voucher_campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      reward_type TEXT NOT NULL DEFAULT 'FIXED',
      reward_amount_kobo INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'NGN',
      max_issuances INTEGER NOT NULL DEFAULT 5000,
      issued_count INTEGER NOT NULL DEFAULT 0,
      funding_source TEXT NOT NULL DEFAULT 'nairatag_treasury',
      partner_id TEXT DEFAULT 'internal',
      eligibility_rules TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      start_at TEXT NOT NULL,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vouchers (
      id TEXT PRIMARY KEY,
      voucher_code TEXT NOT NULL UNIQUE,
      nairatag_user_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      partner_id TEXT DEFAULT 'internal',
      currency TEXT NOT NULL DEFAULT 'NGN',
      face_value_kobo INTEGER NOT NULL,
      remaining_value_kobo INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      issued_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      redeemed_at TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(nairatag_user_id, campaign_id)
    );
    CREATE INDEX IF NOT EXISTS idx_vouchers_user ON vouchers(nairatag_user_id);
    CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(voucher_code);

    CREATE TABLE IF NOT EXISTS voucher_redemptions (
      id TEXT PRIMARY KEY,
      voucher_id TEXT NOT NULL,
      nairatag_user_id TEXT NOT NULL,
      partner_id TEXT NOT NULL,
      amount_kobo INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'NGN',
      external_reference TEXT,
      status TEXT NOT NULL DEFAULT 'CONFIRMED',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_redemptions_voucher ON voucher_redemptions(voucher_id);

    CREATE TABLE IF NOT EXISTS partner_voucher_inventory (
      id TEXT PRIMARY KEY,
      partner_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      external_code TEXT NOT NULL UNIQUE,
      face_value_kobo INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      assigned_to_voucher_id TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bounties (
      id TEXT PRIMARY KEY,
      creator TEXT NOT NULL,
      creator_wallet TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      task_type TEXT NOT NULL DEFAULT 'milestone',
      reward REAL NOT NULL,
      token TEXT NOT NULL DEFAULT 'cNGN',
      chain_id INTEGER NOT NULL DEFAULT 42220,
      deadline INTEGER NOT NULL,
      deliverable TEXT,
      requirements_json TEXT,
      visibility TEXT DEFAULT 'public',
      status TEXT NOT NULL DEFAULT 'open',
      funded INTEGER NOT NULL DEFAULT 1,
      funding_tx TEXT,
      assigned_agent TEXT,
      assigned_wallet TEXT,
      settlement_tx TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bounties_creator ON bounties(creator);
    CREATE INDEX IF NOT EXISTS idx_bounties_assigned ON bounties(assigned_agent);
    CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);

    CREATE TABLE IF NOT EXISTS bounty_applications (
      id TEXT PRIMARY KEY,
      bounty_id TEXT NOT NULL,
      agent_tag TEXT NOT NULL,
      agent_wallet TEXT,
      bid REAL NOT NULL,
      eta TEXT NOT NULL,
      pitch TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bapp_bounty ON bounty_applications(bounty_id);
    CREATE INDEX IF NOT EXISTS idx_bapp_agent ON bounty_applications(agent_tag);

    CREATE TABLE IF NOT EXISTS bounty_submissions (
      id TEXT PRIMARY KEY,
      bounty_id TEXT NOT NULL,
      agent_tag TEXT NOT NULL,
      submission_text TEXT NOT NULL,
      deliverable_url TEXT,
      status TEXT NOT NULL DEFAULT 'submitted',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bsub_bounty ON bounty_submissions(bounty_id);

    CREATE TABLE IF NOT EXISTS tag2tag_interactions (
      id TEXT PRIMARY KEY,
      from_agent TEXT NOT NULL,
      to_agent TEXT NOT NULL,
      type TEXT NOT NULL,
      payload_json TEXT,
      amount REAL,
      token TEXT DEFAULT 'cNGN',
      status TEXT NOT NULL DEFAULT 'pending',
      tx_hash TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_t2t_from ON tag2tag_interactions(from_agent);
    CREATE INDEX IF NOT EXISTS idx_t2t_to ON tag2tag_interactions(to_agent);

    CREATE TABLE IF NOT EXISTS agent_earnings (
      tag TEXT PRIMARY KEY,
      wallet_address TEXT,
      role TEXT,
      category TEXT DEFAULT 'dev',
      total_cngn REAL NOT NULL DEFAULT 0,
      monthly_cngn REAL NOT NULL DEFAULT 0,
      weekly_cngn REAL NOT NULL DEFAULT 0,
      today_cngn REAL NOT NULL DEFAULT 0,
      jobs_completed INTEGER NOT NULL DEFAULT 0,
      reputation INTEGER NOT NULL DEFAULT 85,
      change_pct TEXT DEFAULT '+0.0%',
      change_dir TEXT DEFAULT 'up',
      color TEXT DEFAULT '#0052ff',
      updated_at TEXT NOT NULL
    );
  `);

  const now = () => new Date().toISOString();
  const normalizeWallet = wallet => wallet ? String(wallet).toLowerCase() : null;
  const getLink = database.prepare('SELECT * FROM telegram_links WHERE chat_id = ?');
  const findByWallet = database.prepare('SELECT * FROM telegram_links WHERE wallet_address = ?');
  const listLinks = database.prepare('SELECT * FROM telegram_links');
  const upsertLink = database.prepare(`
    INSERT INTO telegram_links (chat_id, username, wallet_address, privy_user_id, notifications, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(chat_id) DO UPDATE SET
      username = excluded.username,
      wallet_address = COALESCE(excluded.wallet_address, telegram_links.wallet_address),
      privy_user_id = COALESCE(excluded.privy_user_id, telegram_links.privy_user_id),
      notifications = excluded.notifications,
      updated_at = excluded.updated_at
  `);
  const updatePreferences = database.prepare('UPDATE telegram_links SET notifications = ?, updated_at = ? WHERE chat_id = ?');
  const getWhatsAppLink = database.prepare('SELECT * FROM whatsapp_links WHERE phone_number = ?');
  const findWhatsAppByWallet = database.prepare('SELECT * FROM whatsapp_links WHERE wallet_address = ?');
  const findWhatsAppByTag = database.prepare('SELECT * FROM whatsapp_links WHERE LOWER(tag) = LOWER(?)');
  const listWhatsAppLinks = database.prepare('SELECT * FROM whatsapp_links');
  const upsertWhatsAppLink = database.prepare(`
    INSERT INTO whatsapp_links (phone_number, name, wallet_address, tag, notifications, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(phone_number) DO UPDATE SET
      name = COALESCE(excluded.name, whatsapp_links.name),
      wallet_address = COALESCE(excluded.wallet_address, whatsapp_links.wallet_address),
      tag = COALESCE(excluded.tag, whatsapp_links.tag),
      updated_at = excluded.updated_at
  `);
  const updateWhatsAppPreferences = database.prepare('UPDATE whatsapp_links SET notifications = ?, updated_at = ? WHERE phone_number = ?');
  const queueWhatsApp = database.prepare('INSERT INTO whatsapp_outbox (phone_number, text, available_at, created_at) VALUES (?, ?, ?, ?)');
  const dueWhatsApp = database.prepare('SELECT * FROM whatsapp_outbox WHERE sent_at IS NULL AND available_at <= ? ORDER BY id LIMIT 20');
  const markWhatsAppSent = database.prepare('UPDATE whatsapp_outbox SET sent_at = ? WHERE id = ?');
  const markWhatsAppFailed = database.prepare('UPDATE whatsapp_outbox SET attempts = attempts + 1, available_at = ?, last_error = ? WHERE id = ?');
  const createCode = database.prepare('INSERT INTO link_codes (code, wallet_address, privy_user_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)');
  const consumeCode = database.prepare('SELECT * FROM link_codes WHERE code = ? AND expires_at > ?');
  const deleteCode = database.prepare('DELETE FROM link_codes WHERE code = ?');
  const queue = database.prepare('INSERT INTO outbox (chat_id, text, available_at, created_at) VALUES (?, ?, ?, ?)');
  const due = database.prepare('SELECT * FROM outbox WHERE sent_at IS NULL AND available_at <= ? ORDER BY id LIMIT 20');
  const markSent = database.prepare('UPDATE outbox SET sent_at = ? WHERE id = ?');
  const markFailed = database.prepare('UPDATE outbox SET attempts = attempts + 1, available_at = ?, last_error = ? WHERE id = ?');
  const recordEvent = database.prepare('INSERT INTO lifecycle_events (wallet_address, event_type, handle, network, transaction_hash, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const history = database.prepare('SELECT * FROM lifecycle_events WHERE wallet_address = ? ORDER BY id DESC LIMIT ?');
  const recent = database.prepare('SELECT * FROM lifecycle_events ORDER BY id DESC LIMIT ?');
  const stats = database.prepare('SELECT (SELECT COUNT(*) FROM telegram_links) AS linked_users, (SELECT COUNT(*) FROM lifecycle_events) AS lifecycle_events, (SELECT COUNT(*) FROM outbox WHERE sent_at IS NULL) AS pending_messages, (SELECT COUNT(*) FROM outbox WHERE sent_at IS NULL AND attempts > 0) AS retrying_messages, (SELECT COUNT(*) FROM web_push_subscriptions) AS push_subscribers');

  const upsertPushSub = database.prepare(`
    INSERT INTO web_push_subscriptions (wallet_address, endpoint, p256dh, auth, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      wallet_address = COALESCE(excluded.wallet_address, web_push_subscriptions.wallet_address),
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      updated_at = excluded.updated_at
  `);
  const listPushSubs = database.prepare('SELECT * FROM web_push_subscriptions');
  const getPushSubsForWallet = database.prepare('SELECT * FROM web_push_subscriptions WHERE wallet_address = ?');
  const deletePushSub = database.prepare('DELETE FROM web_push_subscriptions WHERE endpoint = ?');

  const insertInApp = database.prepare('INSERT INTO in_app_notifications (wallet_address, title, body, category, action_url, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)');
  const listInApp = database.prepare('SELECT * FROM in_app_notifications WHERE wallet_address IS NULL OR wallet_address = ? ORDER BY id DESC LIMIT ?');
  const listAllInApp = database.prepare('SELECT * FROM in_app_notifications ORDER BY id DESC LIMIT ?');
  const markInAppRead = database.prepare('UPDATE in_app_notifications SET is_read = 1 WHERE id = ?');
  const markAllInAppRead = database.prepare('UPDATE in_app_notifications SET is_read = 1 WHERE wallet_address IS NULL OR wallet_address = ?');
  const clearInApp = database.prepare('DELETE FROM in_app_notifications WHERE wallet_address IS NULL OR wallet_address = ?');

  return {
    linkTelegram({ chatId, username, walletAddress, privyUserId }) {
      const timestamp = now();
      upsertLink.run(String(chatId), username || null, normalizeWallet(walletAddress), privyUserId || null, 'both', timestamp, timestamp);
      return getLink.get(String(chatId));
    },
    getLink(chatId) { return getLink.get(String(chatId)); },
    listLinks() { return listLinks.all(); },
    findByWallet(walletAddress) { return findByWallet.get(normalizeWallet(walletAddress)); },
    setNotifications(chatId, notifications) { updatePreferences.run(notifications, now(), String(chatId)); return getLink.get(String(chatId)); },
    createLinkCode({ walletAddress, privyUserId }) {
      const code = `NT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      createCode.run(code, normalizeWallet(walletAddress), privyUserId || null, Date.now() + 10 * 60 * 1000, now());
      return code;
    },
    consumeLinkCode(code) {
      const record = consumeCode.get(String(code).toUpperCase(), Date.now());
      if (!record) return null;
      deleteCode.run(record.code);
      return record;
    },
    queueMessage(chatId, text) { queue.run(String(chatId), text, Date.now(), now()); },
    dueMessages() { return due.all(Date.now()); },
    markSent(id) { markSent.run(now(), id); },
    markFailed(id, error, delayMs = 30_000) { markFailed.run(Date.now() + delayMs, String(error), id); },

    // WhatsApp Direct & Broadcast Messaging
    linkWhatsApp({ phoneNumber, name, walletAddress, tag }) {
      const timestamp = now();
      upsertWhatsAppLink.run(String(phoneNumber), name || null, normalizeWallet(walletAddress), tag || null, 'both', timestamp, timestamp);
      return getWhatsAppLink.get(String(phoneNumber));
    },
    getWhatsAppLink(phoneNumber) { return getWhatsAppLink.get(String(phoneNumber)); },
    findWhatsAppByWallet(walletAddress) { return findWhatsAppByWallet.get(normalizeWallet(walletAddress)); },
    findWhatsAppByTag(tag) { return findWhatsAppByTag.get(String(tag).replace(/^₦/, '').toLowerCase()); },
    listWhatsAppLinks() { return listWhatsAppLinks.all(); },
    setWhatsAppNotifications(phoneNumber, notifications) {
      updateWhatsAppPreferences.run(notifications, now(), String(phoneNumber));
      return getWhatsAppLink.get(String(phoneNumber));
    },
    queueWhatsAppMessage(phoneNumber, text) { queueWhatsApp.run(String(phoneNumber), text, Date.now(), now()); },
    dueWhatsAppMessages() { return dueWhatsApp.all(Date.now()); },
    markWhatsAppSent(id) { markWhatsAppSent.run(now(), id); },
    markWhatsAppFailed(id, error, delayMs = 30_000) { markWhatsAppFailed.run(Date.now() + delayMs, String(error), id); },
    recordEvent({ walletAddress, eventType, handle, network, transactionHash, message }) { recordEvent.run(normalizeWallet(walletAddress), eventType, handle || null, network || null, transactionHash || null, message, now()); },
    historyByWallet(walletAddress, limit = 30) { return history.all(normalizeWallet(walletAddress), Math.min(Number(limit) || 30, 100)); },
    recentEvents(limit = 10) { return recent.all(Math.min(Number(limit) || 10, 50)); },
    listEvents(walletAddress, limit = 30) {
      if (walletAddress) return this.historyByWallet(walletAddress, limit);
      return this.recentEvents(limit);
    },
    stats() { return stats.get(); },

    // Web Push Subscriptions
    savePushSubscription({ walletAddress, endpoint, p256dh, auth }) {
      const timestamp = now();
      upsertPushSub.run(normalizeWallet(walletAddress), endpoint, p256dh, auth, timestamp, timestamp);
      return { ok: true, endpoint };
    },
    listPushSubscriptions() {
      return listPushSubs.all();
    },
    getPushSubscriptionsForWallet(walletAddress) {
      if (!walletAddress) return [];
      return getPushSubsForWallet.all(normalizeWallet(walletAddress));
    },
    removePushSubscription(endpoint) {
      deletePushSub.run(endpoint);
      return { ok: true };
    },

    // In-App Notifications
    createInAppNotification({ walletAddress, title, body, category = 'system', actionUrl = '/hub/wallet.html' }) {
      const timestamp = now();
      insertInApp.run(normalizeWallet(walletAddress), title, body, category, actionUrl, timestamp);
    },
    getInAppNotifications({ walletAddress, limit = 30 }) {
      const lim = Math.min(Number(limit) || 30, 100);
      if (walletAddress) {
        return listInApp.all(normalizeWallet(walletAddress), lim);
      }
      return listAllInApp.all(lim);
    },
    markNotificationRead(id) {
      markInAppRead.run(id);
      return { ok: true };
    },
    markAllNotificationsRead(walletAddress) {
      markAllInAppRead.run(normalizeWallet(walletAddress));
      return { ok: true };
    },
    clearNotifications(walletAddress) {
      clearInApp.run(normalizeWallet(walletAddress));
      return { ok: true };
    },

    // 1. Phone Number Resolver
    upsertPhoneResolver({ phoneHash, phoneE164, tag, walletAddress, allowPhoneDiscovery = 1, whatsappDiscovery = 1, contactDiscovery = 1 }) {
      const timestamp = now();
      database.prepare(`
        INSERT INTO phone_resolvers (phone_hash, phone_e164, tag, wallet_address, allow_phone_discovery, whatsapp_discovery, contact_discovery, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(phone_hash) DO UPDATE SET
          tag = excluded.tag,
          wallet_address = excluded.wallet_address,
          allow_phone_discovery = excluded.allow_phone_discovery,
          whatsapp_discovery = excluded.whatsapp_discovery,
          contact_discovery = excluded.contact_discovery,
          updated_at = excluded.updated_at
      `).run(phoneHash, phoneE164, tag, normalizeWallet(walletAddress), allowPhoneDiscovery ? 1 : 0, whatsappDiscovery ? 1 : 0, contactDiscovery ? 1 : 0, timestamp, timestamp);
      return this.getPhoneResolverByHash(phoneHash);
    },
    getPhoneResolverByHash(phoneHash) {
      return database.prepare('SELECT * FROM phone_resolvers WHERE phone_hash = ?').get(phoneHash);
    },
    getPhoneResolverByPhone(phoneE164) {
      return database.prepare('SELECT * FROM phone_resolvers WHERE phone_e164 = ?').get(phoneE164);
    },
    getPhoneResolversByTag(tag) {
      const clean = String(tag || '').replace(/^₦/, '').toLowerCase();
      return database.prepare('SELECT * FROM phone_resolvers WHERE lower(tag) = ? OR lower(tag) = ?').all(clean, `₦${clean}`);
    },
    getPhoneResolversByWallet(walletAddress) {
      return database.prepare('SELECT * FROM phone_resolvers WHERE wallet_address = ?').all(normalizeWallet(walletAddress));
    },
    updatePhonePrivacy({ phoneHash, allowPhoneDiscovery, whatsappDiscovery, contactDiscovery }) {
      database.prepare(`
        UPDATE phone_resolvers SET
          allow_phone_discovery = COALESCE(?, allow_phone_discovery),
          whatsapp_discovery = COALESCE(?, whatsapp_discovery),
          contact_discovery = COALESCE(?, contact_discovery),
          updated_at = ?
        WHERE phone_hash = ?
      `).run(
        allowPhoneDiscovery !== undefined ? (allowPhoneDiscovery ? 1 : 0) : null,
        whatsappDiscovery !== undefined ? (whatsappDiscovery ? 1 : 0) : null,
        contactDiscovery !== undefined ? (contactDiscovery ? 1 : 0) : null,
        now(),
        phoneHash
      );
      return this.getPhoneResolverByHash(phoneHash);
    },

    // 1b. Identity Verifications (Mono / BVN Proofs)
    upsertIdentityVerification({ tag, walletAddress, phoneHash, verificationProvider = 'mono', verificationReference, consentGiven = 1 }) {
      const cleanTag = String(tag || '').replace(/^₦/, '').toLowerCase();
      const timestamp = now();
      database.prepare(`
        INSERT INTO identity_verifications (tag, wallet_address, phone_hash, identity_verified, verification_provider, verification_reference, verified_at, consent_given, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(tag) DO UPDATE SET
          wallet_address = COALESCE(excluded.wallet_address, identity_verifications.wallet_address),
          phone_hash = COALESCE(excluded.phone_hash, identity_verifications.phone_hash),
          identity_verified = 1,
          verification_provider = excluded.verification_provider,
          verification_reference = excluded.verification_reference,
          verified_at = excluded.verified_at,
          consent_given = excluded.consent_given,
          updated_at = excluded.updated_at
      `).run(cleanTag, normalizeWallet(walletAddress), phoneHash || null, verificationProvider, verificationReference, timestamp, consentGiven ? 1 : 0, timestamp, timestamp);

      // Also update phone_resolvers if tag matches
      try {
        database.prepare(`
          UPDATE phone_resolvers SET
            identity_verified = 1,
            verification_provider = ?,
            verification_reference = ?,
            verified_at = ?,
            updated_at = ?
          WHERE lower(tag) = ? OR lower(tag) = ?
        `).run(verificationProvider, verificationReference, timestamp, timestamp, cleanTag, `₦${cleanTag}`);
      } catch (err) {}

      return this.getIdentityVerificationByTag(cleanTag);
    },
    getIdentityVerificationByTag(tag) {
      const clean = String(tag || '').replace(/^₦/, '').toLowerCase();
      return database.prepare('SELECT * FROM identity_verifications WHERE lower(tag) = ?').get(clean);
    },
    getIdentityVerificationByWallet(walletAddress) {
      return database.prepare('SELECT * FROM identity_verifications WHERE wallet_address = ?').get(normalizeWallet(walletAddress));
    },

    // 2. User Points & Referrals
    getUserPoints(walletAddress) {
      const w = normalizeWallet(walletAddress);
      if (!w) return null;
      let record = database.prepare('SELECT * FROM user_points WHERE wallet_address = ?').get(w);
      if (!record) {
        const refCode = `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const timestamp = now();
        database.prepare('INSERT OR IGNORE INTO user_points (wallet_address, total_points, referral_code, created_at, updated_at) VALUES (?, 0, ?, ?, ?)').run(w, refCode, timestamp, timestamp);
        record = database.prepare('SELECT * FROM user_points WHERE wallet_address = ?').get(w);
      }
      return record;
    },
    getUserPointsByTag(tag) {
      const clean = String(tag || '').replace(/^₦/, '').toLowerCase();
      return database.prepare('SELECT * FROM user_points WHERE lower(tag) = ? OR lower(tag) = ?').get(clean, `₦${clean}`);
    },
    getUserPointsByRefCode(refCode) {
      return database.prepare('SELECT * FROM user_points WHERE referral_code = ?').get(String(refCode).trim().toUpperCase());
    },
    awardPoints({ walletAddress, action, points, referenceId, tag }) {
      const w = normalizeWallet(walletAddress);
      if (!w) return null;
      const timestamp = now();
      const current = this.getUserPoints(w);
      database.prepare(`
        UPDATE user_points SET
          total_points = total_points + ?,
          tag = COALESCE(?, tag),
          updated_at = ?
        WHERE wallet_address = ?
      `).run(Number(points) || 0, tag || null, timestamp, w);
      database.prepare(`
        INSERT INTO points_ledger (wallet_address, action, points, reference_id, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(w, action, Number(points) || 0, referenceId || null, timestamp);
      return this.getUserPoints(w);
    },
    getPointsLedger(walletAddress, limit = 20) {
      return database.prepare('SELECT * FROM points_ledger WHERE wallet_address = ? ORDER BY id DESC LIMIT ?').all(normalizeWallet(walletAddress), Math.min(Number(limit) || 20, 100));
    },
    getPointsLeaderboard(limit = 10) {
      return database.prepare('SELECT wallet_address, tag, total_points, referral_code FROM user_points ORDER BY total_points DESC LIMIT ?').all(Math.min(Number(limit) || 10, 50));
    },

    // 3. Tag Marketplace (Buy / Sell / Swap)
    upsertListing({ node, tag, owner, price = null, currency = 'ETH', listingType = 'sale', swapTargetTag = null, extraAmount = null }) {
      const timestamp = now();
      database.prepare(`
        INSERT INTO tag_marketplace (node, tag, owner, price, currency, listing_type, swap_target_tag, extra_amount, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'listed', ?, ?)
        ON CONFLICT(node) DO UPDATE SET
          owner = excluded.owner,
          price = excluded.price,
          currency = excluded.currency,
          listing_type = excluded.listing_type,
          swap_target_tag = excluded.swap_target_tag,
          extra_amount = excluded.extra_amount,
          status = 'listed',
          updated_at = excluded.updated_at
      `).run(node, tag, normalizeWallet(owner), price, currency, listingType, swapTargetTag, extraAmount, timestamp, timestamp);
      return this.getListingByNode(node);
    },
    getListingByNode(node) {
      return database.prepare('SELECT * FROM tag_marketplace WHERE node = ?').get(node);
    },
    getListingByTag(tag) {
      const clean = String(tag || '').replace(/^₦/, '').toLowerCase();
      return database.prepare('SELECT * FROM tag_marketplace WHERE lower(tag) = ? OR lower(tag) = ?').get(clean, `₦${clean}`);
    },
    listActiveMarketplace() {
      return database.prepare("SELECT * FROM tag_marketplace WHERE status = 'listed' ORDER BY id DESC").all();
    },
    updateListingStatus(node, status) {
      database.prepare('UPDATE tag_marketplace SET status = ?, updated_at = ? WHERE node = ?').run(status, now(), node);
      return this.getListingByNode(node);
    },
    updateListingOwner(node, newOwner) {
      database.prepare('UPDATE tag_marketplace SET owner = ?, updated_at = ? WHERE node = ?').run(normalizeWallet(newOwner), now(), node);
      return this.getListingByNode(node);
    },

    // 1 Tag Per User Claims
    getTagForWallet(walletAddress) {
      if (!walletAddress) return null;
      const norm = normalizeWallet(walletAddress);
      return database.prepare('SELECT * FROM user_claimed_tags WHERE wallet_address = ?').get(norm);
    },
    getWalletForTag(tag) {
      if (!tag) return null;
      const clean = String(tag).trim().replace(/^₦/, '').toLowerCase();
      return database.prepare('SELECT * FROM user_claimed_tags WHERE lower(tag) = ? OR lower(tag) = ?').get(clean, `₦${clean}`);
    },
    recordUserClaim({ walletAddress, tag, network = 'baseSepolia' }) {
      if (!walletAddress || !tag) return null;
      const norm = normalizeWallet(walletAddress);
      const clean = String(tag).trim().replace(/^₦/, '').toLowerCase();
      const timestamp = now();
      database.prepare(`
        INSERT INTO user_claimed_tags (wallet_address, tag, network, claimed_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(wallet_address) DO UPDATE SET tag = excluded.tag, network = excluded.network, claimed_at = excluded.claimed_at
      `).run(norm, `₦${clean}`, network, timestamp);
      return this.getTagForWallet(norm);
    },
    removeUserClaim(walletAddress) {
      if (!walletAddress) return;
      const norm = normalizeWallet(walletAddress);
      database.prepare('DELETE FROM user_claimed_tags WHERE wallet_address = ?').run(norm);
    },
    transferUserClaim({ fromWallet, toWallet, tag, network = 'baseSepolia' }) {
      if (fromWallet) this.removeUserClaim(fromWallet);
      if (toWallet && tag) return this.recordUserClaim({ walletAddress: toWallet, tag, network });
    },

    // 4. Chowdeck Food Orders
    createChowdeckOrder({ id, tag, walletAddress, restaurantId, restaurantName, items, totalAmount, deliveryAddress, etaMinutes = 35 }) {
      const timestamp = now();
      database.prepare(`
        INSERT INTO chowdeck_orders (id, tag, wallet_address, restaurant_id, restaurant_name, items_json, total_amount, delivery_address, status, eta_minutes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)
      `).run(id, tag, normalizeWallet(walletAddress), restaurantId, restaurantName, JSON.stringify(items || []), totalAmount, deliveryAddress, etaMinutes, timestamp, timestamp);
      return this.getChowdeckOrder(id);
    },
    getChowdeckOrder(id) {
      const order = database.prepare('SELECT * FROM chowdeck_orders WHERE id = ?').get(id);
      if (order && order.items_json) {
        try { order.items = JSON.parse(order.items_json); } catch {}
      }
      return order;
    },
    listChowdeckOrders(tagOrWallet, limit = 10) {
      const cleanTag = String(tagOrWallet || '').replace(/^₦/, '').toLowerCase();
      const normWallet = normalizeWallet(tagOrWallet);
      const orders = database.prepare(`
        SELECT * FROM chowdeck_orders
        WHERE lower(tag) = ? OR lower(tag) = ? OR wallet_address = ?
        ORDER BY created_at DESC LIMIT ?
      `).all(cleanTag, `₦${cleanTag}`, normWallet, limit);
      return orders.map(o => {
        try { o.items = JSON.parse(o.items_json); } catch {}
        return o;
      });
    },
    updateChowdeckOrderStatus(id, status, etaMinutes) {
      database.prepare('UPDATE chowdeck_orders SET status = ?, eta_minutes = COALESCE(?, eta_minutes), updated_at = ? WHERE id = ?').run(status, etaMinutes || null, now(), id);
      return this.getChowdeckOrder(id);
    },

    // 5. Canonical Pixel Avatar Assets
    saveAvatarAsset(record) {
      const timestamp = now();
      const cleanTag = String(record.tag || '').trim().replace(/^₦/, '').toLowerCase();
      
      // If active, mark any existing avatars for this tag as inactive
      if (record.isActive !== false) {
        database.prepare('UPDATE avatar_assets SET is_active = 0, updated_at = ? WHERE lower(tag) = ?').run(timestamp, cleanTag);
      }

      database.prepare(`
        INSERT INTO avatar_assets (
          avatar_id, tag, version, source_type, style, avatar_hash,
          svg_data, png_32, png_64, png_128, png_256,
          agent_svg, agent_png_128, metadata_json, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(avatar_id) DO UPDATE SET
          svg_data = excluded.svg_data,
          png_32 = excluded.png_32,
          png_64 = excluded.png_64,
          png_128 = excluded.png_128,
          png_256 = excluded.png_256,
          agent_svg = excluded.agent_svg,
          agent_png_128 = excluded.agent_png_128,
          metadata_json = excluded.metadata_json,
          is_active = excluded.is_active,
          updated_at = excluded.updated_at
      `).run(
        record.avatarId,
        cleanTag,
        record.version || 1,
        record.sourceType || 'deterministic',
        record.style || 'nairatag-pixel-v1',
        record.avatarHash,
        record.svgData || null,
        record.png32 || null,
        record.png64 || null,
        record.png128 || null,
        record.png256 || null,
        record.agentSvg || null,
        record.agentPng128 || null,
        JSON.stringify(record.metadata || {}),
        record.isActive !== false ? 1 : 0,
        record.createdAt || timestamp,
        timestamp
      );

      return this.getAvatarById(record.avatarId);
    },

    getActiveAvatar(tag) {
      const cleanTag = String(tag || '').trim().replace(/^₦/, '').toLowerCase();
      const row = database.prepare('SELECT * FROM avatar_assets WHERE lower(tag) = ? AND is_active = 1 ORDER BY version DESC LIMIT 1').get(cleanTag);
      if (row && row.metadata_json) {
        try { row.metadata = JSON.parse(row.metadata_json); } catch {}
      }
      return row || null;
    },

    getAvatarVersions(tag) {
      const cleanTag = String(tag || '').trim().replace(/^₦/, '').toLowerCase();
      const rows = database.prepare('SELECT * FROM avatar_assets WHERE lower(tag) = ? ORDER BY version DESC').all(cleanTag);
      return rows.map(r => {
        try { r.metadata = JSON.parse(r.metadata_json); } catch {}
        return r;
      });
    },

    getAvatarById(avatarId) {
      const row = database.prepare('SELECT * FROM avatar_assets WHERE avatar_id = ?').get(avatarId);
      if (row && row.metadata_json) {
        try { row.metadata = JSON.parse(row.metadata_json); } catch {}
      }
      return row || null;
    },

    // 6. Unified Payments (NairaTag Pay Rails)
    createPaymentSession({
      txRef, tag, amount, currency = 'NGN', rail = 'local', provider = 'flutterwave',
      payerEmail = null, payerWallet = null, recipientWallet = null, metadata = {}
    }) {
      const timestamp = now();
      const cleanTag = String(tag || '').trim().replace(/^₦/, '').toLowerCase();
      database.prepare(`
        INSERT INTO nairatag_payments (
          tx_ref, tag, amount, currency, rail, provider,
          payer_email, payer_wallet, recipient_wallet, status,
          provider_reference, metadata_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', null, ?, ?, ?)
      `).run(
        txRef, cleanTag, Number(amount), currency.toUpperCase(), rail, provider,
        payerEmail, normalizeWallet(payerWallet), normalizeWallet(recipientWallet),
        JSON.stringify(metadata), timestamp, timestamp
      );
      return this.getPayment(txRef);
    },

    updatePaymentStatus(txRef, status, { providerReference = null, metadata = null } = {}) {
      const timestamp = now();
      const existing = this.getPayment(txRef);
      if (!existing) return null;

      const mergedMeta = metadata ? { ...(existing.metadata || {}), ...metadata } : existing.metadata;

      database.prepare(`
        UPDATE nairatag_payments
        SET status = ?,
            provider_reference = COALESCE(?, provider_reference),
            metadata_json = ?,
            updated_at = ?
        WHERE tx_ref = ?
      `).run(status, providerReference, JSON.stringify(mergedMeta || {}), timestamp, txRef);

      return this.getPayment(txRef);
    },

    getPayment(txRef) {
      const row = database.prepare('SELECT * FROM nairatag_payments WHERE tx_ref = ?').get(txRef);
      if (row && row.metadata_json) {
        try { row.metadata = JSON.parse(row.metadata_json); } catch {}
      }
      return row || null;
    },

    listPaymentsForTag(tag, limit = 10) {
      const cleanTag = String(tag || '').trim().replace(/^₦/, '').toLowerCase();
      const rows = database.prepare('SELECT * FROM nairatag_payments WHERE lower(tag) = ? ORDER BY created_at DESC LIMIT ?').all(cleanTag, limit);
      return rows.map(r => {
        try { r.metadata = JSON.parse(r.metadata_json); } catch {}
        return r;
      });
    },

    // 7. Virtual Accounts (Flutterwave Money-In)
    getVirtualAccount(userId) {
      if (!userId) return null;
      const cleanId = String(userId).trim().toLowerCase();
      // First check new ngn_accounts table, fallback to virtual_accounts
      const ngnAcc = this.getNgnAccount(cleanId);
      if (ngnAcc && ngnAcc.account_number) {
        return {
          id: ngnAcc.id,
          nairatag_user_id: ngnAcc.user_id,
          account_number: ngnAcc.account_number,
          bank_name: ngnAcc.bank_name,
          account_name: ngnAcc.account_name,
          currency: ngnAcc.currency,
          account_type: ngnAcc.account_type,
          status: ngnAcc.status.toLowerCase(),
          provider: ngnAcc.provider,
          created_at: ngnAcc.created_at,
          updated_at: ngnAcc.updated_at
        };
      }
      return database.prepare('SELECT * FROM virtual_accounts WHERE lower(nairatag_user_id) = ?').get(cleanId);
    },

    getVirtualAccountByAccountNumber(accountNumber) {
      if (!accountNumber) return null;
      const ngnAcc = this.getNgnAccountByAccountNumber(accountNumber);
      if (ngnAcc) {
        return {
          id: ngnAcc.id,
          nairatag_user_id: ngnAcc.user_id,
          account_number: ngnAcc.account_number,
          bank_name: ngnAcc.bank_name,
          account_name: ngnAcc.account_name,
          currency: ngnAcc.currency,
          account_type: ngnAcc.account_type,
          status: ngnAcc.status.toLowerCase(),
          provider: ngnAcc.provider,
          created_at: ngnAcc.created_at,
          updated_at: ngnAcc.updated_at
        };
      }
      return database.prepare('SELECT * FROM virtual_accounts WHERE account_number = ?').get(String(accountNumber).trim());
    },

    // 7b. Dedicated NGN Receiving Accounts (Production Identity Model)
    getNgnAccount(userIdOrTag) {
      if (!userIdOrTag) return null;
      const clean = String(userIdOrTag).trim().toLowerCase().replace(/^₦/, '');
      const row = database.prepare(`
        SELECT * FROM ngn_accounts
        WHERE lower(user_id) = ? OR lower(nairatag_id) = ? OR lower(nairatag_id) = ?
      `).get(clean, clean, `₦${clean}`);
      if (row && row.metadata) {
        try { row.metadataObj = JSON.parse(row.metadata); } catch {}
      }
      return row || null;
    },

    getNgnAccountByAccountNumber(accountNumber) {
      if (!accountNumber) return null;
      const row = database.prepare('SELECT * FROM ngn_accounts WHERE account_number = ?').get(String(accountNumber).trim());
      if (row && row.metadata) {
        try { row.metadataObj = JSON.parse(row.metadata); } catch {}
      }
      return row || null;
    },

    getNgnAccountById(id) {
      if (!id) return null;
      const row = database.prepare('SELECT * FROM ngn_accounts WHERE id = ?').get(id);
      if (row && row.metadata) {
        try { row.metadataObj = JSON.parse(row.metadata); } catch {}
      }
      return row || null;
    },

    saveNgnAccount({
      id, userId, nairatagId, provider = 'flutterwave',
      providerCustomerId = null, providerAccountId = null, accountType = 'static',
      bankName = null, bankCode = null, accountNumber = null, accountName = null,
      currency = 'NGN', status = 'PROVISIONING', kycStatus = 'NOT_REQUIRED',
      providerReference = null, idempotencyKey = null, activatedAt = null,
      failedAt = null, failureReason = null, metadata = {}
    }) {
      const timestamp = now();
      const cleanUserId = String(userId).trim().toLowerCase();
      const cleanTag = String(nairatagId).trim().toLowerCase().replace(/^₦/, '');

      database.prepare(`
        INSERT INTO ngn_accounts (
          id, user_id, nairatag_id, provider, provider_customer_id, provider_account_id,
          account_type, bank_name, bank_code, account_number, account_name, currency,
          status, kyc_status, provider_reference, idempotency_key, created_at, updated_at,
          activated_at, failed_at, failure_reason, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(idempotency_key) DO UPDATE SET
          bank_name = COALESCE(excluded.bank_name, ngn_accounts.bank_name),
          bank_code = COALESCE(excluded.bank_code, ngn_accounts.bank_code),
          account_number = COALESCE(excluded.account_number, ngn_accounts.account_number),
          account_name = COALESCE(excluded.account_name, ngn_accounts.account_name),
          status = excluded.status,
          kyc_status = excluded.kyc_status,
          provider_customer_id = COALESCE(excluded.provider_customer_id, ngn_accounts.provider_customer_id),
          provider_account_id = COALESCE(excluded.provider_account_id, ngn_accounts.provider_account_id),
          activated_at = COALESCE(excluded.activated_at, ngn_accounts.activated_at),
          failed_at = COALESCE(excluded.failed_at, ngn_accounts.failed_at),
          failure_reason = COALESCE(excluded.failure_reason, ngn_accounts.failure_reason),
          metadata = excluded.metadata,
          updated_at = excluded.updated_at
      `).run(
        id, cleanUserId, `₦${cleanTag}`, provider, providerCustomerId, providerAccountId,
        accountType, bankName, bankCode, accountNumber, accountName, currency.toUpperCase(),
        status, kycStatus, providerReference, idempotencyKey || `ngn-account:${cleanUserId}`,
        timestamp, timestamp, activatedAt, failedAt, failureReason, JSON.stringify(metadata || {})
      );

      return this.getNgnAccount(cleanUserId);
    },

    updateNgnAccount(id, updates = {}) {
      const timestamp = now();
      const existing = this.getNgnAccountById(id);
      if (!existing) return null;

      const bankName = updates.bankName !== undefined ? updates.bankName : existing.bank_name;
      const bankCode = updates.bankCode !== undefined ? updates.bankCode : existing.bank_code;
      const accountNumber = updates.accountNumber !== undefined ? updates.accountNumber : existing.account_number;
      const accountName = updates.accountName !== undefined ? updates.accountName : existing.account_name;
      const status = updates.status !== undefined ? updates.status : existing.status;
      const kycStatus = updates.kycStatus !== undefined ? updates.kycStatus : existing.kyc_status;
      const activatedAt = updates.activatedAt !== undefined ? updates.activatedAt : existing.activated_at;
      const failedAt = updates.failedAt !== undefined ? updates.failedAt : existing.failed_at;
      const failureReason = updates.failureReason !== undefined ? updates.failureReason : existing.failure_reason;
      const metadata = updates.metadata !== undefined ? JSON.stringify(updates.metadata) : existing.metadata;

      database.prepare(`
        UPDATE ngn_accounts SET
          bank_name = ?, bank_code = ?, account_number = ?, account_name = ?,
          status = ?, kyc_status = ?, activated_at = ?, failed_at = ?,
          failure_reason = ?, metadata = ?, updated_at = ?
        WHERE id = ?
      `).run(
        bankName, bankCode, accountNumber, accountName,
        status, kycStatus, activatedAt, failedAt,
        failureReason, metadata, timestamp, id
      );

      return this.getNgnAccountById(id);
    },

    listNgnAccounts({ status = null, limit = 50 } = {}) {
      let query = 'SELECT * FROM ngn_accounts';
      const params = [];
      if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }
      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(Math.min(Number(limit) || 50, 100));

      const rows = database.prepare(query).all(...params);
      return rows.map(r => {
        if (r.metadata) {
          try { r.metadataObj = JSON.parse(r.metadata); } catch {}
        }
        return r;
      });
    },

    // 7c. NGN Transactions
    recordNgnTransaction({
      id, userId, nairatagId, ngnAccountId, provider = 'flutterwave',
      providerTransactionId, type = 'deposit', direction = 'credit',
      amountKobo, currency = 'NGN', status = 'confirmed', counterparty = null,
      reference, metadata = {}
    }) {
      const timestamp = now();
      const cleanUserId = String(userId).trim().toLowerCase();
      const cleanTag = String(nairatagId).trim().toLowerCase().replace(/^₦/, '');

      database.prepare(`
        INSERT INTO ngn_transactions (
          id, user_id, nairatag_id, ngn_account_id, provider,
          provider_transaction_id, type, direction, amount_kobo,
          currency, status, counterparty, reference, metadata,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, cleanUserId, `₦${cleanTag}`, ngnAccountId, provider,
        String(providerTransactionId), type, direction, Math.round(Number(amountKobo)),
        currency.toUpperCase(), status, counterparty, reference,
        JSON.stringify(metadata || {}), timestamp, timestamp
      );

      return database.prepare('SELECT * FROM ngn_transactions WHERE id = ?').get(id);
    },

    getNgnTransactionsForUser(userId, limit = 50) {
      const clean = String(userId).trim().toLowerCase().replace(/^₦/, '');
      const rows = database.prepare(`
        SELECT * FROM ngn_transactions
        WHERE lower(user_id) = ? OR lower(nairatag_id) = ? OR lower(nairatag_id) = ?
        ORDER BY created_at DESC LIMIT ?
      `).all(clean, clean, `₦${clean}`, Math.min(Number(limit) || 50, 100));
      return rows.map(r => {
        if (r.metadata) {
          try { r.metadataObj = JSON.parse(r.metadata); } catch {}
        }
        return r;
      });
    },

    getNgnAccountAnalytics() {
      const claimedTags = database.prepare('SELECT COUNT(DISTINCT tag) AS total FROM user_claimed_tags').get()?.total || 0;
      const totalAccounts = database.prepare('SELECT COUNT(*) AS total FROM ngn_accounts').get()?.total || 0;
      const activeAccounts = database.prepare("SELECT COUNT(*) AS total FROM ngn_accounts WHERE status = 'ACTIVE'").get()?.total || 0;
      const provisioningAccounts = database.prepare("SELECT COUNT(*) AS total FROM ngn_accounts WHERE status = 'PROVISIONING'").get()?.total || 0;
      const kycPendingAccounts = database.prepare("SELECT COUNT(*) AS total FROM ngn_accounts WHERE status = 'KYC_PENDING' OR status = 'ONBOARDING_REQUIRED'").get()?.total || 0;
      const failedAccounts = database.prepare("SELECT COUNT(*) AS total FROM ngn_accounts WHERE status = 'FAILED'").get()?.total || 0;

      const volumeRow = database.prepare(`
        SELECT COALESCE(SUM(amount_kobo), 0) AS total_kobo, COUNT(*) AS tx_count
        FROM ngn_transactions
        WHERE direction = 'credit' AND status = 'confirmed'
      `).get();

      const totalKobo = volumeRow?.total_kobo || 0;
      const totalTransactions = volumeRow?.tx_count || 0;

      const accountsReceiving = database.prepare(`
        SELECT COUNT(DISTINCT ngn_account_id) AS total
        FROM ngn_transactions
        WHERE direction = 'credit' AND status = 'confirmed'
      `).get()?.total || 0;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const monthlyActiveAccounts = database.prepare(`
        SELECT COUNT(DISTINCT ngn_account_id) AS total
        FROM ngn_transactions
        WHERE created_at >= ?
      `).get(thirtyDaysAgo)?.total || 0;

      const totalNgnNum = Number((totalKobo / 100).toFixed(2));
      const totalNairaTags = Math.max(claimedTags, totalAccounts);
      const activationRatePct = totalAccounts > 0 ? Number(((activeAccounts / totalAccounts) * 100).toFixed(1)) : 0;

      return {
        provider: 'flutterwave',
        nairaTags: totalNairaTags,
        totalNairaTags,
        ngnAccounts: totalAccounts,
        totalNgnAccounts: totalAccounts,
        activeAccounts,
        provisioningAccounts,
        kycPendingAccounts,
        failedAccounts,
        activationRate: Math.round(activationRatePct),
        activationRateFormatted: `${activationRatePct}%`,
        accountsReceivingMoney: accountsReceiving,
        totalNgnVolumeKobo: totalKobo,
        totalNgnReceived: totalNgnNum,
        totalNgnReceivedFormatted: `₦${totalNgnNum.toLocaleString()}`,
        transactions: totalTransactions,
        totalTransactions,
        monthlyActiveAccounts,
        avgVolumePerAccount: activeAccounts > 0 ? `₦${(totalNgnNum / activeAccounts).toFixed(2)}` : '₦0.00'
      };
    },

    saveVirtualAccount({
      id, nairatagUserId, flutterwaveCustomerId = null, flutterwaveAccountId = null,
      accountNumber, bankName, accountName, currency = 'NGN', accountType = 'static',
      status = 'active', flutterwaveReference = null, bvnHash = null
    }) {
      const timestamp = now();
      const cleanUserId = String(nairatagUserId).trim().toLowerCase();
      database.prepare(`
        INSERT INTO virtual_accounts (
          id, nairatag_user_id, flutterwave_customer_id, flutterwave_account_id,
          account_number, bank_name, account_name, currency, account_type,
          status, flutterwave_reference, bvn_hash, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(nairatag_user_id) DO UPDATE SET
          flutterwave_customer_id = COALESCE(excluded.flutterwave_customer_id, virtual_accounts.flutterwave_customer_id),
          flutterwave_account_id = COALESCE(excluded.flutterwave_account_id, virtual_accounts.flutterwave_account_id),
          account_number = excluded.account_number,
          bank_name = excluded.bank_name,
          account_name = excluded.account_name,
          currency = excluded.currency,
          account_type = excluded.account_type,
          status = excluded.status,
          flutterwave_reference = COALESCE(excluded.flutterwave_reference, virtual_accounts.flutterwave_reference),
          bvn_hash = COALESCE(excluded.bvn_hash, virtual_accounts.bvn_hash),
          updated_at = excluded.updated_at
      `).run(
        id, cleanUserId, flutterwaveCustomerId, flutterwaveAccountId,
        accountNumber, bankName, accountName, currency, accountType,
        status, flutterwaveReference, bvnHash, timestamp, timestamp
      );
      return this.getVirtualAccount(cleanUserId);
    },

    updateVirtualAccountStatus(nairatagUserId, status) {
      const timestamp = now();
      const cleanUserId = String(nairatagUserId).trim().toLowerCase();
      database.prepare('UPDATE virtual_accounts SET status = ?, updated_at = ? WHERE lower(nairatag_user_id) = ?').run(status, timestamp, cleanUserId);
      return this.getVirtualAccount(cleanUserId);
    },

    // 8. Payment Events & Idempotency
    getPaymentEvent(provider, eventId, transactionId) {
      if (eventId && transactionId) {
        return database.prepare('SELECT * FROM payment_events WHERE provider = ? AND (provider_event_id = ? OR provider_transaction_id = ?)').get(provider, String(eventId), String(transactionId));
      }
      if (eventId) {
        return database.prepare('SELECT * FROM payment_events WHERE provider = ? AND provider_event_id = ?').get(provider, String(eventId));
      }
      if (transactionId) {
        return database.prepare('SELECT * FROM payment_events WHERE provider = ? AND provider_transaction_id = ?').get(provider, String(transactionId));
      }
      return null;
    },

    recordPaymentEvent({
      id, provider = 'flutterwave', providerEventId = null, providerTransactionId = null,
      reference, status = 'processed', payloadHash
    }) {
      const timestamp = now();
      database.prepare(`
        INSERT INTO payment_events (
          id, provider, provider_event_id, provider_transaction_id,
          reference, status, payload_hash, processed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, provider, providerEventId ? String(providerEventId) : null,
        providerTransactionId ? String(providerTransactionId) : null,
        reference, status, payloadHash, timestamp, timestamp
      );
      return database.prepare('SELECT * FROM payment_events WHERE id = ?').get(id);
    },

    // 9. NGN Wallet Ledger (Integer Kobo Only)
    addLedgerEntry({
      id, nairatagUserId, currency = 'NGN', type = 'deposit',
      amountKobo, direction = 'credit', reference, source = 'flutterwave_virtual_account',
      status = 'confirmed', metadata = {}
    }) {
      const timestamp = now();
      const cleanUserId = String(nairatagUserId).trim().toLowerCase();
      const koboVal = Math.round(Number(amountKobo));
      if (!Number.isInteger(koboVal) || koboVal <= 0) {
        throw new Error('Ledger amount must be a positive integer kobo value.');
      }
      database.prepare(`
        INSERT INTO wallet_ledger (
          id, nairatag_user_id, currency, type, amount_kobo,
          direction, reference, source, status, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, cleanUserId, currency.toUpperCase(), type, koboVal,
        direction, reference, source, status, JSON.stringify(metadata || {}), timestamp
      );
      return database.prepare('SELECT * FROM wallet_ledger WHERE id = ?').get(id);
    },

    getLedgerEntries(nairatagUserId, limit = 50) {
      const cleanUserId = String(nairatagUserId).trim().toLowerCase();
      const rows = database.prepare('SELECT * FROM wallet_ledger WHERE lower(nairatag_user_id) = ? ORDER BY created_at DESC LIMIT ?').all(cleanUserId, limit);
      return rows.map(r => {
        try { r.metadata = JSON.parse(r.metadata_json); } catch {}
        return r;
      });
    },

    getLedgerBalance(nairatagUserId, currency = 'NGN') {
      const cleanUserId = String(nairatagUserId).trim().toLowerCase();
      const credits = database.prepare(`
        SELECT COALESCE(SUM(amount_kobo), 0) AS total
        FROM wallet_ledger
        WHERE lower(nairatag_user_id) = ? AND currency = ? AND direction = 'credit' AND status = 'confirmed'
      `).get(cleanUserId, currency.toUpperCase())?.total || 0;

      const debits = database.prepare(`
        SELECT COALESCE(SUM(amount_kobo), 0) AS total
        FROM wallet_ledger
        WHERE lower(nairatag_user_id) = ? AND currency = ? AND direction = 'debit' AND status = 'confirmed'
      `).get(cleanUserId, currency.toUpperCase())?.total || 0;

      const balanceKobo = credits - debits;
      return {
        currency: currency.toUpperCase(),
        balanceKobo,
        balanceNgn: (balanceKobo / 100).toFixed(2)
      };
    },

    // 10. Voucher Campaigns
    getVoucherCampaign(id) {
      if (!id) return null;
      const row = database.prepare('SELECT * FROM voucher_campaigns WHERE id = ?').get(id);
      if (row && row.eligibility_rules) {
        try { row.eligibilityRules = JSON.parse(row.eligibility_rules); } catch {}
      }
      return row || null;
    },

    listVoucherCampaigns() {
      const rows = database.prepare('SELECT * FROM voucher_campaigns ORDER BY created_at DESC').all();
      return rows.map(r => {
        if (r.eligibility_rules) {
          try { r.eligibilityRules = JSON.parse(r.eligibility_rules); } catch {}
        }
        return r;
      });
    },

    createVoucherCampaign({
      id, name, description = '', rewardType = 'FIXED', rewardAmountKobo,
      currency = 'NGN', maxIssuances = 5000, fundingSource = 'nairatag_treasury',
      partnerId = 'internal', eligibilityRules = {}, status = 'ACTIVE',
      startAt = null, expiresAt = null
    }) {
      const timestamp = now();
      database.prepare(`
        INSERT INTO voucher_campaigns (
          id, name, description, reward_type, reward_amount_kobo,
          currency, max_issuances, issued_count, funding_source,
          partner_id, eligibility_rules, status, start_at, expires_at,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, name, description, rewardType, Math.round(Number(rewardAmountKobo)),
        currency.toUpperCase(), Number(maxIssuances), fundingSource,
        partnerId, JSON.stringify(eligibilityRules || {}), status,
        startAt || timestamp, expiresAt, timestamp, timestamp
      );
      return this.getVoucherCampaign(id);
    },

    updateVoucherCampaign(id, updates = {}) {
      const timestamp = now();
      const existing = this.getVoucherCampaign(id);
      if (!existing) return null;

      const name = updates.name !== undefined ? updates.name : existing.name;
      const description = updates.description !== undefined ? updates.description : existing.description;
      const rewardAmountKobo = updates.rewardAmountKobo !== undefined ? Math.round(Number(updates.rewardAmountKobo)) : existing.reward_amount_kobo;
      const maxIssuances = updates.maxIssuances !== undefined ? Number(updates.maxIssuances) : existing.max_issuances;
      const status = updates.status !== undefined ? updates.status : existing.status;
      const eligibilityRules = updates.eligibilityRules !== undefined ? JSON.stringify(updates.eligibilityRules) : existing.eligibility_rules;
      const expiresAt = updates.expiresAt !== undefined ? updates.expiresAt : existing.expires_at;

      database.prepare(`
        UPDATE voucher_campaigns SET
          name = ?, description = ?, reward_amount_kobo = ?,
          max_issuances = ?, status = ?, eligibility_rules = ?,
          expires_at = ?, updated_at = ?
        WHERE id = ?
      `).run(name, description, rewardAmountKobo, maxIssuances, status, eligibilityRules, expiresAt, timestamp, id);

      return this.getVoucherCampaign(id);
    },

    incrementCampaignIssuedCount(campaignId) {
      const timestamp = now();
      database.prepare('UPDATE voucher_campaigns SET issued_count = issued_count + 1, updated_at = ? WHERE id = ?').run(timestamp, campaignId);
      return this.getVoucherCampaign(campaignId);
    },

    // 11. Vouchers
    getVoucherById(id) {
      const row = database.prepare('SELECT * FROM vouchers WHERE id = ?').get(id);
      if (row && row.metadata) {
        try { row.metadataObj = JSON.parse(row.metadata); } catch {}
      }
      return row || null;
    },

    getVoucherByCode(code) {
      if (!code) return null;
      const cleanCode = String(code).trim().toUpperCase();
      const row = database.prepare('SELECT * FROM vouchers WHERE voucher_code = ?').get(cleanCode);
      if (row && row.metadata) {
        try { row.metadataObj = JSON.parse(row.metadata); } catch {}
      }
      return row || null;
    },

    getUserVouchers(userId) {
      if (!userId) return [];
      const cleanId = String(userId).trim().toLowerCase();
      const rows = database.prepare('SELECT * FROM vouchers WHERE lower(nairatag_user_id) = ? ORDER BY created_at DESC').all(cleanId);
      return rows.map(r => {
        if (r.metadata) {
          try { r.metadataObj = JSON.parse(r.metadata); } catch {}
        }
        return r;
      });
    },

    getUserVoucherForCampaign(userId, campaignId) {
      if (!userId || !campaignId) return null;
      const cleanId = String(userId).trim().toLowerCase();
      const row = database.prepare('SELECT * FROM vouchers WHERE lower(nairatag_user_id) = ? AND campaign_id = ?').get(cleanId, campaignId);
      if (row && row.metadata) {
        try { row.metadataObj = JSON.parse(row.metadata); } catch {}
      }
      return row || null;
    },

    createVoucher({
      id, voucherCode, nairatagUserId, campaignId, partnerId = 'internal',
      currency = 'NGN', faceValueKobo, remainingValueKobo = null,
      status = 'ACTIVE', issuedAt = null, expiresAt, metadata = {}
    }) {
      const timestamp = now();
      const cleanUserId = String(nairatagUserId).trim().toLowerCase();
      const faceVal = Math.round(Number(faceValueKobo));
      const remVal = remainingValueKobo !== null ? Math.round(Number(remainingValueKobo)) : faceVal;

      database.prepare(`
        INSERT INTO vouchers (
          id, voucher_code, nairatag_user_id, campaign_id, partner_id,
          currency, face_value_kobo, remaining_value_kobo, status,
          issued_at, expires_at, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, voucherCode.toUpperCase(), cleanUserId, campaignId, partnerId,
        currency.toUpperCase(), faceVal, remVal, status,
        issuedAt || timestamp, expiresAt, JSON.stringify(metadata || {}),
        timestamp, timestamp
      );

      return this.getVoucherById(id);
    },

    updateVoucher(id, updates = {}) {
      const timestamp = now();
      const existing = this.getVoucherById(id);
      if (!existing) return null;

      const remainingValueKobo = updates.remainingValueKobo !== undefined ? Math.round(Number(updates.remainingValueKobo)) : existing.remaining_value_kobo;
      const status = updates.status !== undefined ? updates.status : existing.status;
      const redeemedAt = updates.redeemedAt !== undefined ? updates.redeemedAt : existing.redeemed_at;
      const metadata = updates.metadata !== undefined ? JSON.stringify(updates.metadata) : existing.metadata;

      database.prepare(`
        UPDATE vouchers SET
          remaining_value_kobo = ?, status = ?, redeemed_at = ?,
          metadata = ?, updated_at = ?
        WHERE id = ?
      `).run(remainingValueKobo, status, redeemedAt, metadata, timestamp, id);

      return this.getVoucherById(id);
    },

    // 12. Voucher Redemptions
    recordVoucherRedemption({
      id, voucherId, nairatagUserId, partnerId, amountKobo,
      currency = 'NGN', externalReference = null, status = 'CONFIRMED'
    }) {
      const timestamp = now();
      const cleanUserId = String(nairatagUserId).trim().toLowerCase();
      database.prepare(`
        INSERT INTO voucher_redemptions (
          id, voucher_id, nairatag_user_id, partner_id,
          amount_kobo, currency, external_reference, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, voucherId, cleanUserId, partnerId,
        Math.round(Number(amountKobo)), currency.toUpperCase(),
        externalReference, status, timestamp
      );
      return database.prepare('SELECT * FROM voucher_redemptions WHERE id = ?').get(id);
    },

    getVoucherRedemptions(voucherId) {
      return database.prepare('SELECT * FROM voucher_redemptions WHERE voucher_id = ? ORDER BY created_at DESC').all(voucherId);
    },

    listVoucherRedemptions(limit = 50) {
      return database.prepare('SELECT * FROM voucher_redemptions ORDER BY created_at DESC LIMIT ?').all(limit);
    },

    // 13. Partner Voucher Inventory
    addPartnerVoucherInventory({ id, partnerId, campaignId, externalCode, faceValueKobo, expiresAt = null }) {
      const timestamp = now();
      database.prepare(`
        INSERT INTO partner_voucher_inventory (
          id, partner_id, campaign_id, external_code, face_value_kobo,
          status, assigned_to_voucher_id, expires_at, created_at
        ) VALUES (?, ?, ?, ?, ?, 'AVAILABLE', null, ?, ?)
      `).run(id, partnerId, campaignId, externalCode.trim().toUpperCase(), Math.round(Number(faceValueKobo)), expiresAt, timestamp);
      return database.prepare('SELECT * FROM partner_voucher_inventory WHERE id = ?').get(id);
    },

    claimAvailablePartnerVoucherCode({ partnerId, campaignId, voucherId }) {
      const row = database.prepare(`
        SELECT * FROM partner_voucher_inventory
        WHERE partner_id = ? AND campaign_id = ? AND status = 'AVAILABLE'
        ORDER BY created_at ASC LIMIT 1
      `).get(partnerId, campaignId);
      if (!row) return null;

      database.prepare(`
        UPDATE partner_voucher_inventory
        SET status = 'ASSIGNED', assigned_to_voucher_id = ?
        WHERE id = ?
      `).run(voucherId, row.id);

      return row;
    },

    // 14. Bounty Layer
    createBounty({ id, creator, creatorWallet, title, description, category, taskType = 'milestone', reward, token = 'cNGN', chainId = 42220, deadline, deliverable, requirements = [], visibility = 'public', funded = 1, fundingTx = null }) {
      const timestamp = now();
      database.prepare(`
        INSERT INTO bounties (
          id, creator, creator_wallet, title, description, category, task_type,
          reward, token, chain_id, deadline, deliverable, requirements_json,
          visibility, status, funded, funding_tx, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)
      `).run(
        id, creator, normalizeWallet(creatorWallet), title, description, category, taskType,
        Number(reward) || 0, token, Number(chainId) || 42220, Number(deadline) || (Date.now() + 7 * 86400000),
        deliverable || '', JSON.stringify(requirements || []), visibility, funded ? 1 : 0, fundingTx || null,
        timestamp, timestamp
      );
      return this.getBounty(id);
    },

    getBounty(id) {
      const row = database.prepare('SELECT * FROM bounties WHERE id = ?').get(id);
      if (!row) return null;
      try { row.requirements = JSON.parse(row.requirements_json || '[]'); } catch { row.requirements = []; }
      const apps = database.prepare('SELECT COUNT(*) as count FROM bounty_applications WHERE bounty_id = ?').get(id);
      row.applications_count = apps ? apps.count : 0;
      return row;
    },

    listBounties(filters = {}) {
      let sql = 'SELECT * FROM bounties WHERE 1=1';
      const params = [];
      if (filters.category && filters.category !== 'all') {
        sql += ' AND category = ?';
        params.push(filters.category);
      }
      if (filters.status && filters.status !== 'all') {
        sql += ' AND status = ?';
        params.push(filters.status);
      }
      if (filters.creator) {
        sql += ' AND (LOWER(creator) = LOWER(?) OR LOWER(creator_wallet) = LOWER(?))';
        params.push(filters.creator, normalizeWallet(filters.creator));
      }
      if (filters.assignedAgent) {
        sql += ' AND (LOWER(assigned_agent) = LOWER(?) OR LOWER(assigned_wallet) = LOWER(?))';
        params.push(filters.assignedAgent, normalizeWallet(filters.assignedAgent));
      }
      if (filters.search) {
        sql += ' AND (title LIKE ? OR description LIKE ? OR creator LIKE ?)';
        const s = `%${filters.search}%`;
        params.push(s, s, s);
      }
      sql += ' ORDER BY created_at DESC LIMIT ?';
      params.push(Math.min(Number(filters.limit) || 50, 100));

      const rows = database.prepare(sql).all(...params);
      return rows.map(r => {
        try { r.requirements = JSON.parse(r.requirements_json || '[]'); } catch { r.requirements = []; }
        const apps = database.prepare('SELECT COUNT(*) as count FROM bounty_applications WHERE bounty_id = ?').get(r.id);
        r.applications_count = apps ? apps.count : 0;
        return r;
      });
    },

    updateBountyStatus(id, status, extra = {}) {
      const timestamp = now();
      const b = this.getBounty(id);
      if (!b) return null;

      let sql = 'UPDATE bounties SET status = ?, updated_at = ?';
      const params = [status, timestamp];

      if (extra.assignedAgent !== undefined) {
        sql += ', assigned_agent = ?';
        params.push(extra.assignedAgent);
      }
      if (extra.assignedWallet !== undefined) {
        sql += ', assigned_wallet = ?';
        params.push(normalizeWallet(extra.assignedWallet));
      }
      if (extra.settlementTx !== undefined) {
        sql += ', settlement_tx = ?';
        params.push(extra.settlementTx);
      }
      if (extra.funded !== undefined) {
        sql += ', funded = ?';
        params.push(extra.funded ? 1 : 0);
      }
      if (extra.fundingTx !== undefined) {
        sql += ', funding_tx = ?';
        params.push(extra.fundingTx);
      }

      sql += ' WHERE id = ?';
      params.push(id);
      database.prepare(sql).run(...params);
      return this.getBounty(id);
    },

    createBountyApplication({ id, bountyId, agentTag, agentWallet, bid, eta, pitch }) {
      const timestamp = now();
      database.prepare(`
        INSERT INTO bounty_applications (id, bounty_id, agent_tag, agent_wallet, bid, eta, pitch, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(id, bountyId, agentTag, normalizeWallet(agentWallet), Number(bid) || 0, eta || '', pitch || '', timestamp);
      return database.prepare('SELECT * FROM bounty_applications WHERE id = ?').get(id);
    },

    listBountyApplications(bountyId) {
      return database.prepare('SELECT * FROM bounty_applications WHERE bounty_id = ? ORDER BY created_at DESC').all(bountyId);
    },

    updateBountyApplication(id, status) {
      database.prepare('UPDATE bounty_applications SET status = ? WHERE id = ?').run(status, id);
      return database.prepare('SELECT * FROM bounty_applications WHERE id = ?').get(id);
    },

    createBountySubmission({ id, bountyId, agentTag, submissionText, deliverableUrl }) {
      const timestamp = now();
      database.prepare(`
        INSERT INTO bounty_submissions (id, bounty_id, agent_tag, submission_text, deliverable_url, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'submitted', ?)
      `).run(id, bountyId, agentTag, submissionText || '', deliverableUrl || '', timestamp);
      return database.prepare('SELECT * FROM bounty_submissions WHERE id = ?').get(id);
    },

    listBountySubmissions(bountyId) {
      return database.prepare('SELECT * FROM bounty_submissions WHERE bounty_id = ? ORDER BY created_at DESC').all(bountyId);
    },

    // 15. Tag2Tag Interactions
    createTag2TagInteraction({ id, fromAgent, toAgent, type, payload, amount = null, token = 'cNGN', txHash = null }) {
      const timestamp = now();
      database.prepare(`
        INSERT INTO tag2tag_interactions (id, from_agent, to_agent, type, payload_json, amount, token, status, tx_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
      `).run(id, fromAgent, toAgent, type, JSON.stringify(payload || {}), amount ? Number(amount) : null, token, txHash, timestamp, timestamp);
      return this.getTag2TagInteraction(id);
    },

    getTag2TagInteraction(id) {
      const row = database.prepare('SELECT * FROM tag2tag_interactions WHERE id = ?').get(id);
      if (!row) return null;
      try { row.payload = JSON.parse(row.payload_json || '{}'); } catch { row.payload = {}; }
      return row;
    },

    listTag2TagInteractions(agentTagOrWallet, limit = 20) {
      const tag = String(agentTagOrWallet || '').trim();
      const clean = tag.replace(/^₦/, '').toLowerCase();
      const rows = database.prepare(`
        SELECT * FROM tag2tag_interactions
        WHERE LOWER(from_agent) = LOWER(?) OR LOWER(from_agent) = LOWER(?)
           OR LOWER(to_agent) = LOWER(?) OR LOWER(to_agent) = LOWER(?)
        ORDER BY created_at DESC LIMIT ?
      `).all(clean, `₦${clean}`, clean, `₦${clean}`, Math.min(Number(limit) || 20, 100));
      return rows.map(r => {
        try { r.payload = JSON.parse(r.payload_json || '{}'); } catch { r.payload = {}; }
        return r;
      });
    },

    updateTag2TagInteraction(id, status, txHash = null) {
      const timestamp = now();
      if (txHash) {
        database.prepare('UPDATE tag2tag_interactions SET status = ?, tx_hash = ?, updated_at = ? WHERE id = ?').run(status, txHash, timestamp, id);
      } else {
        database.prepare('UPDATE tag2tag_interactions SET status = ?, updated_at = ? WHERE id = ?').run(status, timestamp, id);
      }
      return this.getTag2TagInteraction(id);
    },

    // 16. Agent Earnings & Leaderboard Rankings
    upsertAgentEarnings({ tag, walletAddress = null, role, category = 'dev', totalCngn = 0, monthlyCngn = 0, weeklyCngn = 0, todayCngn = 0, jobsCompleted = 0, reputation = 85, changePct = '+0.0%', changeDir = 'up', color = '#0052ff' }) {
      const timestamp = now();
      const cleanTag = tag.startsWith('₦') ? tag : `₦${tag}`;
      database.prepare(`
        INSERT INTO agent_earnings (
          tag, wallet_address, role, category, total_cngn, monthly_cngn, weekly_cngn, today_cngn,
          jobs_completed, reputation, change_pct, change_dir, color, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(tag) DO UPDATE SET
          wallet_address = COALESCE(excluded.wallet_address, agent_earnings.wallet_address),
          role = COALESCE(excluded.role, agent_earnings.role),
          category = COALESCE(excluded.category, agent_earnings.category),
          total_cngn = excluded.total_cngn,
          monthly_cngn = excluded.monthly_cngn,
          weekly_cngn = excluded.weekly_cngn,
          today_cngn = excluded.today_cngn,
          jobs_completed = excluded.jobs_completed,
          reputation = excluded.reputation,
          change_pct = excluded.change_pct,
          change_dir = excluded.change_dir,
          color = excluded.color,
          updated_at = excluded.updated_at
      `).run(
        cleanTag, normalizeWallet(walletAddress), role, category,
        Number(totalCngn) || 0, Number(monthlyCngn) || 0, Number(weeklyCngn) || 0, Number(todayCngn) || 0,
        Number(jobsCompleted) || 0, Number(reputation) || 85, changePct, changeDir, color, timestamp
      );
      return this.getAgentEarnings(cleanTag);
    },

    getAgentEarnings(tag) {
      const cleanTag = String(tag || '').trim();
      const withNaira = cleanTag.startsWith('₦') ? cleanTag : `₦${cleanTag}`;
      const withoutNaira = cleanTag.replace(/^₦/, '');
      return database.prepare('SELECT * FROM agent_earnings WHERE LOWER(tag) = LOWER(?) OR LOWER(tag) = LOWER(?)').get(withNaira, withoutNaira);
    },

    listAgentEarnings(period = 'alltime', category = 'all', limit = 20) {
      let sortCol = 'total_cngn';
      if (period === 'monthly') sortCol = 'monthly_cngn';
      else if (period === 'weekly') sortCol = 'weekly_cngn';
      else if (period === 'today') sortCol = 'today_cngn';

      let sql = `SELECT * FROM agent_earnings`;
      const params = [];
      if (category && category !== 'all') {
        sql += ` WHERE category = ?`;
        params.push(category);
      }
      sql += ` ORDER BY ${sortCol} DESC, jobs_completed DESC LIMIT ?`;
      params.push(Math.min(Number(limit) || 20, 50));

      const rows = database.prepare(sql).all(...params);
      return rows.map((r, i) => ({
        rank: i + 1,
        tag: r.tag,
        role: r.role || 'Sovereign Agent',
        category: r.category,
        earnings: period === 'monthly' ? r.monthly_cngn : (period === 'weekly' ? r.weekly_cngn : (period === 'today' ? r.today_cngn : r.total_cngn)),
        totalEarnings: r.total_cngn,
        jobs: r.jobs_completed,
        reputation: r.reputation,
        change: r.change_pct,
        dir: r.change_dir,
        color: r.color || '#0052ff',
        walletAddress: r.wallet_address
      }));
    },

    recordAgentPayout({ tag, amountCngn, isBounty = true, role = null, category = 'dev' }) {
      const cleanTag = String(tag || '').trim();
      const withNaira = cleanTag.startsWith('₦') ? cleanTag : `₦${cleanTag}`;
      const existing = this.getAgentEarnings(withNaira);
      const amt = Number(amountCngn) || 0;
      const timestamp = now();

      if (!existing) {
        database.prepare(`
          INSERT INTO agent_earnings (
            tag, role, category, total_cngn, monthly_cngn, weekly_cngn, today_cngn,
            jobs_completed, reputation, change_pct, change_dir, color, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 88, '+5.0%', 'up', '#0052ff', ?)
        `).run(withNaira, role || 'Autonomous Agent', category, amt, amt, amt, amt, timestamp);
      } else {
        database.prepare(`
          UPDATE agent_earnings SET
            total_cngn = total_cngn + ?,
            monthly_cngn = monthly_cngn + ?,
            weekly_cngn = weekly_cngn + ?,
            today_cngn = today_cngn + ?,
            jobs_completed = jobs_completed + 1,
            reputation = MIN(100, reputation + 2),
            change_pct = '+12.5%',
            change_dir = 'up',
            updated_at = ?
          WHERE LOWER(tag) = LOWER(?)
        `).run(amt, amt, amt, amt, timestamp, withNaira);
      }
      return this.getAgentEarnings(withNaira);
    },

    close() { database.close(); },
  };
}

module.exports = { createNotificationStore };
