# FundCircle — Stellar Testnet Deployment Guide

This guide walks through deploying the **FundCircle Campaign Registry** and **Funding Escrow** Soroban smart contracts to the Stellar Testnet, initializing their state, and wiring the cross-contract trust permissions.

---

## 1. Prerequisites

1. **Rust & WASM Target**:
   ```bash
   rustup target add wasm32-unknown-unknown
   ```
2. **Official Stellar CLI** (`v27+`):
   ```bash
   cargo install --locked stellar-cli --features opt
   ```
3. **Node.js 20+ & npm**:
   ```bash
   npm install --legacy-peer-deps
   ```

---

## 2. Automated Deployment Script

To compile, deploy, initialize, and wire the contracts automatically with a single command:

```bash
./scripts/deploy-testnet.sh
```

The script executes the following stages:
1. Compiles optimized WebAssembly artifacts (`target/wasm32v1-none/release/*.wasm`) using `stellar contract build`.
2. Generates and funds a testnet identity (`fundcircle-admin`) via Friendbot.
3. Deploys `CampaignRegistry` and `FundingEscrow` to the Stellar Testnet.
4. Initializes `CampaignRegistry` with the admin address.
5. Initializes `FundingEscrow` with the admin address and `CampaignRegistry` contract ID.
6. Calls `CampaignRegistry.set_escrow(FundingEscrow_ID)` to wire inter-contract state advancement permissions.
7. Automatically updates `.env.local` with the deployed contract addresses.

---

## 3. Manual Step-by-Step Deployment (Stellar CLI)

If deploying manually via the CLI, follow these official commands:

### Step 3.1: Identity Setup & Funding
```bash
# Generate admin keypair
stellar keys generate fundcircle-admin --network testnet

# Fund keypair with 10,000 test XLM via Friendbot
stellar keys fund fundcircle-admin --network testnet

# Get admin public address
ADMIN_ADDR=$(stellar keys address fundcircle-admin)
```

### Step 3.2: Build Smart Contracts
```bash
stellar contract build
```

### Step 3.3: Deploy Contracts
```bash
# 1. Deploy Campaign Registry
REGISTRY_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/fundcircle_campaign_registry.wasm \
  --source fundcircle-admin \
  --network testnet)

# 2. Deploy Funding Escrow
ESCROW_ID=$(stellar contract deploy \
  --wasm target/wasm32v1-none/release/fundcircle_funding_escrow.wasm \
  --source fundcircle-admin \
  --network testnet)
```

### Step 3.4: Initialize Contracts on Ledger
```bash
# Initialize Campaign Registry
stellar contract invoke \
  --id $REGISTRY_ID \
  --source fundcircle-admin \
  --network testnet \
  -- initialize \
  --admin $ADMIN_ADDR

# Initialize Funding Escrow
stellar contract invoke \
  --id $ESCROW_ID \
  --source fundcircle-admin \
  --network testnet \
  -- initialize \
  --admin $ADMIN_ADDR \
  --registry_contract $REGISTRY_ID

# Wire Escrow to Registry
stellar contract invoke \
  --id $REGISTRY_ID \
  --source fundcircle-admin \
  --network testnet \
  -- set_escrow \
  --escrow $ESCROW_ID
```

---

## 4. Contract Verification & Explorer Links

Once deployed, you can verify contract state, ledgers, and transactions on Stellar Expert:

- **Campaign Registry Explorer**: `https://stellar.expert/explorer/testnet/contract/<REGISTRY_ID>`
- **Funding Escrow Explorer**: `https://stellar.expert/explorer/testnet/contract/<ESCROW_ID>`
- **Native XLM SAC Contract**: `https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
