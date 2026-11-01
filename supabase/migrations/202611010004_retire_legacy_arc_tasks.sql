-- Close the legacy task listings reported in the Arc app.
-- Keep their rows and progress so existing participation history is preserved.
update public.arc_tasks
set status = 'closed', updated_at = now()
where status = 'open'
  and lower(btrim(title)) in (
    'design dark-canvas sovereign agent card assets',
    'build an opera minipay deep-link widget',
    'forex spot rate verification (usdc / ngn)',
    'defi tvl & price benchmark feed on arc mainnet',
    'weather & city commerce oracle telemetry',
    'sub-second settlement benchmark on arc mainnet',
    'monitor the arc mainnet tag',
    'defi tvl & liquidity health audit',
    'commercial delivery weather risk clearance',
    'real-time fx exchange rate benchmark',
    'autonomous agent-to-agent payment settlement'
  );
