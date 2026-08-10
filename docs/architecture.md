# FundCircle Architecture & Technical Design

FundCircle is a community-driven micro-funding protocol and decentralized application built natively on the Stellar blockchain with Soroban smart contracts.

## 1. System Architecture

```mermaid
graph TD
    subgraph Client ["Frontend Layer (Next.js 15 App Router)"]
        UI["UI Components (Tailwind CSS + shadcn/ui)"]
        Hooks["Feature Hooks & Query Cache (React Query + Zustand)"]
        TxLifecycle["Transaction Lifecycle Engine"]
        WalletAdapter["Stellar Wallets Kit (Freighter, xBull, Albedo)"]
    end

    subgraph ServiceLayer ["Blockchain Service Layer"]
        RPCClient["Stellar RPC Service"]
        ContractClient["Typed Soroban Contract Client"]
        EventIngestion["On-Chain Event Ingestion Engine"]
    end

    subgraph StellarBlockchain ["Stellar Soroban Network"]
        Registry["Campaign Registry Contract"]
        Escrow["Funding Escrow Contract"]
        SAC["Stellar Asset Contract (XLM / SAC)"]
    end

    UI --> Hooks
    Hooks --> TxLifecycle
    Hooks --> ContractClient
    TxLifecycle --> WalletAdapter
    TxLifecycle --> ContractClient
    ContractClient --> RPCClient
    EventIngestion --> RPCClient
    RPCClient --> Registry
    RPCClient --> Escrow
    RPCClient --> SAC

    Escrow -- "Inter-Contract State Check & Verification" --> Registry
    Escrow -- "Token Custody, Release & Refund" --> SAC
    Escrow -- "Trigger State Progression (Funded/Completed)" --> Registry
```

## 2. Campaign Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft: Creator drafts campaign
    Draft --> Review: Creator submits for review
    Review --> Active: Admin/Reviewer approves
    Review --> Draft: Admin rejects (needs changes)
    Active --> Funded: Target reached via Escrow contributions
    Active --> Cancelled: Creator or Admin cancels
    Active --> Refund: Deadline passed without meeting goal
    Funded --> Completed: Funds disbursed to Creator
    Cancelled --> Refund: Contributors claim refunds
    Refund --> [*]: All refunds processed
    Completed --> [*]: Project executed
```

## 3. Inter-Contract Call Flow: Contribution & Fund Release

```mermaid
sequenceDiagram
    autonumber
    actor Contributor
    actor Creator
    participant FE as FundCircle Frontend
    participant Kit as Stellar Wallets Kit
    participant Escrow as Funding Escrow Contract
    participant Registry as Campaign Registry Contract
    participant Token as Stellar Asset Contract (XLM)

    Note over Contributor, Token: Contribution Flow
    Contributor->>FE: Select Campaign & Amount (e.g. 50 XLM)
    FE->>FE: Simulate Invocation (`contribute`)
    FE->>Kit: Request Contributor Signature
    Kit-->>FE: Signed Transaction Envelope XDR
    FE->>Escrow: Submit `contribute(campaign_id, contributor, amount)`
    
    critical Escrow Execution
        Escrow->>Registry: Cross-Contract Call: `get_campaign(campaign_id)`
        Registry-->>Escrow: Return CampaignData (status, goal, deadline, asset)
        Escrow->>Escrow: Validate: State == Active, Time <= Deadline, Asset matches
        Escrow->>Token: `transfer(contributor, escrow_address, amount)`
        Escrow->>Escrow: Record Contribution & Update Campaign Raised Total
        opt If Total Raised >= Goal
            Escrow->>Registry: Cross-Contract Call: `set_funded(campaign_id)`
        end
        Escrow-->>Escrow: Emit `contributed` Event
    end
    Escrow-->>FE: Transaction Success (TxHash)

    Note over Creator, Token: Fund Release Flow
    Creator->>FE: Request Fund Disbursement
    FE->>Escrow: Submit `release_funds(campaign_id)`
    critical Release Execution
        Escrow->>Registry: Cross-Contract Call: `get_campaign(campaign_id)`
        Registry-->>Escrow: Verify Creator Ownership & State == Funded
        Escrow->>Token: `transfer(escrow_address, creator, total_raised)`
        Escrow->>Registry: Cross-Contract Call: `set_completed(campaign_id)`
        Escrow-->>Escrow: Emit `funds_released` Event
    end
    Escrow-->>FE: Disbursement Confirmed
```

## 4. Contract Storage Strategy

- **Instance Storage**: Contract configurations, administrative authority, linked contract addresses, global counters.
- **Persistent Storage**: Campaign records, contribution ledgers, and creator indexes with periodic TTL extensions to prevent archival.
- **Temporary Storage**: Non-critical transient simulation caches.

## 5. Security & Trust Boundaries

1. **Zero Client Trust**: All authorization checks, time bounds, state transitions, and arithmetic calculations are strictly enforced on-chain.
2. **Reentrancy Protection**: State updates precede external SAC token disbursements.
3. **Integer Safety**: Uses `i128` safe math preventing overflow/underflow.
4. **Secret Protection**: No private keys are ever stored, transmitted, or requested by the application.
