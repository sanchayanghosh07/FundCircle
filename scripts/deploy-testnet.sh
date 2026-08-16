#!/usr/bin/env bash
set -euo pipefail

echo "========================================================="
echo " FundCircle — Stellar Testnet Deployment & Wiring Tool"
echo " Using Stellar CLI $(stellar --version | head -n 1)"
echo "========================================================="

NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
IDENTITY="fundcircle-admin"

echo ""
echo "[Step 1/7] Building Optimized Soroban WASM Artifacts..."
stellar contract build

REGISTRY_WASM="target/wasm32v1-none/release/fundcircle_campaign_registry.wasm"
ESCROW_WASM="target/wasm32v1-none/release/fundcircle_funding_escrow.wasm"

if [[ ! -f "$REGISTRY_WASM" || ! -f "$ESCROW_WASM" ]]; then
  echo "❌ Error: WASM binaries not found after build."
  exit 1
fi
echo "✅ Contracts compiled successfully."

echo ""
echo "[Step 2/7] Initializing Stellar Testnet Identity..."
if ! stellar keys address "$IDENTITY" >/dev/null 2>&1; then
  echo "Generating new identity: $IDENTITY..."
  stellar keys generate "$IDENTITY" --network "$NETWORK"
fi
ADMIN_ADDR=$(stellar keys address "$IDENTITY")
echo "Identity '$IDENTITY' address: $ADMIN_ADDR"

echo ""
echo "[Step 3/7] Funding Identity via Friendbot..."
stellar keys fund "$IDENTITY" --network "$NETWORK" || true
echo "✅ Account funded on Testnet."

echo ""
echo "[Step 4/7] Deploying Smart Contracts to Stellar Testnet..."
echo "Deploying Campaign Registry Contract..."
REGISTRY_ID=$(stellar contract deploy \
  --wasm "$REGISTRY_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "✅ Campaign Registry Contract ID: $REGISTRY_ID"

echo "Deploying Funding Escrow Contract..."
ESCROW_ID=$(stellar contract deploy \
  --wasm "$ESCROW_WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK")
echo "✅ Funding Escrow Contract ID:    $ESCROW_ID"

echo ""
echo "[Step 5/7] Initializing Contracts on Ledger..."
echo "-> Initializing Campaign Registry with admin: $ADMIN_ADDR"
stellar contract invoke \
  --id "$REGISTRY_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$ADMIN_ADDR"

echo "-> Initializing Funding Escrow with admin and registry contract"
stellar contract invoke \
  --id "$ESCROW_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize \
  --admin "$ADMIN_ADDR" \
  --registry_contract "$REGISTRY_ID"

echo ""
echo "[Step 6/7] Wiring Escrow Address into Campaign Registry..."
stellar contract invoke \
  --id "$REGISTRY_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- set_escrow \
  --escrow "$ESCROW_ID"
echo "✅ Inter-contract communication wired."

echo ""
echo "[Step 7/7] Persisting Contract IDs to Application Configuration..."
cat << ENV_EOF > .env.local
# FundCircle Stellar Testnet Deployed Configuration
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_RPC_URL=$RPC_URL
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=$NETWORK_PASSPHRASE
NEXT_PUBLIC_REGISTRY_CONTRACT_ID=$REGISTRY_ID
NEXT_PUBLIC_ESCROW_CONTRACT_ID=$ESCROW_ID
NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
ENV_EOF

echo "✅ Saved configuration to .env.local"
echo ""
echo "========================================================="
echo " 🎉 FundCircle Protocol Deployed Successfully to Testnet!"
echo "========================================================="
echo "Campaign Registry Contract: $REGISTRY_ID"
echo "Funding Escrow Contract:    $ESCROW_ID"
echo ""
echo "Explorer Links:"
echo "Registry: https://stellar.expert/explorer/testnet/contract/$REGISTRY_ID"
echo "Escrow:   https://stellar.expert/explorer/testnet/contract/$ESCROW_ID"
echo "========================================================="
