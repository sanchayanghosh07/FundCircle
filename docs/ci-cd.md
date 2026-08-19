# FundCircle — CI/CD Pipeline & Deployment Specifications

This document defines the continuous integration, testing, quality gates, and automated deployment processes for FundCircle on the Stellar network.

---

## 1. Pipeline Overview

FundCircle uses GitHub Actions for automated verification and deployment:

```mermaid
graph TD
    subgraph PullRequest ["Pull Request Quality Gate"]
        PR[PR Opened / Updated] --> CheckRust[Rust & Cargo Test Suite]
        PR --> CheckWasm[WASM Build & Optimization]
        PR --> CheckTypes[TypeScript Strict Typecheck]
        PR --> CheckVitest[Frontend & Integration Vitest Tests]
        PR --> CheckNext[Next.js 15 Production Build]
    end

    subgraph MainDeployment ["Main Branch Release Pipeline"]
        PushMain[Push to main] --> FullVerify[Full Build & Verification Matrix]
        FullVerify --> DeployTestnet[Soroban Testnet Contract Deployment]
        DeployTestnet --> DeployHosting[Frontend Hosting (Vercel / Cloudflare Pages)]
    end
```

---

## 2. Workflows Implemented

1. **Pull Request Quality Gate ([`.github/workflows/pr-validation.yml`](../.github/workflows/pr-validation.yml))**:
   - Runs on every pull request against `main`.
   - Compiles and tests Rust contracts (`cargo test --all`).
   - Builds optimized WASM binaries (`stellar contract build`).
   - Runs strict TypeScript validation (`npm run typecheck`).
   - Runs all 37 Vitest component, store, and integration tests (`npm test`).
   - Executes Next.js 15 production build.
2. **Production Release Pipeline ([`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml))**:
   - Runs on merge to `main`.
   - Verifies bytecode artifact hashes and builds release assets.

---

## 3. Required Environment Variables & Secrets

### 3.1 Public Environment Variables (Repository / Client)
These variables are public and bundled into the client build:

| Variable Name | Required | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_STELLAR_NETWORK` | Yes | `testnet` | Stellar network mode (`testnet` / `mainnet`) |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | Yes | `https://soroban-testnet.stellar.org` | Soroban JSON-RPC node endpoint |
| `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | Yes | `Test SDF Network ; September 2015` | Network passphrase for transaction signing |
| `NEXT_PUBLIC_REGISTRY_CONTRACT_ID` | Yes | `CBZCR2...` | Deployed Campaign Registry Contract ID |
| `NEXT_PUBLIC_ESCROW_CONTRACT_ID` | Yes | `CAYCR2...` | Deployed Funding Escrow Contract ID |
| `NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID` | Yes | `CDLZFC...` | XLM Stellar Asset Contract (SAC) ID |

### 3.2 Sensitive GitHub Secrets (CI/CD Deployment Only)
These secrets **MUST NEVER** be committed to Git. Configure them under **GitHub Repository Settings → Secrets and variables → Actions**:

| Secret Name | Purpose | Scope |
| :--- | :--- | :--- |
| `STELLAR_ADMIN_SECRET` | Secret key (`S...`) used by `scripts/deploy-testnet.ts` to sign contract deployment transactions | Testnet Deployment |
| `VERCEL_TOKEN` | Token for deploying Next.js frontend to production hosting | Hosting Deployment |
| `VERCEL_ORG_ID` | Vercel Organization ID | Hosting Deployment |
| `VERCEL_PROJECT_ID` | Vercel Project ID | Hosting Deployment |

---

## 4. Local Execution & Sanity Check

```bash
# 1. Run smart contract test suite
cargo test --all

# 2. Build WASM bytecode
stellar contract build

# 3. Run frontend typecheck and tests
npm run typecheck
npm test

# 4. Run production build
npm run build
```
