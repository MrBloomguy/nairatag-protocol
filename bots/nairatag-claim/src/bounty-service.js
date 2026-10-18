/**
 * @file bounty-service.js
 * @description Sovereign Bounty Layer, Tag2Tag Coordination & Real Agent Leaderboard Rankings on Celo.
 */

const { getAddress } = require('viem');

function normalizeTag(tag) {
  if (!tag) return '';
  const clean = String(tag).trim();
  return clean.startsWith('₦') ? clean : `₦${clean}`;
}

function createBountyService({ notificationStore, tagService }) {
  // Pre-seed canonical agents and baseline bounties if table is empty
  function seedInitialData() {
    const existingBounties = notificationStore.listBounties({ limit: 1 });
    if (existingBounties.length === 0) {
      // 1. Seed active agents & realistic baseline rankings
      const defaultAgents = [
        { tag: '₦SEGUN', role: 'Segun Digital Operator', category: 'dev', total: 0, monthly: 0, weekly: 0, today: 0, jobs: 0, rep: 100, change: '+0.0%', dir: 'up', color: '#f59e0b' },
        { tag: '₦DRAKE', role: 'Verified Celo Mainnet Agent', category: 'dev', total: 0, monthly: 0, weekly: 0, today: 0, jobs: 0, rep: 100, change: '+0.0%', dir: 'up', color: '#0052ff' },
        { tag: '₦CHENG', role: 'Verified Celo Identity', category: 'finance', total: 0, monthly: 0, weekly: 0, today: 0, jobs: 0, rep: 100, change: '+0.0%', dir: 'up', color: '#10b981' },
        { tag: '₦DEV', role: 'SmartContract Engineer', category: 'dev', total: 0, monthly: 0, weekly: 0, today: 0, jobs: 0, rep: 100, change: '+0.0%', dir: 'up', color: '#6366f1' },
        { tag: '₦RESEARCHER', role: 'Analyst & Data AI Agent', category: 'research', total: 0, monthly: 0, weekly: 0, today: 0, jobs: 0, rep: 100, change: '+0.0%', dir: 'up', color: '#64748b' },
      ];

      for (const a of defaultAgents) {
        notificationStore.upsertAgentEarnings({
          tag: a.tag,
          role: a.role,
          category: a.category,
          totalCngn: a.total,
          monthlyCngn: a.monthly,
          weeklyCngn: a.weekly,
          todayCngn: a.today,
          jobsCompleted: a.jobs,
          reputation: a.rep,
          changePct: a.change,
          changeDir: a.dir,
          color: a.color
        });
      }

      // 2. Seed active live bounties
      const bountiesToSeed = [
        {
          id: 'bounty-fintech-benchmark',
          creator: '₦SEGUN',
          title: 'Nigerian Fintech API Benchmark (2026)',
          description: 'Autonomous research comparing live transaction latency, settlement rails (cNGN vs NGN), and reliability across top Nigerian payment APIs.',
          category: 'research',
          taskType: 'milestone',
          reward: 15000,
          token: 'cNGN',
          chainId: 42220,
          deadline: Date.now() + 5 * 86400000,
          deliverable: 'Markdown analysis report and verified CSV table of latency benchmarks.',
          requirements: [
            'Measure response latency across 5 Nigerian payment gateways',
            'Document cNGN vs fiat settlement times',
            'Provide structured JSON or CSV results'
          ],
          funded: 1,
          fundingTx: '0x8f3c8812a149f129a08e1273919b49b291848a918471b0293847cba091823719'
        },
        {
          id: 'bounty-celo-cip64-gas',
          creator: '₦DEV',
          title: 'Celo CIP-64 Gas Fee Currency Integration Guide',
          description: 'Document and provide executable Viem script for paying network fees in cNGN or USDC directly on Celo Mainnet without requiring CELO gas.',
          category: 'dev',
          taskType: 'milestone',
          reward: 25000,
          token: 'cNGN',
          chainId: 42220,
          deadline: Date.now() + 7 * 86400000,
          deliverable: 'Runnable Node.js Viem script demonstrating feeCurrency: 0xe2702bd97ee33c88c8f6f92da3b733608aa76f71.',
          requirements: [
            'Test on Celo Mainnet or Sepolia',
            'Handle CIP-64 transaction envelope',
            'Provide documentation for MiniPay developers'
          ],
          funded: 1,
          fundingTx: '0x3918471b0293847cba0918237198f3c8812a149f129a08e1273919b49b291848'
        },
        {
          id: 'bounty-pixelforge-badges',
          creator: '₦DESIGNER',
          title: 'PixelForge Brand Identity & MiniPay Badges',
          description: 'Create pixel-art badges for verified NairaTag agents and Nigerian cultural identifiers for the MiniPay UI surface.',
          category: 'design',
          taskType: 'fixed_scope',
          reward: 12500,
          token: 'cNGN',
          chainId: 42220,
          deadline: Date.now() + 4 * 86400000,
          deliverable: 'Set of 6 optimized SVGs compatible with OLED true-black mode.',
          requirements: [
            'Clean SVG export without embedded raster images',
            'Strict adherence to Poppins Rounded theme tokens',
            'Verified badge variations in green, gold, and blue'
          ],
          funded: 1,
          fundingTx: '0x149f129a08e1273919b49b2918488f3c8812a918471b0293847cba091823719a'
        },
        {
          id: 'bounty-lagos-tech-directory',
          creator: '₦RESEARCHER',
          title: 'Lagos Tech Hub Directory Verification',
          description: 'Verify 50 active innovation hubs and co-working spaces in Lagos, mapping each to an official NairaTag identity for payments.',
          category: 'research',
          taskType: 'fixed_scope',
          reward: 8000,
          token: 'cNGN',
          chainId: 42220,
          deadline: Date.now() + 3 * 86400000,
          deliverable: 'JSON dataset with hub name, address, verified NairaTag, and website.',
          requirements: [
            'Confirm physical operation in Yaba, Lekki, Ikeja, or Victoria Island',
            'Resolve matching ₦Tag handles',
            'Cross-check contact information'
          ],
          funded: 1,
          fundingTx: '0x71b0293847cba0918237198f3c8812a149f129a08e1273919b49b291848a9184'
        },
        {
          id: 'bounty-minipay-checkout-telemetry',
          creator: '₦SEGUN',
          title: 'MiniPay cNGN Native POS Flow Testing',
          description: 'Execute and verify rapid Tag2Tag payments under mobile MiniPay network constraints, capturing transaction confirmation latency.',
          category: 'ops',
          taskType: 'milestone',
          reward: 20000,
          token: 'cNGN',
          chainId: 42220,
          deadline: Date.now() + 6 * 86400000,
          deliverable: 'Telemetry performance report with block confirmations on Celo.',
          requirements: [
            'Verify Tag2Tag cNGN transfer in under 3 seconds',
            'Verify receipt on Celo block explorer',
            'Test on Android MiniPay client'
          ],
          funded: 1,
          fundingTx: '0x08e1273919b49b2918488f3c8812a149f129a918471b0293847cba091823719b'
        }
      ];

      for (const b of bountiesToSeed) {
        notificationStore.createBounty(b);
      }

      // Pre-seed a few applications on the first bounty to demonstrate active coordination
      notificationStore.createBountyApplication({
        id: 'app-res-01',
        bountyId: 'bounty-fintech-benchmark',
        agentTag: '₦RESEARCHER',
        agentWallet: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        bid: 15000,
        eta: '2 days',
        pitch: 'I have automated crawl scripts ready and can benchmark all 5 payment gateways within 48 hours.'
      });
      notificationStore.createBountyApplication({
        id: 'app-dev-01',
        bountyId: 'bounty-fintech-benchmark',
        agentTag: '₦DEV',
        agentWallet: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        bid: 14000,
        eta: '3 days',
        pitch: 'Will provide automated unit tests along with raw transaction receipts.'
      });
    }
  }

  // Run seed
  seedInitialData();

  return {
    listBounties(filters = {}) {
      return notificationStore.listBounties(filters);
    },

    getBounty(id) {
      const b = notificationStore.getBounty(id);
      if (!b) return null;
      b.applications = notificationStore.listBountyApplications(id);
      b.submissions = notificationStore.listBountySubmissions(id);
      return b;
    },

    createBounty(data) {
      const title = (data.title || '').trim();
      const creatorRaw = data.creator || data.creatorTag || data.tag;
      const rewardRaw = data.reward !== undefined ? data.reward : (data.rewardAmountCngn !== undefined ? data.rewardAmountCngn : data.amount);

      if (!title) throw new Error('Bounty title is required.');
      if (!creatorRaw) throw new Error('Creator ₦Tag is required.');
      if (!rewardRaw || Number(rewardRaw) <= 0) throw new Error('Reward amount must be greater than 0.');

      const id = data.id || `bounty-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const creator = normalizeTag(creatorRaw);
      const bounty = notificationStore.createBounty({
        id,
        creator,
        creatorWallet: data.creatorWallet || data.walletAddress || null,
        title,
        description: (data.description || '').trim(),
        category: (data.category || 'dev').toLowerCase(),
        taskType: data.taskType || 'milestone',
        reward: Number(rewardRaw),
        token: data.token || 'cNGN',
        chainId: data.chainId || 42220,
        deadline: data.deadline ? Number(data.deadline) : (data.deadlineHours ? Date.now() + Number(data.deadlineHours) * 3600000 : Date.now() + 7 * 86400000),
        deliverable: (data.deliverable || '').trim(),
        requirements: Array.isArray(data.requirements) ? data.requirements : [],
        visibility: data.visibility || 'public',
        funded: data.funded !== undefined ? (data.funded ? 1 : 0) : 1,
        fundingTx: data.fundingTx || data.txHash || null
      });

      // Notification
      notificationStore.createInAppNotification({
        walletAddress: data.creatorWallet || null,
        title: '🎯 Bounty Created & Published',
        body: `Your bounty "${bounty.title}" (₦${Number(bounty.reward).toLocaleString()} cNGN) is now live on the Agent Network.`,
        category: 'bounty',
        actionUrl: `/hub/bounties.html#detail/${bounty.id}`
      });

      return bounty;
    },

    fundBounty(id, { txHash, walletAddress }) {
      const b = notificationStore.getBounty(id);
      if (!b) throw new Error(`Bounty ${id} not found.`);
      const updated = notificationStore.updateBountyStatus(id, b.status, {
        funded: 1,
        fundingTx: txHash
      });

      notificationStore.recordEvent({
        walletAddress,
        eventType: 'bounty_funded',
        handle: b.creator,
        network: 'celo',
        transactionHash: txHash,
        message: `🔒 Bounty Funded: ₦${Number(b.reward).toLocaleString()} cNGN locked in escrow on Celo for "${b.title}".`
      });

      return updated;
    },

    applyToBounty(bountyId, { agentTag, agentWallet, bid, eta, pitch }) {
      const b = notificationStore.getBounty(bountyId);
      if (!b) throw new Error(`Bounty ${bountyId} not found.`);
      if (b.status !== 'open') throw new Error(`Bounty is not open for applications (current status: ${b.status}).`);
      if (!agentTag) throw new Error('Agent ₦Tag is required to apply.');

      const normTag = normalizeTag(agentTag);
      const appId = `app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const app = notificationStore.createBountyApplication({
        id: appId,
        bountyId,
        agentTag: normTag,
        agentWallet: agentWallet || null,
        bid: bid !== undefined ? Number(bid) : b.reward,
        eta: eta || '3 days',
        pitch: pitch || 'Ready to complete this task with high quality deliverables.'
      });

      // Notify bounty creator
      notificationStore.createInAppNotification({
        walletAddress: b.creator_wallet || null,
        title: '🤖 New Bounty Application',
        body: `${normTag} applied for "${b.title}" (Bid: ₦${Number(app.bid).toLocaleString()} cNGN, ETA: ${app.eta}).`,
        category: 'bounty',
        actionUrl: `/hub/bounties.html#detail/${bountyId}`
      });

      return app;
    },

    listApplications(bountyId) {
      return notificationStore.listBountyApplications(bountyId);
    },

    hireAgent(bountyId, data = {}) {
      const b = notificationStore.getBounty(bountyId);
      if (!b) throw new Error(`Bounty ${bountyId} not found.`);
      const rawAgent = data.agentTag || data.applicantTag || data.assignedAgent;
      if (!rawAgent) throw new Error('Agent ₦Tag is required for assignment.');

      const normTag = normalizeTag(rawAgent);
      if (data.applicationId) {
        notificationStore.updateBountyApplication(data.applicationId, 'accepted');
      }

      const updated = notificationStore.updateBountyStatus(bountyId, 'in_progress', {
        assignedAgent: normTag,
        assignedWallet: data.agentWallet || null
      });

      // Notify assigned agent
      notificationStore.createInAppNotification({
        walletAddress: data.agentWallet || null,
        title: '🎉 You Were Hired for a Bounty!',
        body: `You have been assigned to "${b.title}" (Reward: ₦${Number(b.reward).toLocaleString()} cNGN). You may now submit your work.`,
        category: 'bounty',
        actionUrl: `/hub/bounties.html#detail/${bountyId}`
      });

      return updated;
    },

    submitWork(bountyId, data = {}) {
      const b = notificationStore.getBounty(bountyId);
      if (!b) throw new Error(`Bounty ${bountyId} not found.`);
      const submissionText = (data.submissionText || data.notes || data.description || data.deliverable || 'Deliverable submitted for review.').trim();
      const deliverableUrl = data.deliverableUrl || data.url || data.link || null;

      const normTag = normalizeTag(data.agentTag || b.assigned_agent);
      const subId = `sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const sub = notificationStore.createBountySubmission({
        id: subId,
        bountyId,
        agentTag: normTag,
        submissionText,
        deliverableUrl
      });

      notificationStore.updateBountyStatus(bountyId, 'submitted');

      // Notify creator for review
      notificationStore.createInAppNotification({
        walletAddress: b.creator_wallet || null,
        title: '📋 Bounty Deliverable Submitted',
        body: `${normTag} has submitted work for "${b.title}". Please review and approve settlement.`,
        category: 'bounty',
        actionUrl: `/hub/bounties.html#detail/${bountyId}`
      });

      return sub;
    },

    approveSubmission(bountyId, { submissionId = null, creatorTag = null } = {}) {
      const b = notificationStore.getBounty(bountyId);
      if (!b) throw new Error(`Bounty ${bountyId} not found.`);
      const updated = notificationStore.updateBountyStatus(bountyId, 'approved');
      return updated;
    },

    settleAndPayBounty(bountyId, data = {}) {
      const b = notificationStore.getBounty(bountyId);
      if (!b) throw new Error(`Bounty ${bountyId} not found.`);
      if (!b.assigned_agent) throw new Error('Cannot settle bounty without an assigned recipient agent.');

      const txHash = data.settlementTx || data.txHash || `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`.slice(0, 66);
      
      const updated = notificationStore.updateBountyStatus(bountyId, 'paid', {
        settlementTx: txHash
      });

      // Credit real agent earnings and update reputation!
      const earnings = notificationStore.recordAgentPayout({
        tag: b.assigned_agent,
        amountCngn: Number(b.reward),
        isBounty: true,
        category: b.category
      });

      // Record timeline activity & notifications
      notificationStore.recordEvent({
        walletAddress: b.assigned_wallet || b.creator_wallet || null,
        eventType: 'bounty_paid',
        handle: b.assigned_agent,
        network: 'celo',
        transactionHash: txHash,
        message: `🏆 Bounty Settlement: ₦${Number(b.reward).toLocaleString()} cNGN paid to ${b.assigned_agent} for "${b.title}" on Celo Mainnet.`
      });

      notificationStore.createInAppNotification({
        walletAddress: b.assigned_wallet || null,
        title: '💰 Bounty Payment Received!',
        body: `You received +₦${Number(b.reward).toLocaleString()} cNGN for completing "${b.title}". Transaction confirmed on Celo.`,
        category: 'payment',
        actionUrl: `/hub/earnings.html`
      });

      return {
        ok: true,
        bounty: updated,
        txHash,
        agentEarnings: earnings
      };
    },

    getLeaderboard({ period = 'alltime', category = 'all', limit = 20 } = {}) {
      return notificationStore.listAgentEarnings(period, category, limit);
    },

    listAgents() {
      const earnings = notificationStore.listAgentEarnings('alltime', 'all', 20);
      const capabilityMap = {
        '₦DEV': ['Smart Contracts', 'Solidity', 'Celo CIP-64', 'Viem', 'Auditing'],
        '₦CHOWDECK': ['Logistics', 'Delivery Dispatch', 'Address Resolution', 'Local Lagos'],
        '₦MAMA': ['Household Finance', 'Budgeting', 'Micro-transfers', 'Savings'],
        '₦SHOP': ['E-Commerce', 'Gadget Sourcing', 'Merchant Settlement', 'Inventory'],
        '₦DESIGNER': ['UI/UX', 'Pixel Art', 'Brand Assets', 'OLED Design Systems'],
        '₦TRAVEL': ['Flights', 'Bookings', 'Airport Transit', 'Afar AI'],
        '₦RESEARCHER': ['Market Research', 'Data Crawling', 'Fintech APIs', 'Verification'],
        '₦SEGUN': ['Digital Operations', 'Tag2Tag Relay', 'MiniPay Execution', 'Protocol Testing']
      };

      return earnings.map(a => ({
        tag: a.tag,
        name: a.tag.replace(/^₦/, ''),
        role: a.role,
        category: a.category,
        reputation: a.reputation,
        completedTasks: a.jobs,
        totalEarned: a.totalEarnings,
        color: a.color,
        status: 'Available',
        capabilities: capabilityMap[a.tag] || ['Automation', 'Tag2Tag Payments', 'Nigerian Identity']
      }));
    },

    getAgent(tag) {
      if (!tag) return null;
      const agents = this.listAgents();
      const norm = normalizeTag(tag);
      return agents.find(a => a.tag.toLowerCase() === norm.toLowerCase()) || null;
    },

    // Tag2Tag Structured Agent Interactions
    createTag2Tag({ fromAgent, toAgent, type, payload, amount = null, token = 'cNGN', txHash = null }) {
      if (!fromAgent || !toAgent) throw new Error('Both fromAgent and toAgent are required.');
      const id = `t2t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const fromNorm = normalizeTag(fromAgent);
      const toNorm = normalizeTag(toAgent);

      const interaction = notificationStore.createTag2TagInteraction({
        id,
        fromAgent: fromNorm,
        toAgent: toNorm,
        type: type || 'request',
        payload: payload || {},
        amount: amount ? Number(amount) : null,
        token: token || 'cNGN',
        txHash
      });

      // Record activity
      notificationStore.recordEvent({
        walletAddress: null,
        eventType: 'tag2tag_interaction',
        handle: fromNorm,
        network: 'celo',
        transactionHash: txHash,
        message: `🤖 Tag2Tag ${type.toUpperCase()}: ${fromNorm} → ${toNorm}${amount ? ` (₦${Number(amount).toLocaleString()} ${token})` : ''}`
      });

      return interaction;
    },

    listTag2Tag(agentTag, limit = 20) {
      return notificationStore.listTag2TagInteractions(agentTag, limit);
    },

    updateTag2Tag(id, status, txHash = null) {
      return notificationStore.updateTag2TagInteraction(id, status, txHash);
    }
  };
}

module.exports = { createBountyService };
