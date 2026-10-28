import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bot,
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Zap,
  Plus,
  ChevronDown,
  ChevronRight,
  Info,
  X,
  Wallet,
  Copy,
  Check,
  LayoutGrid,
  History,
  FileText,
  Lock,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  Server,
  Key,
  Globe,
  Radio,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  fetchArcAgentDirectory,
  getAdminArcAgentRegistry,
  createArcPlatformAgent,
  transitionArcAgent,
  enableArcMcpTool,
} from '../../services/arcAgents.js';
import { connectWallet } from '../../services/arcPayment.js';
import { getArcAdminDashboard, submitArcAdminAction } from '../../services/arcAdmin.js';
import './PlatformAgentAdminPage.css';

export default function PlatformAgentAdminPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState('');
  const [operations, setOperations] = useState(null);
  const [operationsError, setOperationsError] = useState('');
  const [taskForm, setTaskForm] = useState({ title: '', description: '', category: 'community', categoryLabel: 'Community', deliverable: '', rewardUSDC: 0, points: 100, deadline: '' });
  const [voucherForm, setVoucherForm] = useState({ title: '', description: '', category: 'community', points: 25, actionUrl: '' });
  const [rewardForm, setRewardForm] = useState({ userWallet: '', points: 100, reason: '' });
  
  // Tab / Filter states
  const [activeNav, setActiveNav] = useState('registry'); // 'dashboard' | 'registry' | 'mcp' | 'capabilities'
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'draft' | 'mcp'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Registration form state
  const emptyForm = {
    tag: '',
    displayName: '',
    category: '',
    description: '',
    avatarUrl: '',
    aliases: '',
    entityType: 'autonomous_agent',
    mcpEndpoint: '',
    mcpAuthType: 'none',
    mcpAuthHeader: '',
    mcpAuthSecret: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [showSecret, setShowSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Schema Inspection Modal State
  const [inspectingAgent, setInspectingAgent] = useState(null);
  const [copiedSchema, setCopiedSchema] = useState(false);

  // Theme support
  const [theme, setTheme] = useState(() => {
    try {
      return document.documentElement.getAttribute('data-theme') || 'light';
    } catch {
      return 'light';
    }
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('nairatag-theme', next);
    } catch {}
  };

  const refreshAgents = useCallback(async () => {
    setLoading(true);
    try {
      setAgents(
        walletAddress
          ? await getAdminArcAgentRegistry({ walletAddress })
          : await fetchArcAgentDirectory()
      );
      if (walletAddress) {
        setOperations(await getArcAdminDashboard(walletAddress));
        setOperationsError('');
      }
      setDirectoryError('');
    } catch (error) {
      setDirectoryError(error.message || 'Could not load the Arc agent registry.');
      if (walletAddress) setOperationsError(error.message || 'Could not load admin operations.');
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  const runOperation = async (action, fields) => {
    setSubmitting(true);
    setNotice(null);
    try {
      await submitArcAdminAction(walletAddress, action, fields);
      setNotice({ type: 'success', text: 'Saved to the Arc operations database.' });
      setOperations(await getArcAdminDashboard(walletAddress));
      return true;
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Operation failed.' });
      return false;
    } finally { setSubmitting(false); }
  };

  useEffect(() => {
    refreshAgents();
  }, [refreshAgents]);

  const handleConnectAdminWallet = async () => {
    setWalletConnecting(true);
    setNotice(null);
    try {
      const account = await connectWallet();
      setWalletAddress(account.address);
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Could not connect an EVM wallet.' });
    } finally {
      setWalletConnecting(false);
    }
  };

  const copyWallet = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!walletAddress) {
      setNotice({ type: 'error', text: 'Connect an authorized admin wallet first.' });
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      const created = await createArcPlatformAgent({ walletAddress, agent: form });
      setForm(emptyForm);
      const mcpResult = created.mcp
        ? ` MCP connection test passed: ${created.mcp.toolCount} tools found${
            created.mcp.skippedCount ? `, ${created.mcp.skippedCount} excluded by safety checks` : ''
          }.`
        : '';
      setNotice({
        type: 'success',
        text: `₦${created.tag} created as private draft.${mcpResult} Review its capabilities before publishing.`,
      });
      await refreshAgents();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Could not create this agent.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAgentTransition = async (agent, action) => {
    if (!walletAddress) return;
    if (
      action === 'retire' &&
      !window.confirm(`Retire ₦${agent.tag}? Its identity will remain permanently reserved.`)
    ) {
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      const result = await transitionArcAgent({ walletAddress, tag: agent.tag, action });
      setNotice({
        type: 'success',
        text:
          action === 'test_mcp'
            ? `MCP server for ₦${agent.tag} is ${result.connectionStatus}. ${result.toolCount} tools verified.`
            : `₦${agent.tag} is now ${result.status}.`,
      });
      await refreshAgents();
    } catch (error) {
      setNotice({ type: 'error', text: error.message || `Could not ${action} this agent.` });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnableMcpTool = async (agent, tool) => {
    if (!walletAddress) return;
    setSubmitting(true);
    setNotice(null);
    try {
      await enableArcMcpTool({ walletAddress, tag: agent.tag, toolKey: tool.key });
      setNotice({ type: 'success', text: `${tool.name} is now enabled as a read-only chat capability.` });
      await refreshAgents();
      // Update inspecting agent state if modal open
      if (inspectingAgent?.tag === agent.tag) {
        setInspectingAgent((prev) => ({
          ...prev,
          tools: prev.tools.map((t) => (t.key === tool.key ? { ...t, availability: 'enabled' } : t)),
        }));
      }
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Could not enable this capability.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const totalAgents = agents.length;
  const enabledToolCount = agents.reduce((total, a) => total + (a.callableTools?.length || 0), 0);
  const mcpCount = agents.filter((a) => a.entityType === 'mcp_server').length;
  const onchainCount = agents.filter((a) => a.identity?.verifiedOnchain).length;

  // Filtered agents
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch =
        !searchQuery.trim() ||
        agent.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (agent.description || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === 'active') return agent.status === 'active' || agent.status === 'chat_only';
      if (activeFilter === 'draft') return agent.status === 'draft' || agent.status === 'validated';
      if (activeFilter === 'mcp') return agent.entityType === 'mcp_server';
      return true;
    });
  }, [agents, searchQuery, activeFilter]);

  // Deterministic preview color for new tag input
  const previewColors = ['#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6', '#06B6D4'];
  const previewColor = useMemo(() => {
    if (!form.tag) return '#10B981';
    let hash = 0;
    for (let i = 0; i < form.tag.length; i++) hash += form.tag.charCodeAt(i);
    return previewColors[hash % previewColors.length];
  }, [form.tag]);

  return (
    <div className="admin-fintech-layout">
      {/* ───────────────── LEFT SIDEBAR ───────────────── */}
      <aside className="admin-fintech-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-brand-cluster">
            <div className="admin-brand-symbol">
              <span>₦</span>
            </div>
            <div className="admin-brand-copy">
              <strong>NairaTag Admin</strong>
              <span>Arc Sovereign Layer</span>
            </div>
          </div>
        </div>

        <div className="admin-sidebar-search">
          <Search size={14} className="admin-search-icon" />
          <input
            type="text"
            placeholder="Search registry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <kbd className="admin-search-kbd">⌘K</kbd>
        </div>

        <div className="admin-sidebar-nav">
          <div className="admin-nav-group-title">MAIN MENU</div>
          <button
            type="button"
            className={`admin-nav-item ${activeNav === 'registry' ? 'active' : ''}`}
            onClick={() => setActiveNav('registry')}
          >
            <LayoutGrid size={17} />
            <span>Dashboard</span>
            <span className="admin-nav-badge">{totalAgents}</span>
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeNav === 'mcp' ? 'active' : ''}`}
            onClick={() => {
              setActiveNav('mcp');
              setActiveFilter('mcp');
            }}
          >
            <Cpu size={17} />
            <span>MCP Integrations</span>
            {mcpCount > 0 && <span className="admin-nav-badge">{mcpCount}</span>}
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeNav === 'capabilities' ? 'active' : ''}`}
            onClick={() => setActiveNav('capabilities')}
          >
            <Layers size={17} />
            <span>Capabilities & Tools</span>
            <span className="admin-nav-badge">{enabledToolCount}</span>
          </button>

          <div className="admin-nav-group-title">GROWTH OPERATIONS</div>
          {[
            ['tasks', 'Tasks & Reviews', operations?.tasks?.length || 0],
            ['vouchers', 'Vouchers', operations?.vouchers?.length || 0],
            ['referrals', 'Referrals', operations?.referrals?.length || 0],
            ['rewards', 'Points Ledger', operations?.rewards?.length || 0],
          ].map(([key, label, count]) => (
            <button key={key} type="button" className={`admin-nav-item ${activeNav === key ? 'active' : ''}`} onClick={() => setActiveNav(key)}>
              <Layers size={17} /><span>{label}</span>{count > 0 && <span className="admin-nav-badge">{count}</span>}
            </button>
          ))}

          <div className="admin-nav-group-title">GENERAL</div>
          <a href="/" className="admin-nav-item exit-link">
            <ExternalLink size={17} />
            <span>Exit to Consumer App</span>
          </a>
        </div>

        {/* Network & Wallet Widget */}
        <div className="admin-sidebar-footer-card">
          <div className="admin-footer-status">
            <span className="admin-pulse-dot" />
            <div>
              <strong>Arc Mainnet · 5042</strong>
              <span>{walletAddress ? 'Admin data loaded on demand' : 'Connect an authorized admin wallet'}</span>
            </div>
          </div>
          {walletAddress ? (
            <div className="admin-wallet-pill-box">
              <span className="admin-wallet-address">
                {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
              </span>
              <button
                type="button"
                className="admin-mini-icon-btn"
                onClick={copyWallet}
                title="Copy Address"
              >
                {copiedAddress ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="admin-connect-btn"
              onClick={handleConnectAdminWallet}
              disabled={walletConnecting}
            >
              <Wallet size={14} />
              <span>{walletConnecting ? 'Connecting…' : 'Connect Admin Wallet'}</span>
            </button>
          )}
        </div>
      </aside>

      {/* ───────────────── MAIN DASHBOARD CONTENT ───────────────── */}
      <div className="admin-fintech-body">
        {/* Top Header Bar */}
        <header className="admin-topbar">
          <div className="admin-breadcrumbs">
            <span>NairaTag</span>
            <ChevronRight size={14} />
            <span>Platform Administration</span>
            <ChevronRight size={14} />
            <strong>{activeNav === 'tasks' ? 'Tasks & Reviews' : activeNav === 'vouchers' ? 'Voucher Operations' : activeNav === 'referrals' ? 'Referral Monitor' : activeNav === 'rewards' ? 'Protocol Points Ledger' : 'Agent Registry & MCP Control Plane'}</strong>
          </div>

          <div className="admin-topbar-actions">
            <button
              type="button"
              className="admin-header-btn"
              onClick={refreshAgents}
              title="Refresh Registry"
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="admin-header-btn"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {walletAddress ? (
              <div className="admin-verified-badge">
                <CheckCircle2 size={15} color="#10B981" />
                <span>{operations ? 'Admin Authorized' : 'Wallet Connected'}</span>
              </div>
            ) : (
              <button
                type="button"
                className="admin-cta-connect"
                onClick={handleConnectAdminWallet}
                disabled={walletConnecting}
              >
                <Wallet size={15} />
                <span>Connect Admin Wallet</span>
              </button>
            )}
          </div>
        </header>

        <main className="admin-main-canvas">
          {/* Header Title Section */}
          <div className="admin-page-hero">
            <div>
              <h1>{activeNav === 'tasks' ? 'Tasks & Reviews' : activeNav === 'vouchers' ? 'Voucher Operations' : activeNav === 'referrals' ? 'Referral Monitor' : activeNav === 'rewards' ? 'Protocol Points Ledger' : 'Overview'}</h1>
              <p>{activeNav === 'tasks' ? 'Create Arc tasks, review signed submissions, and grant the configured points reward.' : activeNav === 'vouchers' ? 'Manage voucher task offers and review completion claims.' : activeNav === 'referrals' ? 'Monitor referral signups, payment milestones, and points from the Arc ledger.' : activeNav === 'rewards' ? 'Review the points event ledger and grant auditable Protocol Points.' : 'Manage agent identities, MCP integrations, and their published chat capabilities.'}</p>
            </div>
            <div className="admin-hero-actions">
              {['registry', 'mcp', 'capabilities'].includes(activeNav) && <a href="#register" className="admin-btn-accent">
                <Plus size={16} />
                <span>Register Agent / MCP</span>
              </a>}
            </div>
          </div>

          {/* Notice Alert if present */}
          {notice && (
            <div className={`admin-alert-banner ${notice.type}`}>
              {notice.type === 'success' ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span>{notice.text}</span>
              <button type="button" onClick={() => setNotice(null)}>
                <X size={15} />
              </button>
            </div>
          )}

          {/* 4 Stat Cards Row (Exact Match to OripioFin reference) */}
          <section className="admin-stats-deck">
            {/* Hero Emerald Card (Reference "My balance") */}
            <div className="admin-stat-card hero-emerald">
              <div className="admin-stat-top">
                <div className="admin-stat-icon-wrap emerald">
                  <Bot size={20} />
                </div>
                <div className="admin-stat-label-wrap">
                  <strong>Registered Agents</strong>
                  <small>Active & Discoverable</small>
                </div>
              </div>
              <div className="admin-stat-value-row">
                <span className="admin-stat-number">{loading ? '…' : totalAgents}</span>
                  <span className="admin-stat-trend-pill">{agents.filter((agent) => ['active', 'chat_only'].includes(agent.status)).length} published</span>
              </div>
              <div className="admin-stat-footer-link">
                <span>View public directory</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Card 2: Enabled Capabilities */}
            <div className="admin-stat-card">
              <div className="admin-stat-top">
                <div className="admin-stat-icon-wrap blue">
                  <Layers size={20} />
                </div>
                <div className="admin-stat-label-wrap">
                  <strong>Enabled Capabilities</strong>
                  <small>Currently callable</small>
                </div>
              </div>
              <div className="admin-stat-value-row">
                <span className="admin-stat-number">{loading ? '…' : enabledToolCount}</span>
                  <span className="admin-stat-badge safe">Live</span>
              </div>
              <div className="admin-stat-footer-link sub">
                <span>Inspect schemas & inputs</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Card 3: MCP Runtime Engine */}
            <div className="admin-stat-card">
              <div className="admin-stat-top">
                <div className="admin-stat-icon-wrap purple">
                  <Cpu size={20} />
                </div>
                <div className="admin-stat-label-wrap">
                  <strong>MCP Runtime</strong>
                  <small>Streamable HTTP & Auth</small>
                </div>
              </div>
              <div className="admin-stat-value-row">
                <span className="admin-stat-number">{mcpCount}</span>
                  <span className="admin-stat-badge purple">{agents.filter((a) => a.entityType === 'mcp_server' && a.health?.status === 'healthy').length} healthy</span>
              </div>
              <div className="admin-stat-footer-link sub">
                <span>SSRF & DNS pinned</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Card 4: Onchain ERC-8004 */}
            <div className="admin-stat-card">
              <div className="admin-stat-top">
                <div className="admin-stat-icon-wrap amber">
                  <ShieldCheck size={20} />
                </div>
                <div className="admin-stat-label-wrap">
                  <strong>ERC-8004 Onchain</strong>
                  <small>Verified agent identities</small>
                </div>
              </div>
              <div className="admin-stat-value-row">
                <span className="admin-stat-number">{onchainCount}</span>
                  <span className="admin-stat-badge amber">Onchain</span>
              </div>
              <div className="admin-stat-footer-link sub">
                <span>Sovereign Identity Layer</span>
                <ArrowRight size={14} />
              </div>
            </div>
          </section>

          {operationsError && <div className="admin-alert-banner error"><AlertCircle size={18} /><span>{operationsError}</span></div>}

          {activeNav === 'tasks' && (
            <section className="admin-card-container" style={{ marginBottom: 20 }}>
              <div className="admin-card-header"><div><h2>Tasks & submissions</h2><p>Task definitions and wallet submissions are stored in Supabase. USDC escrow and payout are not connected.</p></div></div>
              {!walletAddress ? <p className="admin-modal-subtext">Connect an authorized wallet to load or change operational records.</p> : <>
                <form className="admin-form-body" onSubmit={(event) => { event.preventDefault(); runOperation('save_task', { task: taskForm }).then((saved) => { if (saved) setTaskForm({ title: '', description: '', category: 'community', categoryLabel: 'Community', deliverable: '', rewardUSDC: 0, points: 100, deadline: '' }); }); }}>
                  <h3>Create a task</h3>
                  <div className="admin-form-row two-col"><div className="admin-input-group"><label>Task title</label><input required minLength={4} value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} /></div><div className="admin-input-group"><label>Category</label><input value={taskForm.category} onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value, categoryLabel: e.target.value })} /></div></div>
                  <div className="admin-input-group"><label>Description</label><textarea rows={2} value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} /></div>
                  <div className="admin-form-row two-col"><div className="admin-input-group"><label>Deliverable instructions</label><input value={taskForm.deliverable} onChange={(e) => setTaskForm({ ...taskForm, deliverable: e.target.value })} /></div><div className="admin-input-group"><label>Deadline label</label><input value={taskForm.deadline} onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })} /></div></div>
                  <div className="admin-form-row two-col"><div className="admin-input-group"><label>USDC reward (informational until escrow exists)</label><input type="number" min="0" step="0.01" value={taskForm.rewardUSDC} onChange={(e) => setTaskForm({ ...taskForm, rewardUSDC: e.target.value })} /></div><div className="admin-input-group"><label>Protocol Points on approval</label><input type="number" min="0" step="1" value={taskForm.points} onChange={(e) => setTaskForm({ ...taskForm, points: e.target.value })} /></div></div>
                  <button className="admin-btn-primary" disabled={submitting}>Create task</button>
                </form>
                <div className="admin-table-responsive"><table className="admin-data-table"><thead><tr><th>Task</th><th>Status</th><th>Submissions</th><th>Reward</th><th>Manage</th></tr></thead><tbody>
                  {(operations?.tasks || []).map((task) => { const rows = (operations?.progress || []).filter((entry) => entry.task_id === task.id); return <React.Fragment key={task.id}><tr><td><strong>{task.title}</strong><br /><small>{task.category_label} · {task.id}</small></td><td>{task.status}</td><td>{rows.length}</td><td>{Number(task.reward_usdc)} USDC · {task.points} pts</td><td><button className="admin-action-btn secondary" disabled={submitting} onClick={() => runOperation('save_task', { task: { ...task, categoryLabel: task.category_label, rewardUSDC: task.reward_usdc, deadline: task.deadline_label, status: task.status === 'open' ? 'closed' : 'open' } })}>{task.status === 'open' ? 'Close' : 'Reopen'}</button></td></tr>
                    {rows.filter((entry) => entry.status === 'submitted').map((entry) => <tr key={`${task.id}:${entry.wallet_address}`}><td colSpan="2">Submission · {entry.wallet_address.slice(0, 8)}…{entry.wallet_address.slice(-4)}<br /><small>{entry.deliverable_submission}</small></td><td>Pending review</td><td colSpan="2"><button className="admin-action-btn primary" disabled={submitting} onClick={() => runOperation('review_task', { taskId: task.id, userWallet: entry.wallet_address, status: 'approved' })}>Approve</button> <button className="admin-action-btn danger" disabled={submitting} onClick={() => runOperation('review_task', { taskId: task.id, userWallet: entry.wallet_address, status: 'rejected' })}>Reject</button></td></tr>)}</React.Fragment>; })}
                </tbody></table></div>
              </>}
            </section>
          )}

          {activeNav === 'vouchers' && (
            <section className="admin-card-container" style={{ marginBottom: 20 }}>
              <div className="admin-card-header"><div><h2>Voucher tasks & claims</h2><p>Offers, signed submissions, review decisions, and Protocol Points credits are recorded. Physical airtime/data fulfillment requires a provider integration.</p></div></div>
              {!walletAddress ? <p className="admin-modal-subtext">Connect an authorized wallet to load or change operational records.</p> : <>
                <form className="admin-form-body" onSubmit={(event) => { event.preventDefault(); runOperation('save_voucher', { voucher: voucherForm }).then((saved) => { if (saved) setVoucherForm({ title: '', description: '', category: 'community', points: 25, actionUrl: '' }); }); }}>
                  <h3>Create a voucher task</h3>
                  <div className="admin-form-row two-col"><div className="admin-input-group"><label>Offer name</label><input required minLength={4} value={voucherForm.title} onChange={(e) => setVoucherForm({ ...voucherForm, title: e.target.value })} /></div><div className="admin-input-group"><label>Category</label><input value={voucherForm.category} onChange={(e) => setVoucherForm({ ...voucherForm, category: e.target.value })} /></div></div>
                  <div className="admin-input-group"><label>Description</label><textarea value={voucherForm.description} onChange={(e) => setVoucherForm({ ...voucherForm, description: e.target.value })} /></div>
                  <div className="admin-form-row two-col"><div className="admin-input-group"><label>Protocol Points after approval</label><input type="number" min="0" value={voucherForm.points} onChange={(e) => setVoucherForm({ ...voucherForm, points: e.target.value })} /></div><div className="admin-input-group"><label>Task / redemption link</label><input type="url" value={voucherForm.actionUrl} onChange={(e) => setVoucherForm({ ...voucherForm, actionUrl: e.target.value })} /></div></div>
                  <button className="admin-btn-primary" disabled={submitting}>Create voucher task</button>
                </form>
                <div className="admin-table-responsive"><table className="admin-data-table"><thead><tr><th>Voucher task</th><th>Status</th><th>Points</th><th>Claims</th><th>Manage</th></tr></thead><tbody>{(operations?.vouchers || []).map((voucher) => <tr key={voucher.id}><td><strong>{voucher.title}</strong><br /><small>{voucher.id}</small></td><td>{voucher.status}</td><td>{voucher.points}</td><td>{(operations?.claims || []).filter((claim) => claim.voucher_id === voucher.id).length}</td><td><button className="admin-action-btn secondary" disabled={submitting} onClick={() => runOperation('save_voucher', { voucher: { id: voucher.id, title: voucher.title, description: voucher.description, category: voucher.category, points: voucher.points, actionUrl: voucher.action_url, status: voucher.status === 'active' ? 'paused' : 'active' } })}>{voucher.status === 'active' ? 'Pause' : 'Activate'}</button></td></tr>)}</tbody></table></div>
                <div className="admin-table-responsive"><table className="admin-data-table"><thead><tr><th>Wallet</th><th>Task</th><th>Proof</th><th>Status</th><th>Review</th></tr></thead><tbody>{(operations?.claims || []).map((claim) => <tr key={claim.id}><td>{claim.wallet_address.slice(0, 8)}…{claim.wallet_address.slice(-4)}</td><td>{operations?.vouchers?.find((item) => item.id === claim.voucher_id)?.title || claim.voucher_id}</td><td>{claim.proof}</td><td>{claim.status}</td><td>{claim.status === 'pending' && <><button className="admin-action-btn primary" disabled={submitting} onClick={() => runOperation('review_voucher', { claimId: claim.id, status: 'approved' })}>Approve</button> <button className="admin-action-btn danger" disabled={submitting} onClick={() => runOperation('review_voucher', { claimId: claim.id, status: 'rejected' })}>Reject</button></>}</td></tr>)}</tbody></table></div>
              </>}
            </section>
          )}

          {activeNav === 'referrals' && (
            <section className="admin-card-container table-card" style={{ marginBottom: 20 }}>
              <div className="admin-table-title-group"><h2>Referral monitor</h2><p>Live records from the Arc referral ledger, including signup and first-payment milestones.</p></div>
              {operationsError ? <div className="admin-table-error">{operationsError}</div> : <div className="admin-table-responsive"><table className="admin-data-table"><thead><tr><th>Referrer</th><th>New user</th><th>Signup points</th><th>First payment</th><th>Payment points</th><th>Joined</th></tr></thead><tbody>{(operations?.referrals || []).map((referral) => <tr key={referral.referred_wallet}><td>{referral.referrer_tag} · {referral.referrer_wallet.slice(0, 8)}…</td><td>{referral.referred_tag} · {referral.referred_wallet.slice(0, 8)}…</td><td>{referral.signup_points}</td><td>{referral.first_payment_hash ? `${referral.first_payment_hash.slice(0, 12)}…` : 'Not yet'}</td><td>{referral.payment_points}</td><td>{new Date(referral.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>}
            </section>
          )}

          {activeNav === 'rewards' && (
            <section className="admin-card-container table-card" style={{ marginBottom: 20 }}>
              <div className="admin-table-title-group"><h2>Protocol Points ledger</h2><p>Auditable reward events from daily streaks, referrals, payments, and approved voucher claims.</p></div>
              {walletAddress && <form className="admin-form-body" onSubmit={(event) => { event.preventDefault(); const requestId = `grant-${Date.now()}`; runOperation('grant_points', { ...rewardForm, points: Number(rewardForm.points), requestId }).then((saved) => { if (saved) setRewardForm({ userWallet: '', points: 100, reason: '' }); }); }}>
                <h3>Grant a reward</h3><div className="admin-form-row two-col"><div className="admin-input-group"><label>User wallet</label><input required pattern="0x[a-fA-F0-9]{40}" value={rewardForm.userWallet} onChange={(e) => setRewardForm({ ...rewardForm, userWallet: e.target.value })} /></div><div className="admin-input-group"><label>Protocol Points</label><input type="number" min="1" max="100000" required value={rewardForm.points} onChange={(e) => setRewardForm({ ...rewardForm, points: e.target.value })} /></div></div><div className="admin-input-group"><label>Reason</label><input required minLength={4} value={rewardForm.reason} onChange={(e) => setRewardForm({ ...rewardForm, reason: e.target.value })} /></div><button className="admin-btn-primary" disabled={submitting}>Grant points</button>
              </form>}
              <div className="admin-table-responsive"><table className="admin-data-table"><thead><tr><th>Wallet</th><th>Event</th><th>Points</th><th>Reference</th><th>Date</th></tr></thead><tbody>{(operations?.rewards || []).map((reward) => <tr key={`${reward.wallet_address}:${reward.idempotency_key}`}><td>{reward.wallet_address.slice(0, 8)}…{reward.wallet_address.slice(-4)}</td><td>{reward.event_type}</td><td>{reward.points}</td><td>{reward.idempotency_key}</td><td>{new Date(reward.created_at).toLocaleString()}</td></tr>)}</tbody></table></div>
            </section>
          )}

          {/* ───────────────── MID SECTION: CREATION FORM & PREVIEW (Two Columns) ───────────────── */}
          <section className="admin-mid-grid" id="register" style={{ display: ['registry', 'mcp', 'capabilities'].includes(activeNav) ? undefined : 'none' }}>
            {/* Left Card: Create Agent or MCP Server (Styled like "My Wallet" card) */}
            <div className="admin-card-container">
              <div className="admin-card-header">
                <div>
                  <h2>Register Platform Agent or MCP Server</h2>
                  <p>Assigns a canonical NairaTag and publishes capabilities to the shared router.</p>
                </div>
                {/* Segmented Tab Toggle */}
                <div className="admin-type-tabs">
                  <button
                    type="button"
                    className={`admin-type-tab ${form.entityType === 'autonomous_agent' ? 'active' : ''}`}
                    onClick={() => setForm((prev) => ({ ...prev, entityType: 'autonomous_agent' }))}
                  >
                    <Bot size={14} />
                    <span>Autonomous Agent</span>
                  </button>
                  <button
                    type="button"
                    className={`admin-type-tab ${form.entityType === 'mcp_server' ? 'active' : ''}`}
                    onClick={() => setForm((prev) => ({ ...prev, entityType: 'mcp_server' }))}
                  >
                    <Cpu size={14} />
                    <span>MCP Server</span>
                  </button>
                </div>
              </div>

              <form className="admin-form-body" onSubmit={handleSubmit}>
                <div className="admin-form-row two-col">
                  <div className="admin-input-group">
                    <label>Canonical Agent Tag</label>
                    <div className="admin-tag-input-wrap">
                      <span className="admin-tag-prefix">₦</span>
                      <input
                        required
                        minLength={2}
                        maxLength={32}
                        pattern="[A-Za-z0-9_]{2,32}"
                        value={form.tag}
                        placeholder="chowdeck"
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            tag: e.target.value.replace(/[^A-Za-z0-9_]/g, '').toLowerCase(),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="admin-input-group">
                    <label>Display Name</label>
                    <input
                      required
                      maxLength={80}
                      value={form.displayName}
                      placeholder="Chowdeck Food Bot"
                      onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="admin-form-row two-col">
                  <div className="admin-input-group">
                    <label>Category</label>
                    <input
                      required
                      maxLength={64}
                      value={form.category}
                      placeholder="Food commerce, Developer tools, etc."
                      onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    />
                  </div>

                  <div className="admin-input-group">
                    <label>Voice Aliases (Comma separated)</label>
                    <input
                      value={form.aliases}
                      placeholder="NairaTag Chowdeck, Chowdeck agent"
                      onChange={(e) => setForm((prev) => ({ ...prev, aliases: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="admin-input-group">
                  <label>Description & Mission</label>
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={form.description}
                    placeholder="Clear description of the agent's verified purpose and operations..."
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                {/* MCP Server Specific Fields */}
                {form.entityType === 'mcp_server' && (
                  <div className="admin-mcp-fields-box">
                    <div className="admin-mcp-box-header">
                      <Server size={16} />
                      <strong>Streamable HTTP Connector</strong>
                      <span className="admin-status-pill green">SSRF Pinned</span>
                    </div>

                    <div className="admin-input-group">
                      <label>MCP Streamable HTTP Endpoint (HTTPS strictly required)</label>
                      <input
                        required
                        type="url"
                        value={form.mcpEndpoint}
                        placeholder="https://mcp.yourdomain.com/v1"
                        onChange={(e) => setForm((prev) => ({ ...prev, mcpEndpoint: e.target.value }))}
                      />
                    </div>

                    <div className="admin-form-row two-col">
                      <div className="admin-input-group">
                        <label>Authentication Scheme</label>
                        <select
                          value={form.mcpAuthType}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              mcpAuthType: e.target.value,
                              mcpAuthSecret: '',
                            }))
                          }
                        >
                          <option value="none">Public / No Credential</option>
                          <option value="bearer">Bearer Token (Authorization Header)</option>
                          <option value="api_key">API Key (Custom Header)</option>
                        </select>
                      </div>

                      {form.mcpAuthType === 'api_key' && (
                        <div className="admin-input-group">
                          <label>Header Name (x-…)</label>
                          <input
                            required
                            pattern="x-[A-Za-z0-9-]{1,60}"
                            value={form.mcpAuthHeader}
                            placeholder="x-api-key"
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, mcpAuthHeader: e.target.value }))
                            }
                          />
                        </div>
                      )}
                    </div>

                    {form.mcpAuthType !== 'none' && (
                      <div className="admin-input-group">
                        <label>Secret Key / Token (Encrypted with AES-256 GCM)</label>
                        <div className="admin-password-wrap">
                          <input
                            required
                            type={showSecret ? 'text' : 'password'}
                            autoComplete="new-password"
                            maxLength={4096}
                            value={form.mcpAuthSecret}
                            placeholder="sk_live_..."
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, mcpAuthSecret: e.target.value }))
                            }
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecret(!showSecret)}
                            className="admin-pw-toggle"
                          >
                            {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="admin-form-footer">
                  <div className="admin-form-footnote">
                    {!walletAddress ? (
                      <span className="admin-warning-text">
                        <AlertCircle size={14} /> Connect admin wallet to sign and provision.
                      </span>
                    ) : (
                      <span>Identity will be created in private draft status until validated.</span>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="admin-btn-primary"
                    disabled={submitting || !walletAddress}
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Provisioning…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        <span>Sign & Create Agent</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Live Identity Preview & System Telemetry (Styled like "Cash Flow" card) */}
            <div className="admin-card-container">
              <div className="admin-card-header">
                <div>
                  <h2>Live Identity & Capability Matrix</h2>
                  <p>Real-time preview and system-wide verification status.</p>
                </div>
              </div>

              <div className="admin-preview-cluster">
                {/* Visual Identity Card Card */}
                <div className="admin-identity-card-mockup" style={{ borderColor: previewColor }}>
                  <div className="admin-card-mockup-top">
                    <span className="admin-mockup-naira">₦</span>
                    <span className="admin-mockup-net">Arc Network</span>
                  </div>

                  <div className="admin-mockup-avatar-wrap">
                    <div
                      className="admin-mockup-avatar-circle"
                      style={{ background: previewColor }}
                    >
                      <span>{form.tag ? form.tag.slice(0, 2).toUpperCase() : '₦T'}</span>
                    </div>
                  </div>

                  <div className="admin-mockup-bottom">
                    <strong>₦{form.tag || 'yourtag'}</strong>
                    <span>{form.displayName || 'Agent Display Name'}</span>
                  </div>
                </div>

                {/* System Telemetry Badges */}
                <div className="admin-telemetry-panel">
                  <div className="admin-telemetry-row">
                    <div className="admin-telemetry-icon-box">
                      <ShieldCheck size={16} color="#10B981" />
                    </div>
                    <div className="admin-telemetry-text">
                      <strong>SSRF Defense & Pinned DNS</strong>
                      <span>Private and loopback IP addresses strictly rejected.</span>
                    </div>
                    <span className="admin-status-pill green">Active</span>
                  </div>

                  <div className="admin-telemetry-row">
                    <div className="admin-telemetry-icon-box">
                      <Lock size={16} color="#3B82F6" />
                    </div>
                    <div className="admin-telemetry-text">
                      <strong>AES-256 GCM Credential Vault</strong>
                      <span>All secrets encrypted at rest via ARC_MCP_ENCRYPTION_KEY.</span>
                    </div>
                    <span className="admin-status-pill blue">Secured</span>
                  </div>

                  <div className="admin-telemetry-row">
                    <div className="admin-telemetry-icon-box">
                      <Radio size={16} color="#8B5CF6" />
                    </div>
                    <div className="admin-telemetry-text">
                      <strong>Published agent discovery</strong>
                      <span>Active agents appear in directory search and can be called by tag in chat.</span>
                    </div>
                    <span className="admin-status-pill purple">Directory</span>
                  </div>

                  <div className="admin-telemetry-row">
                    <div className="admin-telemetry-icon-box">
                      <Zap size={16} color="#F59E0B" />
                    </div>
                    <div className="admin-telemetry-text">
                      <strong>Agent validation gate</strong>
                      <span>Publishing requires a configured runtime and at least one supported executor.</span>
                    </div>
                    <span className="admin-status-pill amber">Enforced</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ───────────────── BOTTOM FULL-WIDTH: AGENT REGISTRY TABLE ───────────────── */}
          <section className="admin-card-container table-card" style={{ display: ['registry', 'mcp', 'capabilities'].includes(activeNav) ? undefined : 'none' }}>
            <div className="admin-table-toolbar">
              <div className="admin-table-title-group">
                <h2>Registered Agent Identities</h2>
                <p>All platform and MCP agents published on the Arc Sovereign Layer.</p>
              </div>

              {/* Filter Pills */}
              <div className="admin-filter-pills">
                <button
                  type="button"
                  className={`admin-filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('all')}
                >
                  All ({totalAgents})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill ${activeFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('active')}
                >
                  Active ({agents.filter((a) => a.status === 'active' || a.status === 'chat_only').length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill ${activeFilter === 'draft' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('draft')}
                >
                  Drafts ({agents.filter((a) => a.status === 'draft' || a.status === 'validated').length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill ${activeFilter === 'mcp' ? 'active' : ''}`}
                  onClick={() => setActiveFilter('mcp')}
                >
                  MCP Servers ({mcpCount})
                </button>
              </div>
            </div>

            {directoryError ? (
              <div className="admin-table-error">
                <AlertCircle size={20} />
                <span>{directoryError}</span>
              </div>
            ) : (
              <div className="admin-table-responsive">
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Agent Identity</th>
                      <th>Category & Type</th>
                      <th>Capabilities</th>
                      <th>Status & Health</th>
                      <th>Invocation</th>
                      <th className="text-right">Lifecycle Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgents.map((agent) => {
                      const enabledCount = agent.callableTools?.length || 0;
                      const isMcp = agent.entityType === 'mcp_server';
                      const isHealthy = !isMcp || agent.health?.status === 'healthy';

                      return (
                        <tr key={agent.tag}>
                          {/* Identity Column */}
                          <td>
                            <div className="admin-cell-identity">
                              <img
                                src={
                                  agent.avatar ||
                                  `https://api.dicebear.com/7.x/identicon/svg?seed=${agent.tag}`
                                }
                                alt=""
                                className="admin-agent-avatar"
                              />
                              <div className="admin-agent-identity-text">
                                <div className="admin-name-row">
                                  <strong>{agent.name}</strong>
                                  {agent.identity?.verifiedOnchain && (
                                    <span className="admin-onchain-badge">ERC-8004</span>
                                  )}
                                </div>
                                <span className="admin-tag-badge">₦{agent.tag}</span>
                              </div>
                            </div>
                          </td>

                          {/* Category & Type Column */}
                          <td>
                            <div className="admin-category-stack">
                              <span className="admin-category-pill">{agent.category}</span>
                              <span className={`admin-type-label ${agent.entityType}`}>
                                {agent.entityType?.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </td>

                          {/* Capabilities Column */}
                          <td>
                            <div className="admin-caps-cell">
                              <span className="admin-caps-count">
                                <strong>{enabledCount}</strong> of {agent.tools?.length || 0} tools enabled
                              </span>
                              {agent.tools?.length > 0 && (
                                <button
                                  type="button"
                                  className="admin-link-btn"
                                  onClick={() => setInspectingAgent(agent)}
                                >
                                  Inspect Capabilities ({agent.tools.length})
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Status & Health Column */}
                          <td>
                            <div className="admin-status-stack">
                              <span className={`admin-lifecycle-pill ${agent.status}`}>
                                <span className="admin-status-dot" />
                                {agent.status}
                              </span>
                              {isMcp && (
                                <span
                                  className={`admin-mcp-health-badge ${
                                    agent.health?.status || 'untested'
                                  }`}
                                >
                                  MCP: {agent.health?.status || 'untested'}
                                </span>
                              )}
                              {agent.mcpError && (
                                <small className="admin-error-subtext">{agent.mcpError}</small>
                              )}
                            </div>
                          </td>

                          {/* Invocation Mode Column */}
                          <td>
                            <div className="admin-modes-cluster">
                              <span className="admin-mode-pill">Text</span>
                              <span className="admin-mode-pill">Voice</span>
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="text-right">
                            <div className="admin-action-btn-group">
                              {walletAddress ? (
                                <>
                                  {isMcp && agent.status !== 'retired' && (
                                    <button
                                      type="button"
                                      className="admin-action-btn secondary"
                                      disabled={submitting}
                                      onClick={() => handleAgentTransition(agent, 'test_mcp')}
                                      title="Test streamable HTTP connectivity"
                                    >
                                      Test MCP
                                    </button>
                                  )}

                                  {agent.status === 'draft' && (
                                    <button
                                      type="button"
                                      className="admin-action-btn primary"
                                      disabled={submitting}
                                      onClick={() => handleAgentTransition(agent, 'validate')}
                                    >
                                      Validate
                                    </button>
                                  )}

                                  {agent.status === 'validated' && (
                                    <button
                                      type="button"
                                      className="admin-action-btn publish"
                                      disabled={submitting}
                                      onClick={() => handleAgentTransition(agent, 'publish')}
                                    >
                                      Publish
                                    </button>
                                  )}

                                  {['active', 'chat_only'].includes(agent.status) && (
                                    <button
                                      type="button"
                                      className="admin-action-btn secondary"
                                      disabled={submitting}
                                      onClick={() => handleAgentTransition(agent, 'suspend')}
                                    >
                                      Suspend
                                    </button>
                                  )}

                                  {agent.status === 'paused' && (
                                    <button
                                      type="button"
                                      className="admin-action-btn secondary"
                                      disabled={submitting}
                                      onClick={() => handleAgentTransition(agent, 'reactivate')}
                                    >
                                      Reactivate
                                    </button>
                                  )}

                                  {agent.status !== 'retired' && (
                                    <button
                                      type="button"
                                      className="admin-action-btn danger"
                                      disabled={submitting}
                                      onClick={() => handleAgentTransition(agent, 'retire')}
                                    >
                                      Retire
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="admin-action-btn connect"
                                  onClick={handleConnectAdminWallet}
                                >
                                  Connect to Manage
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {!loading && filteredAgents.length === 0 && (
                  <div className="admin-empty-state">
                    <Bot size={36} />
                    <h3>No matching agents found</h3>
                    <p>Try adjusting your search terms or filter criteria.</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ───────────────── CAPABILITIES INSPECTION MODAL ───────────────── */}
      {inspectingAgent && (
        <div className="admin-modal-backdrop" onClick={() => setInspectingAgent(null)}>
          <div
            className="admin-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-modal-topbar">
              <div className="admin-modal-heading">
                <span className="admin-tag-badge">₦{inspectingAgent.tag}</span>
                <h2>{inspectingAgent.name} Capabilities</h2>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setInspectingAgent(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              <p className="admin-modal-subtext">
                Registered tool specifications, risk classifications, and schema definitions.
              </p>

              <div className="admin-modal-tools-list">
                {inspectingAgent.tools?.map((tool) => (
                  <div className="admin-tool-card" key={tool.key}>
                    <div className="admin-tool-card-header">
                      <div>
                        <strong>{tool.name}</strong>
                        <code>{tool.key}</code>
                      </div>
                      <div className="admin-tool-badges">
                        <span className={`admin-risk-badge ${tool.risk}`}>{tool.risk}</span>
                        <span className={`admin-avail-badge ${tool.availability}`}>
                          {tool.availability}
                        </span>
                      </div>
                    </div>

                    <p className="admin-tool-desc">{tool.description}</p>

                    {/* Enable button for planned MCP tools */}
                    {walletAddress &&
                      tool.availability === 'planned' &&
                      tool.risk === 'read_only' &&
                      inspectingAgent.status === 'draft' && (
                        <div className="admin-enable-banner">
                          <span>This read-only capability has been verified safe to execute.</span>
                          <button
                            type="button"
                            className="admin-btn-primary small"
                            disabled={submitting}
                            onClick={() => handleEnableMcpTool(inspectingAgent, tool)}
                          >
                            Review & Enable
                          </button>
                        </div>
                      )}

                    {tool.availabilityReason && (
                      <div className="admin-tool-reason">
                        <Info size={14} />
                        <span>{tool.availabilityReason}</span>
                      </div>
                    )}

                    {/* JSON Schema Viewer */}
                    <details className="admin-tool-schema-details">
                      <summary>
                        <span>Input Schema Specification</span>
                        <ChevronDown size={14} />
                      </summary>
                      <pre>{JSON.stringify(tool.inputSchema, null, 2)}</pre>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
