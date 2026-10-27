/**
 * @file api/agent-service.js
 * @description Autonomous Agent Marketplace Endpoint for Arc Network.
 * Serves real-time data for @defillama, @meteo, and @coingecko with x402 payment compliance.
 */

const NIGERIAN_CITIES = {
  lagos: { name: 'Lagos', lat: 6.5244, lon: 3.3792 },
  abuja: { name: 'Abuja', lat: 9.0765, lon: 7.3986 },
  portharcourt: { name: 'Port Harcourt', lat: 4.8156, lon: 7.0498 },
  kano: { name: 'Kano', lat: 12.0022, lon: 8.5920 },
  ibadan: { name: 'Ibadan', lat: 7.3775, lon: 3.9470 }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Payment');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Set standard x402 payment headers for Arc agent economy
  res.setHeader('X-Payment-Address', '0x034F64B644988406DeD382Ebabb5C981bD19684A');
  res.setHeader('X-Payment-Amount', '0.01');
  res.setHeader('X-Payment-Network', 'arcTestnet');
  res.setHeader('X-Payment-Chain-Id', '5042002');
  res.setHeader('X-Payment-Token', '0x3600000000000000000000000000000000000000');

  const action = String(req.query?.action || req.body?.action || '').toLowerCase();

  // If client specifically requests x402 payment challenge or has unpaid premium request
  if (action === 'challenge_402') {
    return res.status(402).json({
      error: 'Payment Required',
      paymentRequired: true,
      protocol: 'x402',
      network: 'arcTestnet',
      chainId: 5042002,
      currency: 'USDC',
      tokenAddress: '0x3600000000000000000000000000000000000000',
      recipient: '0x034F64B644988406DeD382Ebabb5C981bD19684A',
      amount: '0.01'
    });
  }

  try {
    // 1. DefiLlama Oracle (@defillama / ₦DEFILLAMA)
    if (action === 'defillama' || action === 'defillama_tvl') {
      const limit = Math.min(50, Math.max(1, Number(req.query?.limit || 10)));
      const llamaRes = await fetch('https://api.llama.fi/protocols', { headers: { Accept: 'application/json' } });
      if (!llamaRes.ok) throw new Error(`DefiLlama responded with ${llamaRes.status}`);
      const protocols = await llamaRes.json();
      return res.status(200).json({
        ok: true,
        agent: '@defillama',
        canonicalTag: '₦DEFILLAMA',
        provider: 'Circle Marketplace (Free Tier)',
        protocols: protocols.slice(0, limit).map((p) => ({
          name: p.name,
          symbol: p.symbol,
          tvl: p.tvl,
          change1d: p.change_1d,
          change7d: p.change_7d,
          category: p.category,
          chains: p.chains?.slice(0, 5) || []
        }))
      });
    }

    // 2. Open-Meteo Weather (@meteo / ₦METEO)
    if (action === 'meteo' || action === 'meteo_weather') {
      const cityKey = String(req.query?.city || 'lagos').toLowerCase().replace(/[^a-z]/g, '');
      const loc = NIGERIAN_CITIES[cityKey] || NIGERIAN_CITIES.lagos;
      const meteoRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m`,
        { headers: { Accept: 'application/json' } }
      );
      if (!meteoRes.ok) throw new Error(`Open-Meteo responded with ${meteoRes.status}`);
      const meteoData = await meteoRes.json();
      const precip = meteoData.current?.precipitation || 0;
      const temp = meteoData.current?.temperature_2m || 25;
      const wind = meteoData.current?.wind_speed_10m || 0;

      let riskLevel = 'LOW';
      let advisory = 'Normal road and delivery conditions.';
      let etaDelayMinutes = 0;

      if (precip > 5 || meteoData.current?.weather_code >= 65) {
        riskLevel = 'HIGH';
        advisory = 'Heavy rain / potential flash flooding. Rider speed reduced, packaging waterproofing recommended.';
        etaDelayMinutes = 35;
      } else if (precip > 1 || meteoData.current?.weather_code >= 61) {
        riskLevel = 'MODERATE';
        advisory = 'Light to moderate rain. Slow-moving traffic expected in commercial transit corridors.';
        etaDelayMinutes = 15;
      }

      return res.status(200).json({
        ok: true,
        agent: '@meteo',
        canonicalTag: '₦METEO',
        city: loc.name,
        riskLevel,
        precipitationMm: precip,
        temperatureC: temp,
        windSpeedKmH: wind,
        etaDelayMinutes,
        advisory,
        timestamp: new Date().toISOString()
      });
    }

    // 3. CoinGecko FX Benchmark (@coingecko / ₦COINGECKO)
    if (action === 'coingecko' || action === 'coingecko_fx') {
      const geckoRes = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,celo&vs_currencies=usd,ngn&include_24hr_change=true',
        { headers: { Accept: 'application/json' } }
      );
      if (!geckoRes.ok) throw new Error(`CoinGecko responded with ${geckoRes.status}`);
      const prices = await geckoRes.json();
      const usdc = prices['usd-coin'] || {};
      return res.status(200).json({
        ok: true,
        agent: '@coingecko',
        canonicalTag: '₦COINGECKO',
        rateNgnPerUsdc: usdc.ngn || 1350.0,
        rateUsdPerUsdc: usdc.usd || 1.0,
        change24hNgn: usdc.ngn_24h_change || 0,
        updatedAt: new Date().toISOString()
      });
    }

    // Default manifest / discovery endpoint
    return res.status(200).json({
      ok: true,
      service: 'NairaTag Arc Agent Service Network',
      marketplaceAgents: [
        { tag: 'defillama', canonicalTag: '₦DEFILLAMA', action: 'defillama_tvl', pricing: 'Free' },
        { tag: 'meteo', canonicalTag: '₦METEO', action: 'meteo_weather', pricing: 'Free' },
        { tag: 'coingecko', canonicalTag: '₦COINGECKO', action: 'coingecko_fx', pricing: 'Free' }
      ],
      x402: {
        supported: true,
        network: 'arcTestnet',
        chainId: 5042002,
        currency: 'USDC',
        tokenAddress: '0x3600000000000000000000000000000000000000'
      }
    });
  } catch (error) {
    console.error('[Agent Service Error]', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
