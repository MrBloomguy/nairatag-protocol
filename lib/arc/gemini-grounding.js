const WEB_SEARCH_CUE = /\b(search(?:\s+(?:the\s+web|online|the\s+internet))?|look\s+up(?:\s+online)?|browse(?:\s+(?:the\s+web|online))?|latest|today|right\s+now|recent\s+(?:news|events|updates)|news|current\s+(?:price|version|status|exchange\s+rate|events)|as\s+of\s+(?:today|now|20\d{2})|exchange\s+rate|weather|live\s+score|stock\s+price)\b/i;
const HIGH_REASONING_CUE = /\b(deep\s+research|analy[sz]e|architecture|compare|trade[- ]?off|step[- ]by[- ]step|debug|review\s+this\s+code|multi[- ]step|plan\s+(?:a|the|my))\b/i;

export function shouldUseWebSearch(prompt) {
  return WEB_SEARCH_CUE.test(String(prompt || ''));
}

export function shouldOfferSpecialistConsult(prompt) {
  const text = String(prompt || '');
  const asksToConsult = /\b(?:ask|consult|delegate|send\s+to|hand\s+off\s+to|use)\b/i.test(text);
  const namesAgentNetwork = /\b(?:agent|agents|specialist|specialists|agent\s+network)\b/i.test(text);
  return asksToConsult && namesAgentNetwork;
}

export function getThinkingLevel(prompt) {
  const text = String(prompt || '');
  return HIGH_REASONING_CUE.test(text) && text.length >= 60 ? 'high' : 'medium';
}

export function createFunctionResponsePart(name, callId, response) {
  return {
    functionResponse: {
      name,
      ...(callId ? { call_id: callId } : {}),
      response,
    },
  };
}

function safeWebSource(chunk) {
  const web = chunk && chunk.web;
  if (!web || !web.uri) return null;
  try {
    const url = new URL(String(web.uri));
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return {
      uri: url.href.slice(0, 1800),
      title: String(web.title || url.hostname).replace(/[\u0000-\u001f]/g, '').slice(0, 120),
    };
  } catch {
    return null;
  }
}

export function formatGroundedReply(text, metadataList = []) {
  let reply = String(text || '').trim();
  const metadataItems = Array.isArray(metadataList) ? metadataList : [metadataList];
  const sources = [];
  const sourceNumbers = new Map();
  const citationMarkers = new Map();
  const finalMetadata = metadataItems.at(-1);

  for (const metadata of metadataItems) {
    const chunks = Array.isArray(metadata && metadata.groundingChunks) ? metadata.groundingChunks : [];
    for (const chunk of chunks) {
      const source = safeWebSource(chunk);
      if (!source || sourceNumbers.has(source.uri) || sources.length >= 8) continue;
      sources.push(source);
      sourceNumbers.set(source.uri, sources.length);
    }
  }

  const finalChunks = Array.isArray(finalMetadata && finalMetadata.groundingChunks) ? finalMetadata.groundingChunks : [];
  const sourceByChunk = finalChunks.map((chunk) => {
    const source = safeWebSource(chunk);
    return source ? sourceNumbers.get(source.uri) || null : null;
  });
  for (const support of finalMetadata && finalMetadata.groundingSupports || []) {
    const endIndex = Number(support && support.segment && support.segment.endIndex);
    if (!Number.isInteger(endIndex) || endIndex < 0 || endIndex > reply.length) continue;
    const numbers = [...new Set((support.groundingChunkIndices || [])
      .map((index) => sourceByChunk[index])
      .filter(Boolean))];
    if (!numbers.length) continue;
    const current = citationMarkers.get(endIndex) || new Set();
    numbers.forEach((number) => current.add(number));
    citationMarkers.set(endIndex, current);
  }

  for (const [endIndex, numbers] of [...citationMarkers.entries()].sort((a, b) => b[0] - a[0])) {
    const marker = ' ' + [...numbers].sort((a, b) => a - b).map((number) => '[' + number + ']').join('');
    reply = reply.slice(0, endIndex) + marker + reply.slice(endIndex);
  }
  if (sources.length) {
    reply += '\n\nSources\n' + sources.map((source, index) =>
      '[' + (index + 1) + '] ' + source.title + ': ' + source.uri
    ).join('\n');
  }
  return reply;
}
