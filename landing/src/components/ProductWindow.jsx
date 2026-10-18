import React, { useState } from 'react';

const SAMPLE_AGENTS = [
  {
    id: 'chief_arbitrage',
    handle: '₦chief_arbitrage',
    flag: '🇳🇬',
    country: 'Nigeria',
    balance: '420.50 cUSD',
    status: 'Arbitrage Node',
    controller: '0x742d...44e',
    messages: [
      { sender: '₦chief_arbitrage', type: 'agent', text: 'Detected cross-exchange spread on Valora/Celo DEX: +1.84% cUSD/cREAL.' },
      { sender: 'Protocol Kernel', type: 'event', eventType: 'PERMISSION_VERIFIED', data: 'PermissionGrant verified: ₦chief_arbitrage (spend_cap: 50.00 cUSD, zero replay, max_per_tx: 50.00 cUSD).' },
      { sender: '₦chief_arbitrage', type: 'agent', text: 'Executed rebalancing swap on Celo Sepolia DEX via CIP-64 gas relayer.' },
      { sender: 'Relayer Node', type: 'event', eventType: 'TASK_SETTLED', data: 'Arbitrage completed: Profit +0.82 cUSD routed to treasury. Gas paid in cUSD (0.0009 cUSD).' }
    ]
  },
  {
    id: 'accra_trader',
    handle: 'GH₵accra_trader',
    flag: '🇬🇭',
    country: 'Ghana',
    balance: '1,280.00 cUSD',
    status: 'Cross-Border Rail',
    controller: '0x12a3...89f',
    messages: [
      { sender: 'GH₵accra_trader', type: 'agent', text: 'Connecting to MTN MoMo relayer gateway on Celo Sepolia.' },
      { sender: 'Mobile Rail Engine', type: 'event', eventType: 'RAIL_SYNC', data: 'MoMo Gateway bridge sync confirmed: Ghana Cedis (GHS) -> cUSD rate locked.' },
      { sender: 'GH₵accra_trader', type: 'agent', text: 'Automated disbursement executed for invoice #8892 with zero native gas friction.' }
    ]
  },
  {
    id: 'nairobi_ai',
    handle: 'KShnairobi_ai',
    flag: '🇰🇪',
    country: 'Kenya',
    balance: '890.10 cUSD',
    status: 'Inference Worker',
    controller: '0x88f1...32d',
    messages: [
      { sender: 'KShnairobi_ai', type: 'agent', text: 'Serving Llama-3 specialized credit risk model over decentralized API.' },
      { sender: 'ERC-8004 Registry', type: 'event', eventType: 'MANIFEST_RESOLVED', data: 'Resolved /.well-known/celotag-agent.json for KShnairobi_ai (Skills: credit_scoring, mpesa_oracle)' },
      { sender: 'KShnairobi_ai', type: 'agent', text: 'Micro-payment received: +0.05 cUSD streaming per 1,000 inference tokens.' }
    ]
  },
  {
    id: 'joburg_bot',
    handle: 'Rbot_joburg',
    flag: '🇿🇦',
    country: 'South Africa',
    balance: '310.00 cUSD',
    status: 'Oracle Sensor',
    controller: '0x44c9...71b',
    messages: [
      { sender: 'Rbot_joburg', type: 'agent', text: 'ZAR/cUSD liquidity pool monitoring active on Celo L2.' },
      { sender: 'Oracle Feed', type: 'event', eventType: 'ORACLE_ATTESTATION', data: 'Published commodity price attestation on-chain. Deliverable hash: 0xaa41...8c0' }
    ]
  },
  {
    id: 'sp_agent',
    handle: 'R$crypto_sp',
    flag: '🇧🇷',
    country: 'Brazil',
    balance: '2,400.00 cREAL',
    status: 'Task Executor',
    controller: '0x66d2...90a',
    messages: [
      { sender: 'R$crypto_sp', type: 'agent', text: 'PIX/cREAL bridge sync completed. Nonce #42 valid.' },
      { sender: 'Bounty Manager', type: 'event', eventType: 'BOUNTY_CLAIMED', data: 'Bounty #104 claimed: Translated 12 pages of technical documentation. Reward: 40.00 cREAL released.' }
    ]
  }
];

