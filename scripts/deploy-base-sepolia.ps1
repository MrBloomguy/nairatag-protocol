$ErrorActionPreference = 'Stop'

$rpcUrl = if ($env:BASE_SEPOLIA_RPC_URL) { $env:BASE_SEPOLIA_RPC_URL } else { 'https://sepolia.base.org' }
$chainId = if ($env:BASE_SEPOLIA_CHAIN_ID) { [int]$env:BASE_SEPOLIA_CHAIN_ID } else { 84532 }
$privateKey = $env:BASE_SEPOLIA_PRIVATE_KEY

if ($chainId -ne 84532) {
    throw "BASE_SEPOLIA_CHAIN_ID must be 84532, received $chainId"
}
if ([string]::IsNullOrWhiteSpace($privateKey)) {
    throw 'Set BASE_SEPOLIA_PRIVATE_KEY in the current shell. The deployer must be funded with Base Sepolia ETH.'
}
if ($privateKey -notmatch '^0x[0-9a-fA-F]{64}$') {
    throw 'BASE_SEPOLIA_PRIVATE_KEY must be a 32-byte hex key in the form 0x followed by 64 hexadecimal characters.'
}

$payload = @{ jsonrpc = '2.0'; id = 1; method = 'eth_chainId'; params = @() } | ConvertTo-Json -Compress
$rpcResult = Invoke-RestMethod -Uri $rpcUrl -Method Post -ContentType 'application/json' -Body $payload
if ([Convert]::ToInt32($rpcResult.result.Substring(2), 16) -ne 84532) {
    throw "RPC $rpcUrl did not report Base Sepolia chain ID 84532"
}

$contractsDir = Resolve-Path (Join-Path $PSScriptRoot '..\contracts')
Push-Location $contractsDir
try {
    forge script script/Deploy.s.sol --rpc-url $rpcUrl --chain-id 84532 --broadcast --private-key $privateKey --non-interactive
    if ($LASTEXITCODE -ne 0) {
        throw "Foundry deployment failed with exit code $LASTEXITCODE. No Base Sepolia deployment is enabled."
    }
} finally {
    Pop-Location
}

Write-Host 'Deployment broadcast completed on Base Sepolia.' -ForegroundColor Green
Write-Host 'Verify contracts and copy registry/resolver/payment addresses into config/base-sepolia.env before enabling agent writes.' -ForegroundColor Yellow
