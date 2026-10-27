import { isAddress } from 'viem';
import { getArcAgentTaskTotals } from './arcTasks.js';
import { getArcRewardState } from './arcRewards.js';
import { getAgentDetails } from './erc8004Service.js';
import { PROTOCOL_AGENT_POINTS } from './arcAgents.js';

function numericValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/,/g, '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchArcAgentMetrics(agent) {
  const cleanTag = String(agent.tag || '').replace(/^[₦$@#]/, '').toLowerCase();
  const seedPoints = PROTOCOL_AGENT_POINTS?.[cleanTag] ?? 200;

  let owner = agent.owner || agent.identity?.owner || null;
  if (!isAddress(String(owner || '')) && agent.identity?.verifiedOnchain && agent.identity?.erc8004AgentId) {
    try {
      owner = (await getAgentDetails(agent.identity.erc8004AgentId)).owner;
    } catch (error) {
      console.warn(`[Agent metrics: ${agent.tag}] owner lookup failed:`, error.message);
    }
  }

  if (!isAddress(String(owner || ''))) {
    return {
      owner: null,
      earnings: 0,
      points: seedPoints,
    };
  }

  const [rewardResult, taskResult] = await Promise.allSettled([
    getArcRewardState(owner),
    getArcAgentTaskTotals(owner),
  ]);
  const rewardPoints = rewardResult.status === 'fulfilled' ? numericValue(rewardResult.value.points) : null;
  const taskTotals = taskResult.status === 'fulfilled' ? taskResult.value : null;

  return {
    owner,
    earnings: numericValue(taskTotals?.earnings) ?? 0,
    points: rewardPoints ? Math.max(rewardPoints, seedPoints) : (numericValue(agent.points) ?? seedPoints),
  };
}
