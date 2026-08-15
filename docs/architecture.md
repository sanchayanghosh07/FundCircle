# FundCircle — Architecture & Technical Specifications (Level 4)

FundCircle is a community-driven micro-funding protocol and application built on the Stellar blockchain with Soroban smart contracts.

---

## 1. System Architecture

```mermaid
graph TD
    subgraph Frontend ["Frontend Layer (Next.js 15 App Router)"]
        UI["UI Components (Tailwind CSS + shadcn/ui)"]
        Hooks["Feature Hooks & Query Cache (React Query + Zustand)"]
        TxLifecycle["Transaction Lifecycle Engine"]
        WalletAdapter["Stellar Wallets Kit 2.6.0 (Freighter, xBull, Albedo)"]
    end

    subgraph ServiceLayer ["Blockchain Service Layer"]
        RPCClient["Stellar RPC Service & Horizon Client"]
        ContractClient["Typed Soroban Contract Client Layer"]
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

    Escrow -- "1. Inter-Contract State & Deadline Check" --> Registry
    Escrow -- "2. Custody, Release & Refund Tokens" --> SAC
    Escrow -- "3. Trigger State Progression (Funded / Completed)" --> Registry
```

---

## 2. Campaign Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft: Creator initiates campaign
    Draft --> Review: Creator submits for review
    Review --> Active: Admin/Reviewer approves
    Review --> Draft: Admin rejects (revisions requested)
    Active --> Funded: Target reached via Escrow pledges
    Active --> Cancelled: Creator or Admin cancels
    Active --> Refund: Deadline passed without meeting goal
    Funded --> Completed: Escrow disburses funds to Creator
    Cancelled --> Refund: Contributors claim refunds
    Refund --> [*]: All refunds processed
    Completed --> [*]: Project delivered
```

---

## 3. Inter-Contract Call Flow: Contribution

```mermaid
sequenceDiagram
    autonumber
    actor Contributor
    participant FE as FundCircle UI
    participant Kit as Stellar Wallets Kit
    participant Escrow as Funding Escrow Contract
    participant Registry as Campaign Registry Contract
    participant Token as Stellar Asset Contract (XLM)

    Contributor->>FE: Select Campaign & Amount (e.g. 50 XLM)
    FE->>FE: Simulate Invocation (`contribute`)
    FE->>Kit: Request Contributor Signature
    Kit-->>FE: Signed Transaction Envelope XDR
    FE->>Escrow: Submit `contribute(campaign_id, contributor, amount)`
    
    critical Escrow On-Chain Verification
        Escrow->>Registry: Cross-Contract Call: `get_campaign(campaign_id)`
        Registry-->>Escrow: Return Campaign Data (status, goal, deadline, asset)
        Escrow->>Escrow: Validate: State == Active, Time <= Deadline, Asset matches
        Escrow->>Token: `transfer(contributor, escrow_address, amount)`
        Escrow->>Escrow: Record Contribution & Update Campaign Total Raised
        opt If Total Raised >= Goal
            Escrow->>Registry: Cross-Contract Call: `set_funded(campaign_id, escrow_address)`
        end
        Escrow-->>Escrow: Emit `contributed` Event
    end
    Escrow-->>FE: Transaction Success (TxHash)
```

---

## 4. Transaction Lifecycle Flow

```mermaid
stateDiagram-v2
    [*] --> Preparing: Assemble call parameters & operation
    Preparing --> Simulating: Soroban RPC simulation & footprint build
    Simulating --> AwaitingSignature: Prompt wallet authorization
    AwaitingSignature --> Submitting: Broadcast signed envelope to RPC
    AwaitingSignature --> Rejected: User rejects in wallet
    Submitting --> Pending: Polling consensus validation
    Pending --> Confirmed: Finalized on ledger (TxHash confirmed)
    Pending --> Failed: Simulation/Contract error
    Rejected --> [*]: Aborted
    Failed --> [*]: Error logged with diagnostics
    Confirmed --> [*]: State updated & receipt issued