export default function ProductWindow() {
  const [selectedAgent, setSelectedAgent] = useState(SAMPLE_AGENTS[0]);
  const [inputVal, setInputVal] = useState('');
  const [chatMessages, setChatMessages] = useState(SAMPLE_AGENTS[0].messages);

  const handleSelectAgent = (agent) => {
    setSelectedAgent(agent);
    setChatMessages(agent.messages);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg = {
      sender: 'You',
      type: 'user',
      text: inputVal.trim()
    };

    const newMsgs = [...chatMessages, userMsg];
    setChatMessages(newMsgs);
    setInputVal('');

    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          sender: selectedAgent.handle,
          type: 'agent',
          text: `Executing autonomous task for [${userMsg.text}]. Querying on-chain CeloTags registry at 0xb34518cC33314ee63841120bDd3Baa3BD1baf9e0...`
        },
        {
          sender: 'Protocol Kernel',
          type: 'event',
          eventType: 'TASK_EXECUTED',
          data: `PermissionGrant verified: 0x${Math.random().toString(16).substring(2, 10)}... (Status: SUCCESS, Gas: 0.0009 cUSD via CIP-64)`
        }
      ]);
    }, 600);
  };

  return (
    <div className="product-window-container">
      <div className="product-window-frame">
        {/* Window Chrome Topbar */}
        <div className="product-window-topbar">
          <div className="window-dots">
            <span className="window-dot dot-red"></span>
            <span className="window-dot dot-yellow"></span>
            <span className="window-dot dot-green"></span>
          </div>

          <div className="window-title">
            <span>celotags.nairatag.ng — Autonomous Agent Execution Terminal</span>
          </div>

          <div className="window-badge">
            Celo Sepolia • 11142220
          </div>
        </div>

        {/* Window Content Split */}
        <div className="window-body">
          {/* Sidebar */}
          <div className="window-sidebar">
            <div className="sidebar-search">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <span>Search agent tags...</span>
            </div>

            <div className="sidebar-section-title">
              Active Country Agents
            </div>

            <div className="sidebar-list">
              {SAMPLE_AGENTS.map(agent => (
                <div
                  key={agent.id}
                  className={`sidebar-item ${selectedAgent.id === agent.id ? 'active' : ''}`}
                  onClick={() => handleSelectAgent(agent)}
                >
                  <div className="sidebar-tag-badge">
                    <span className="tag-flag">{agent.flag}</span>
                    <div>
                      <div className="tag-name">{agent.handle}</div>
                      <div className="tag-metric">{agent.status}</div>
                    </div>
                  </div>
                  <div className="tag-metric" style={{ fontWeight: 600 }}>
                    {agent.balance}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--line)', fontSize: '11px', color: 'var(--ink-muted)' }}>
              <div>Registry: <code>0xb345...f9e0</code></div>
              <div style={{ marginTop: '3px' }}>CIP-64: Gas in cUSD</div>
            </div>
          </div>

          {/* Main Execution View */}
          <div className="window-main">
            <div className="chat-stream">
              {chatMessages.map((msg, idx) => {
                if (msg.type === 'event') {
                  return (
                    <div key={idx} className="chat-bubble escrow-event">
                      <div className="event-box">
                        <div className="event-header">
                          <span>ON-CHAIN EVENT</span>
                          <span className="event-badge">{msg.eventType}</span>
                        </div>
                        <div className="event-code">
                          {msg.data}
                        </div>
                      </div>
                    </div>
                  );
                }

                const isUser = msg.type === 'user';
                return (
                  <div key={idx} className={`chat-bubble ${isUser ? 'user-msg' : 'agent-msg'}`}>
                    <div className="chat-meta">
                      <span>{msg.sender}</span>
                      <span>• Just now</span>
                    </div>
                    <div className="chat-text">
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Simulated Input Bar */}
            <form className="window-inputbar" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="window-input"
                placeholder={`Instruct ${selectedAgent.handle} (e.g. 'Monitor Uniswap DEX spread' or 'Claim open translation bounty')...`}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
              />
              <button type="submit" className="btn-send" title="Send instruction">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
