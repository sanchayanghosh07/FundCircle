#![no_std]

use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, symbol_short, token,
    Address, Env, String, Vec,
};

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum CampaignStatus {
    Draft = 0,
    Review = 1,
    Active = 2,
    Funded = 3,
    Completed = 4,
    Cancelled = 5,
    Refund = 6,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CampaignMetadata {
    pub title: String,
    pub description: String,
    pub category: String,
    pub image_url: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Campaign {
    pub id: u64,
    pub creator: Address,
    pub metadata: CampaignMetadata,
    pub target_amount: i128,
    pub asset: Address,
    pub deadline: u64,
    pub status: CampaignStatus,
    pub created_at: u64,
}

/// Interface trait for calling the Campaign Registry contract from Escrow
#[contractclient(name = "CampaignRegistryClient")]
pub trait CampaignRegistryInterface {
    fn get_campaign(env: Env, campaign_id: u64) -> Campaign;
    fn set_funded(env: Env, campaign_id: u64, caller: Address);
    fn set_completed(env: Env, campaign_id: u64, caller: Address);
    fn set_refund(env: Env, campaign_id: u64, caller: Address);
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum EscrowError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    CampaignNotActive = 4,
    CampaignExpired = 5,
    AssetMismatch = 6,
    InvalidAmount = 7,
    GoalNotReached = 8,
    FundsAlreadyReleased = 9,
    NoContributionToRefund = 10,
    CampaignNotEligibleForRefund = 11,
    ArithmeticError = 12,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContributionRecord {
    pub amount: i128,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    RegistryContract,
    CampaignTotal(u64),
    Contribution(u64, Address),
    Contributors(u64),
    ContributorCampaigns(Address),
    FundsReleased(u64),
    Initialized,
}

const DAY_IN_LEDGERS: u32 = 17280;
const INSTANCE_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const INSTANCE_LIFETIME_THRESHOLD: u32 = 7 * DAY_IN_LEDGERS;
const PERSISTENT_BUMP_AMOUNT: u32 = 60 * DAY_IN_LEDGERS;
const PERSISTENT_LIFETIME_THRESHOLD: u32 = 14 * DAY_IN_LEDGERS;

#[contract]
pub struct FundingEscrow;

#[contractimpl]
impl FundingEscrow {
    /// Initialize the Escrow contract with Admin authority and Campaign Registry address
    pub fn initialize(
        env: Env,
        admin: Address,
        registry: Address,
    ) -> Result<(), EscrowError> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(EscrowError::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::RegistryContract, &registry);
        env.storage().instance().set(&DataKey::Initialized, &true);

        Self::extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("esc_init"), admin),
            registry,
        );

        Ok(())
    }

    /// Set/update Registry address
    pub fn set_registry(env: Env, registry: Address) -> Result<(), EscrowError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(EscrowError::NotInitialized)?;
        admin.require_auth();

        env.storage()
            .instance()
            .set(&DataKey::RegistryContract, &registry);
        Self::extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("set_reg"), admin),
            registry,
        );

        Ok(())
    }

    /// Contribute funds to an active campaign
    /// Performs genuine inter-contract call to Campaign Registry to validate campaign state, deadline, and asset
    pub fn contribute(
        env: Env,
        campaign_id: u64,
        contributor: Address,
        amount: i128,
    ) -> Result<i128, EscrowError> {
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(EscrowError::NotInitialized);
        }

        contributor.require_auth();

        if amount <= 0 {
            return Err(EscrowError::InvalidAmount);
        }

        let registry_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::RegistryContract)
            .ok_or(EscrowError::NotInitialized)?;

        // Inter-Contract Call: Fetch Campaign details from Registry
        let registry_client = CampaignRegistryClient::new(&env, &registry_address);
        let campaign: Campaign = registry_client.get_campaign(&campaign_id);

        // Validation 1: Status must be Active
        if campaign.status != CampaignStatus::Active {
            return Err(EscrowError::CampaignNotActive);
        }

        // Validation 2: Deadline check
        let current_time = env.ledger().timestamp();
        if current_time > campaign.deadline {
            return Err(EscrowError::CampaignExpired);
        }

        // Transfer tokens from Contributor to Escrow contract using SAC token client
        let token_client = token::Client::new(&env, &campaign.asset);
        token_client.transfer(&contributor, &env.current_contract_address(), &amount);

        // Record individual contribution
        let contrib_key = DataKey::Contribution(campaign_id, contributor.clone());
        let previous_record: Option<ContributionRecord> =
            env.storage().persistent().get(&contrib_key);

        let new_user_total = match previous_record {
            Some(record) => record
                .amount
                .checked_add(amount)
                .ok_or(EscrowError::ArithmeticError)?,
            None => {
                // Add to campaign contributor roster if first contribution
                let roster_key = DataKey::Contributors(campaign_id);
                let mut roster: Vec<Address> = env
                    .storage()
                    .persistent()
                    .get(&roster_key)
                    .unwrap_or_else(|| Vec::new(&env));
                roster.push_back(contributor.clone());
                env.storage().persistent().set(&roster_key, &roster);
                env.storage().persistent().extend_ttl(
                    &roster_key,
                    PERSISTENT_LIFETIME_THRESHOLD,
                    PERSISTENT_BUMP_AMOUNT,
                );

                // Add to contributor's campaign list
                let user_campaigns_key = DataKey::ContributorCampaigns(contributor.clone());
                let mut user_campaigns: Vec<u64> = env
                    .storage()
                    .persistent()
                    .get(&user_campaigns_key)
                    .unwrap_or_else(|| Vec::new(&env));
                user_campaigns.push_back(campaign_id);
                env.storage()
                    .persistent()
                    .set(&user_campaigns_key, &user_campaigns);
                env.storage().persistent().extend_ttl(
                    &user_campaigns_key,
                    PERSISTENT_LIFETIME_THRESHOLD,
                    PERSISTENT_BUMP_AMOUNT,
                );

                amount
            }
        };

        let new_record = ContributionRecord {
            amount: new_user_total,
            timestamp: current_time,
        };
        env.storage().persistent().set(&contrib_key, &new_record);
        env.storage().persistent().extend_ttl(
            &contrib_key,
            PERSISTENT_LIFETIME_THRESHOLD,
            PERSISTENT_BUMP_AMOUNT,
        );

        // Update campaign total raised
        let total_key = DataKey::CampaignTotal(campaign_id);
        let previous_campaign_total: i128 = env
            .storage()
            .persistent()
            .get(&total_key)
            .unwrap_or(0);
        let new_campaign_total = previous_campaign_total
            .checked_add(amount)
            .ok_or(EscrowError::ArithmeticError)?;

        env.storage()
            .persistent()
            .set(&total_key, &new_campaign_total);
        env.storage().persistent().extend_ttl(
            &total_key,
            PERSISTENT_LIFETIME_THRESHOLD,
            PERSISTENT_BUMP_AMOUNT,
        );

        Self::extend_instance_ttl(&env);

        // Inter-Contract Call: If goal is met, advance Registry status to Funded
        if new_campaign_total >= campaign.target_amount {
            registry_client.set_funded(&campaign_id, &env.current_contract_address());
        }

        // Emit on-chain event
        env.events().publish(
            (symbol_short!("contrib"), campaign_id, contributor),
            (amount, new_campaign_total),
        );

        Ok(new_campaign_total)
    }

    /// Release funds to Campaign Creator once goal is reached / campaign is Funded
    pub fn release_funds(
        env: Env,
        campaign_id: u64,
        caller: Address,
    ) -> Result<i128, EscrowError> {
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(EscrowError::NotInitialized);
        }

        caller.require_auth();

        let registry_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::RegistryContract)
            .ok_or(EscrowError::NotInitialized)?;

        let registry_client = CampaignRegistryClient::new(&env, &registry_address);
        let campaign: Campaign = registry_client.get_campaign(&campaign_id);

        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(EscrowError::NotInitialized)?;

        // Authorization: Creator or Admin can trigger disbursement
        let is_creator = caller == campaign.creator;
        let is_admin = caller == admin;
        if !is_creator && !is_admin {
            return Err(EscrowError::Unauthorized);
        }

        // Check release state
        let release_key = DataKey::FundsReleased(campaign_id);
        let already_released: bool = env
            .storage()
            .persistent()
            .get(&release_key)
            .unwrap_or(false);
        if already_released {
            return Err(EscrowError::FundsAlreadyReleased);
        }

        let total_key = DataKey::CampaignTotal(campaign_id);
        let total_raised: i128 = env
            .storage()
            .persistent()
            .get(&total_key)
            .unwrap_or(0);

        // Verify that target goal was met or campaign is Funded
        if campaign.status != CampaignStatus::Funded && total_raised < campaign.target_amount {
            return Err(EscrowError::GoalNotReached);
        }

        if total_raised <= 0 {
            return Err(EscrowError::InvalidAmount);
        }

        // Mark released to prevent re-entrancy / double disbursement
        env.storage().persistent().set(&release_key, &true);
        env.storage().persistent().extend_ttl(
            &release_key,
            PERSISTENT_LIFETIME_THRESHOLD,
            PERSISTENT_BUMP_AMOUNT,
        );

        // Transfer funds from Escrow contract to Campaign Creator
        let token_client = token::Client::new(&env, &campaign.asset);
        token_client.transfer(&env.current_contract_address(), &campaign.creator, &total_raised);

        // Inter-Contract Call: Update Registry status to Completed
        if campaign.status != CampaignStatus::Funded {
            registry_client.set_funded(&campaign_id, &env.current_contract_address());
        }
        registry_client.set_completed(&campaign_id, &env.current_contract_address());

        Self::extend_instance_ttl(&env);

        // Emit on-chain event
        env.events().publish(
            (symbol_short!("fund_rel"), campaign_id, campaign.creator),
            total_raised,
        );

        Ok(total_raised)
    }

    /// Claim refund for a contributor if campaign was cancelled or expired unmet
    pub fn claim_refund(
        env: Env,
        campaign_id: u64,
        contributor: Address,
    ) -> Result<i128, EscrowError> {
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(EscrowError::NotInitialized);
        }

        contributor.require_auth();

        let registry_address: Address = env
            .storage()
            .instance()
            .get(&DataKey::RegistryContract)
            .ok_or(EscrowError::NotInitialized)?;

        let registry_client = CampaignRegistryClient::new(&env, &registry_address);
        let campaign: Campaign = registry_client.get_campaign(&campaign_id);

        let total_key = DataKey::CampaignTotal(campaign_id);
        let total_raised: i128 = env
            .storage()
            .persistent()
            .get(&total_key)
            .unwrap_or(0);

        let current_time = env.ledger().timestamp();
        let is_eligible = match campaign.status {
            CampaignStatus::Cancelled | CampaignStatus::Refund => true,
            CampaignStatus::Active => {
                // If deadline has passed and goal was not reached
                current_time > campaign.deadline && total_raised < campaign.target_amount
            }
            _ => false,
        };

        if !is_eligible {
            return Err(EscrowError::CampaignNotEligibleForRefund);
        }

        let contrib_key = DataKey::Contribution(campaign_id, contributor.clone());
        let record_opt: Option<ContributionRecord> =
            env.storage().persistent().get(&contrib_key);

        let record = record_opt.ok_or(EscrowError::NoContributionToRefund)?;
        if record.amount <= 0 {
            return Err(EscrowError::NoContributionToRefund);
        }

        let refund_amount = record.amount;

        // Zero out user contribution record to prevent double refunds
        let zero_record = ContributionRecord {
            amount: 0,
            timestamp: current_time,
        };
        env.storage().persistent().set(&contrib_key, &zero_record);
        env.storage().persistent().extend_ttl(
            &contrib_key,
            PERSISTENT_LIFETIME_THRESHOLD,
            PERSISTENT_BUMP_AMOUNT,
        );

        // Deduct from campaign total raised
        let new_total = total_raised
            .checked_sub(refund_amount)
            .ok_or(EscrowError::ArithmeticError)?;
        env.storage().persistent().set(&total_key, &new_total);

        // If campaign state is still Active, update Registry to Refund state
        if campaign.status == CampaignStatus::Active || campaign.status == CampaignStatus::Cancelled {
            registry_client.set_refund(&campaign_id, &env.current_contract_address());
        }

        // Transfer refund back to Contributor
        let token_client = token::Client::new(&env, &campaign.asset);
        token_client.transfer(&env.current_contract_address(), &contributor, &refund_amount);

        Self::extend_instance_ttl(&env);

        // Emit on-chain event
        env.events().publish(
            (symbol_short!("refund"), campaign_id, contributor),
            refund_amount,
        );

        Ok(refund_amount)
    }

    // =========================================================================
    // View Functions
    // =========================================================================

    /// Get total funds raised for a campaign
    pub fn get_total_raised(env: Env, campaign_id: u64) -> i128 {
        let key = DataKey::CampaignTotal(campaign_id);
        env.storage().persistent().get(&key).unwrap_or(0)
    }

    /// Get contribution record for a specific user on a campaign
    pub fn get_contribution(
        env: Env,
        campaign_id: u64,
        contributor: Address,
    ) -> Option<ContributionRecord> {
        let key = DataKey::Contribution(campaign_id, contributor);
        env.storage().persistent().get(&key)
    }

    /// Get list of all contributors for a campaign
    pub fn get_contributors(env: Env, campaign_id: u64) -> Vec<Address> {
        let key = DataKey::Contributors(campaign_id);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Get total number of unique contributors for a campaign
    pub fn get_contributor_count(env: Env, campaign_id: u64) -> u32 {
        Self::get_contributors(env, campaign_id).len()
    }

    /// Get campaign IDs backed by a contributor
    pub fn get_contributor_campaigns(env: Env, contributor: Address) -> Vec<u64> {
        let key = DataKey::ContributorCampaigns(contributor);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Check if funds have been released to creator
    pub fn is_funds_released(env: Env, campaign_id: u64) -> bool {
        let key = DataKey::FundsReleased(campaign_id);
        env.storage().persistent().get(&key).unwrap_or(false)
    }

    /// Get linked Registry address
    pub fn get_registry(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::RegistryContract)
    }

    /// Get Admin address
    pub fn get_admin(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::Admin)
    }

    // =========================================================================
    // Internal Helpers
    // =========================================================================

    fn extend_instance_ttl(env: &Env) {
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
    }
}

#[cfg(test)]
mod test;