```

---

## 5. Repository Structure

```text
FundCircle/
├── contracts/                        # Soroban Rust smart contracts
│   ├── campaign-registry/            # Contract 1: Campaign Registry
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs                # State machine, admin auth, storage
│   │       └── test.rs               # 7 unit tests (100% passing)
│   └── funding-escrow/               # Contract 2: Funding Escrow
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs                # Token custody, cross-contract calls
│           └── test.rs               # 6 integration tests (100% passing)
│
├── src/                              # Next.js 15 TypeScript application
│   ├── app/                          # App Router pages
│   │   ├── page.tsx                  # Landing page
│   │   ├── campaigns/page.tsx        # Campaign discovery & filters
│   │   ├── campaigns/[id]/page.tsx   # Campaign details & funding
│   │   ├── create/page.tsx           # Campaign creation wizard
│   │   ├── activity/page.tsx         # Live activity feed
│   │   ├── transactions/page.tsx     # Transaction center & history
│   │   ├── dashboard/creator/        # Creator dashboard
│   │   ├── dashboard/contributor/    # Contributor dashboard
│   │   ├── analytics/page.tsx        # Protocol analytics
│   │   ├── admin/page.tsx            # Reviewer & moderation queue
│   │   └── settings/page.tsx         # Network & contract settings
│   │
│   ├── features/                     # Domain feature modules
│   │   ├── campaigns/                # Campaign cards, filters, previews
│   │   ├── contributions/            # Contribution dialog & chip presets
│   │   └── transactions/             # Lifecycle modal & step indicators
│   │
│   ├── services/                     # Blockchain & Wallet service layer
│   │   ├── wallet/                   # Stellar Wallets Kit adapter
│   │   └── stellar/                  # RPC, Registry, Escrow & Event services
│   │
│   ├── stores/                       # Zustand state management
│   │   ├── walletStore.ts            # Wallet connection & balance
│   │   ├── transactionStore.ts       # Active tx state & persistent history
│   │   └── activityStore.ts          # Real-time activity cache
│   │
│   ├── components/                   # Reusable UI & Layout components
│   │   ├── ui/                       # Button, Card, Badge, Progress, etc.
│   │   ├── layout/                   # Navbar, NetworkBadge, Footer
│   │   └── providers/                # QueryClient & Toast providers
│   │
│   ├── config/                       # Network constants & contract addresses
│   ├── types/                        # TypeScript domain interfaces
│   └── test/                         # Frontend unit & integration tests
│
├── scripts/                          # Build & Deployment scripts
│   ├── build.sh                      # WASM compilation
│   ├── deploy-testnet.ts             # Testnet deployment & initialization
│   └── interact-testnet.ts           # Flow verification script
│
├── .github/workflows/ci.yml          # GitHub Actions CI/CD pipeline
├── Cargo.toml                        # Rust workspace configuration
├── package.json                      # Next.js dependencies & scripts
└── README.md                         # Production documentation
```

---

## 6. Smart Contract Specifications

### Campaign Registry Contract
- **Storage Keys**:
  - `Admin`: `()` → `Address`
  - `EscrowContract`: `()` → `Address`
  - `CampaignCount`: `()` → `u64`
  - `Campaign(u64)`: `u64` → `Campaign` *(Persistent storage with `extend_ttl`)*
  - `CreatorCampaigns(Address)`: `Address` → `Vec<u64>`
- **Errors**: `AlreadyInitialized`, `NotInitialized`, `Unauthorized`, `CampaignNotFound`, `InvalidStateTransition`, `InvalidGoalAmount`, `InvalidDeadline`, `InvalidMetadata`.
- **Events**: `reg_init`, `set_escr`, `set_adm`, `cmp_creat`, `cmp_sub`, `cmp_appr`, `cmp_rej`, `cmp_canc`, `cmp_stat`.

### Funding Escrow Contract
- **Storage Keys**:
  - `Admin`: `()` → `Address`
  - `RegistryContract`: `()` → `Address`
  - `CampaignTotal(u64)`: `u64` → `i128`
  - `Contribution(u64, Address)`: `(u64, Address)` → `ContributionRecord`
  - `Contributors(u64)`: `u64` → `Vec<Address>`
  - `ContributorCampaigns(Address)`: `Address` → `Vec<u64>`
  - `FundsReleased(u64)`: `u64` → `bool`
- **Errors**: `AlreadyInitialized`, `NotInitialized`, `Unauthorized`, `CampaignNotActive`, `CampaignExpired`, `AssetMismatch`, `InvalidAmount`, `GoalNotReached`, `FundsAlreadyReleased`, `NoContributionToRefund`, `CampaignNotEligibleForRefund`, `ArithmeticError`.
- **Events**: `esc_init`, `set_reg`, `contrib`, `fund_rel`, `refund`.
