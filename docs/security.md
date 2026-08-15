# FundCircle — Security Model & Threat Assessment (Level 4)

This document provides a comprehensive security assessment of the FundCircle micro-funding protocol, covering Soroban smart contract custody, authorization boundaries, wallet interfaces, and frontend trust invariants.

---

## 1. Architecture & Protocol Security

FundCircle follows a strict **Zero-Client-Trust** paradigm:
- The Next.js frontend is purely an interface and transaction builder; it has zero privileged access or control over user funds.
- All core business logic, status enforcement, deadlines, arithmetic, and token movements are executed exclusively within Soroban smart contracts on the Stellar ledger.

```text
[User / Contributor] 
       │ (Signs XDR with Keypair in Wallet Extension)
       ▼
[Stellar Consensus Engine]
       │ (Enforces Ed25519 Auth & Resource Quotas)
       ▼
[Funding Escrow Contract] ──(Cross-Contract Call)──> [Campaign Registry Contract]
       │ (State Valid & On-Time)
       ▼
[Stellar Asset Contract (SAC)]
```

---

## 2. Smart Contract Security Review

### 2.1 Authorization & Role Boundaries
- **Admin Isolation**: Only the initialized `admin` address can call `set_escrow`, `approve_campaign`, `reject_campaign`, and `set_admin`.
- **Creator Autonomy**: Only the registered `creator` address can `submit_for_review`, `cancel_campaign` (while in draft/review/active), and `release_funds` upon reaching the funding goal.
- **Contract-to-Contract Authentication**: State progression methods in Campaign Registry (`set_funded`, `set_completed`, `set_refund`) strictly require authorization from the registered Escrow contract address.
- **Direct Auth Validation**: Invocations enforce `caller.require_auth()` via native Soroban cryptographic checks.

### 2.2 Token Custody & Safe Disbursements
- **Non-Custodial Escrow**: Funds are locked inside the Soroban `FundingEscrow` contract instance and can only be transferred out through two deterministic codepaths:
  1. `release_funds`: Disburses 100% of accumulated funds to the verified campaign creator ONLY if `status == Funded`.
  2. `claim_refund`: Disburses deposited tokens back to the individual contributor ONLY if the campaign is `Cancelled` or expired unmet past `deadline`.
- **Reentrancy Protection (Checks-Effects-Interactions)**:
  - `release_funds` marks `DataKey::FundsReleased(campaign_id)` as `true` before initiating external SAC token transfers.
  - `claim_refund` zeroes the contributor's stored balance record (`ContributionRecord.amount = 0`) before initiating the refund transfer, completely eliminating double-refund vulnerabilities.

### 2.3 Safe Arithmetic & Integer Safety
- All balances and token amounts use signed 128-bit integers (`i128`).
- Addition and subtraction operations use checked methods (`checked_add`, `checked_sub`), returning explicit `EscrowError::ArithmeticError` instead of panicking or overflowing.

### 2.4 Storage & State Lifetime (TTL)
- Contracts utilize Soroban **Persistent Storage** for campaigns and user contribution ledgers (`DataKey::Campaign`, `DataKey::Contribution`, `DataKey::Contributors`).
- Invocations automatically trigger `extend_ttl(key, PERSISTENT_LIFETIME_THRESHOLD, PERSISTENT_BUMP_AMOUNT)` (~30 days) to prevent state archiving.

---

## 3. Frontend & Wallet Security

### 3.1 Zero Secret Exposure
- No secret keys, seeds, or sensitive private credentials are ever requested, processed, stored, or bundled in frontend bundles.
- All signing requests are delegated via `@creit.tech/stellar-wallets-kit` to user-controlled wallet extensions (Freighter, xBull, Albedo, Lobstr).

### 3.2 Transaction Preparation & Simulation
- Before requesting user signatures, the DApp simulates the invocation footprint and resource budget against Soroban RPC nodes (`stellarRpc.simulateTransaction`).
- The user is shown clear fee estimates, contract targets, and parameter summaries before signing.

### 3.3 Input Validation & Sanitization
- Form inputs enforce minimum character lengths (Title ≥ 5 chars, Description ≥ 20 chars), positive numeric constraints, and future timestamp checks client-side, matching contract invariants.

---

## 4. Known Limitations & Roadmap Hardening

1. **Testnet Friendbot Faucet**: On testnet, accounts and test XLM are funded via Friendbot. On Mainnet, users must have funded Stellar accounts with reserve requirements (1 XLM base reserve).
2. **Milestone Multi-Stage Disbursements**: Current implementation releases full funding upon goal completion. Future extensions (Level 5) will introduce phased milestone voting where contributors approve tranche releases.
3. **Emergency Pausing**: Administrative overrides are limited to campaign rejection/moderation. Formal circuit-breaker pause mechanisms can be added for protocol-wide maintenance.

---

## 5. Security Audit Checklist

| Item | Status | Verification |
| :--- | :--- | :--- |
| **Strict Authorization (`require_auth`)** | Verified | `test_unauthorized_state_transitions`, `test_unauthorized_fund_release_fails` |
| **Reentrancy & Double Refund Prevention** | Verified | `test_refund_flow_on_expired_unmet_campaign`, `test_fund_release_to_creator` |
| **Checked Arithmetic (`checked_add`)** | Verified | Validated across all token accounting operations |
| **Cross-Contract Registry Checks** | Verified | `test_contribution_flow_and_intercontract_state_advance` |
| **Persistent Storage TTL Bumps** | Verified | Implemented on all persistent storage writes |
| **Client Zero-Trust** | Verified | All state validated on-chain |
