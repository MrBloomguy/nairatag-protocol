const fs = require('fs');
const vm = require('vm');

function fixPipelineAndBorders(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  console.log(`Fixing pipeline and neutral timeline borders in: ${filePath}`);

  // 1. Remove all green accents from timeline borders
  content = content.replace(/\.thread-card\.is-bounty\s*\{[\s\S]*?\}/g, `.thread-card.is-bounty {
      border: none !important;
      border-bottom: 1px solid var(--line) !important;
      background: var(--bg-card) !important;
    }`);

  content = content.replace(/\.thread-card\.is-bounty:hover\s*\{[\s\S]*?\}/g, `.thread-card.is-bounty:hover {
      background: rgba(0, 0, 0, 0.012) !important;
      border-bottom-color: var(--line) !important;
    }
    [data-theme="dark"] .thread-card.is-bounty:hover {
      background: rgba(255, 255, 255, 0.02) !important;
    }`);

  content = content.replace(
    /\.bounty-reward-box\s*\{[\s\S]*?border-radius:[^;]*;[\s\S]*?margin-bottom:[^;]*;/g,
    `.bounty-reward-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      padding: 10px 14px;
      background: var(--bg-surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      margin-bottom: 12px;`
  );

  content = content.replace(
    /background:\s*rgba\(16,185,129,0\.08\);\s*border:\s*1px solid rgba\(16,185,129,0\.22\);/g,
    'background: var(--bg-surface); border: 1px solid var(--line);'
  );

  // 2. Fix renderTaskPipelineWidget & openReviewProposalsModal definition
  const completeWidgetAndProposals = `
    function renderTaskPipelineWidget(b) {
      let progressPct = 25;
      let step1Cls = 'completed';
      let step1Icon = '✓';
      let step2Cls = '';
      let step2Icon = '2';
      let step3Cls = '';
      let step3Icon = '3';
      let step4Cls = '';
      let step4Icon = '4';

      if (b.status === 'in_progress') {
        progressPct = 50;
        step2Cls = 'active';
        step2Icon = '⚡';
      } else if (b.status === 'submitted') {
        progressPct = 75;
        step2Cls = 'completed';
        step2Icon = '✓';
        step3Cls = 'active';
        step3Icon = '📦';
      } else if (b.status === 'completed') {
        progressPct = 100;
        step2Cls = 'completed';
        step2Icon = '✓';
        step3Cls = 'completed';
        step3Icon = '✓';
        step4Cls = 'completed';
        step4Icon = '💰';
      }

      const hasDeliverable = b.deliverableData && b.deliverableData.link;

      let deliverableHtml = '';
      if (hasDeliverable) {
        deliverableHtml = \`
          <div class="deliverable-proof-box">
            <div style="font-size:10.5px; font-weight:800; text-transform:uppercase; color:var(--ink-muted); margin-bottom:3px;">
              📦 Submitted Deliverable Proof
            </div>
            <div>
              <a href="\${escapeHtml(b.deliverableData.link)}" target="_blank" rel="noopener">\${escapeHtml(b.deliverableData.link)} ↗</a>
            </div>
            \${b.deliverableData.notes ? \`<div style="font-size:11px; color:var(--ink-muted); margin-top:3px;">\${escapeHtml(b.deliverableData.notes)}</div>\` : ''}
          </div>
        \`;
      }

      return \`
        <div class="task-pipeline-widget">
          <div class="task-pipeline-header">
            <div class="task-pipeline-assignee">
              <div style="width:20px; height:20px; border-radius:50%; overflow:hidden; border:1px solid var(--line);">
                <img src="\${getAgentAvatarUrl(b.assignee || b.creatorTag)}" style="width:100%;height:100%;object-fit:cover;" alt="Assignee">
              </div>
              <span>\${b.assignee ? 'Worker: ' + formatAgentHandle(b.assignee) : 'Awaiting Assignment'}</span>
            </div>
            <span style="font-size:11px; font-weight:700; color:\${b.status === 'completed' ? '#10b981' : (b.status === 'submitted' ? '#f59e0b' : 'var(--primary)')};">
              \${b.status === 'completed' ? '✓ Settled Onchain' : (b.status === 'submitted' ? '📦 Work in Review' : (b.status === 'in_progress' ? '⚡ Work in Progress' : '🔒 Escrow Locked'))}
            </span>
          </div>

          <div class="pipeline-progress-track">
            <div class="pipeline-progress-bar" style="width:\${progressPct}%;"></div>
          </div>

          <div class="task-pipeline-stepper">
            <div class="pipeline-step \${step1Cls}">
              <div class="pipeline-step-dot">\${step1Icon}</div>
              <span>Escrow Locked</span>
            </div>
            <div class="pipeline-step \${step2Cls}">
              <div class="pipeline-step-dot">\${step2Icon}</div>
              <span>In Progress</span>
            </div>
            <div class="pipeline-step \${step3Cls}">
              <div class="pipeline-step-dot">\${step3Icon}</div>
              <span>Work Review</span>
            </div>
            <div class="pipeline-step \${step4Cls}">
              <div class="pipeline-step-dot">\${step4Icon}</div>
              <span>Settled</span>
            </div>
          </div>

          \${deliverableHtml}
        </div>
      \`;
    }

    // ─── PROPOSALS REVIEW & ACCEPT / DECLINE ───
    function openReviewProposalsModal(taskId) {
      const b = ACTIVITIES_BOUNTIES.find(item => item.id === taskId);
      if (!b) return;

      const proposals = b.proposals || [];
      const body = document.getElementById('bounty-modal-body');

      body.innerHTML = \`
        <div style="font-size:12px; font-weight:800; text-transform:uppercase; color:var(--primary); margin-bottom:2px;">
          Review Proposals (\${proposals.length})
        </div>
        <h3 style="font-size:17px; font-weight:800; color:var(--ink); margin-bottom:12px;">
          \${escapeHtml(b.title)}
        </h3>

        <div style="background:var(--bg-surface); padding:10px 12px; border-radius:10px; border:1px solid var(--line); margin-bottom:12px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span style="color:var(--ink-muted);">Escrow Reward:</span>
            <strong style="color:#10b981; font-size:14px; margin-left:4px;">\${b.rewardDisplay} cNGN</strong>
          </div>
          <div>
            <span class="bcr-status-badge status-\${b.status}">\${b.statusLabel || b.status}</span>
          </div>
        </div>

        \${proposals.length === 0 ? \`
          <div style="text-align:center; padding:32px 14px; color:var(--ink-muted); background:var(--bg-surface); border-radius:10px; border:1px solid var(--line);">
            <div style="font-size:26px; margin-bottom:6px;">👥</div>
            <div style="font-weight:700; color:var(--ink); font-size:13px;">No applications yet</div>
            <div style="font-size:11.5px; margin-top:2px;">Be the first sovereign worker to pitch for this task!</div>
            <button type="button" class="btn-create-bounty" style="margin-top:12px;" onclick="openApplyBountyModal('\${b.id}')">Apply for Task →</button>
          </div>
        \` : \`
          <div class="proposals-stack">
            \${proposals.map(p => {
              const isAccepted = p.status === 'accepted';
              const isDeclined = p.status === 'declined';
              return \`
                <div class="proposal-card \${isAccepted ? 'accepted-card' : ''}" id="prop-card-\${p.id}">
                  <div class="proposal-header">
                    <div class="proposal-applicant">
                      <div style="width:26px; height:26px; border-radius:50%; overflow:hidden; border:1px solid var(--line);">
                        <img src="\${getAgentAvatarUrl(p.applicantTag)}" style="width:100%;height:100%;object-fit:cover;" alt="\${p.applicantTag}">
                      </div>
                      <div>
                        <div style="font-size:12.5px; font-weight:800; color:var(--ink);">\${formatAgentHandle(p.applicantTag)}</div>
                        <div style="font-size:10.5px; color:var(--ink-muted);">Turnaround: <strong>\${escapeHtml(p.timeframe)}</strong> · \${p.appliedAt || 'Recent'}</div>
                      </div>
                    </div>
                    <div class="proposal-meta-chips">
                      <strong style="color:#059669; font-size:12.5px;">₦\${Number(p.bid).toLocaleString()} cNGN</strong>
                      \${isAccepted ? \`<span style="background:rgba(16,185,129,0.12); color:#059669; padding:2px 8px; border-radius:999px; font-size:10.5px; font-weight:700;">✓ Accepted</span>\` : ''}
                      \${isDeclined ? \`<span style="background:rgba(239,68,68,0.1); color:#ef4444; padding:2px 8px; border-radius:999px; font-size:10.5px; font-weight:700;">✕ Declined</span>\` : ''}
                    </div>
                  </div>

                  <div class="proposal-pitch">
                    \${escapeHtml(p.pitch)}
                  </div>

                  \${p.proofLink ? \`
                    <div style="font-size:11px; color:var(--primary);">
                      🔗 Portfolio / Proof: <a href="\${escapeHtml(p.proofLink)}" target="_blank" rel="noopener" style="color:var(--primary); text-decoration:underline;">\${escapeHtml(p.proofLink)}</a>
                    </div>
                  \` : ''}

                  \${p.status === 'pending' && b.status === 'open' ? \`
                    <div class="proposal-actions">
                      <button type="button" class="btn-decline-proposal" onclick="declineProposal('\${b.id}', '\${p.id}')">
                        ✕ Decline
                      </button>
                      <button type="button" class="btn-accept-proposal" onclick="acceptProposal('\${b.id}', '\${p.id}')">
                        ✓ Accept Proposal
                      </button>
                    </div>
                  \` : ''}
                </div>
              \`;
            }).join('')}
          </div>
        \`}

        <div style="display:flex; gap:10px; margin-top:14px;">
          <button type="button" class="widget-action-btn" style="flex:1; justify-content:center; padding:10px;" onclick="openBountyDetailModal('\${b.id}')">
            ← Back to Task
          </button>
          \${b.status === 'open' ? \`
            <button type="button" class="btn-create-bounty" style="flex:1; justify-content:center; padding:10px;" onclick="openApplyBountyModal('\${b.id}')">
              + Submit Another Proposal
            </button>
          \` : ''}
        </div>
      \`;

      const overlay = document.getElementById('bounty-modal-overlay');
      if (overlay) overlay.classList.add('open');
    }
  `;

  // Replace from function renderTaskPipelineWidget(b) down to function acceptProposal(taskId, propId)
  const widgetToAcceptRegex = /function renderTaskPipelineWidget\(b\)\s*\{[\s\S]*?(?=function acceptProposal)/;
  if (widgetToAcceptRegex.test(content)) {
    content = content.replace(widgetToAcceptRegex, `${completeWidgetAndProposals}\n\n    `);
    console.log('✓ Restored renderTaskPipelineWidget & openReviewProposalsModal cleanly without txProofHtml');
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

fixPipelineAndBorders('hub/tasks.html');
fixPipelineAndBorders('hub/activities.html');
