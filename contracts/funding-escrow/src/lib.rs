#![no_std]

use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, symbol_short,
    token::Client as TokenClient,
    Address, Env, String, Vec,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[contracttype]
pub enum CampaignStatus {
    Draft = 0,
    Review = 1,
    Active = 2,
    Funded = 3,
    Completed = 4,
    Cancelled = 5,
    Refund = 6,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct CampaignMetadata {
    pub title: String,
    pub description: String,
    pub category: String,
    pub image_url: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
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

#[contractclient(name = "CampaignRegistryClient")]
pub trait CampaignRegistryInterface {
    fn initialize(env: Env, admin: Address);
    fn set_escrow(env: Env, escrow: Address);
    fn create_campaign(
        env: Env,
        creator: Address,
        title: String,
        description: String,
        category: String,
        image_url: String,
        target_amount: i128,
        asset: Address,
        deadline: u64,
    ) -> u64;
    fn submit_for_review(env: Env, campaign_id: u64);
    fn approve_campaign(env: Env, campaign_id: u64);
    fn reject_campaign(env: Env, campaign_id: u64, reason: String);
    fn cancel_campaign(env: Env, campaign_id: u64, caller: Address);
    fn get_campaign(env: Env, campaign_id: u64) -> Campaign;
    fn set_funded(env: Env, campaign_id: u64, caller: Address);
    fn set_completed(env: Env, campaign_id: u64, caller: Address);
    fn set_refund(env: Env, campaign_id: u64, caller: Address);
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct ContributionRecord {
    pub amount: i128,
    pub timestamp: u64,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    RegistryContract,
    CampaignTotal(u64),
    Contribution(u64, Address),
    Contributors(u64),
    ContributorCampaigns(Address),
    FundsReleased(u64),
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

const PERSISTENT_BUMP_AMOUNT: u32 = 518_400; // ~30 days
const PERSISTENT_LIFETIME_THRESHOLD: u32 = 100_000;

#[contract]
pub struct FundingEscrow;

#[contractimpl]
impl FundingEscrow {
    pub fn initialize(env: Env, admin: Address, registry_contract: Address) -> Result<(), EscrowError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(EscrowError::AlreadyInitialized);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::RegistryContract, &registry_contract);

        env.events().publish(
            (symbol_short!("esc_init"), admin),
            registry_contract,
        );

        Ok(())
    }

    pub fn set_registry(env: Env, new_registry: Address) -> Result<(), EscrowError> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(EscrowError::NotInitialized)?;
        admin.require_auth();

        env.storage().instance().set(&DataKey::RegistryContract, &new_registry);
        env.events().publish((symbol_short!("set_reg"), admin), new_registry);

        Ok(())
    }

    pub fn contribute(
        env: Env,
        campaign_id: u64,
        contributor: Address,
        amount: i128,
    ) -> Result<i128, EscrowError> {
        contributor.require_auth();

        if amount <= 0 {
            return Err(EscrowError::InvalidAmount);
        }

        let registry_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::RegistryContract)
            .ok_or(EscrowError::NotInitialized)?;

        // Genuine Cross-Contract Call to Registry
        let registry_client = CampaignRegistryClient::new(&env, &registry_addr);
        let campaign = registry_client.get_campaign(&campaign_id);

        if campaign.status != CampaignStatus::Active {
            return Err(EscrowError::CampaignNotActive);
        }

        let current_time = env.ledger().timestamp();
        if current_time > campaign.deadline {
            return Err(EscrowError::CampaignExpired);
        }

        // Transfer tokens from contributor to Escrow contract
        let token_client = TokenClient::new(&env, &campaign.asset);
        token_client.transfer(&contributor, &env.current_contract_address(), &amount);

        // Update campaign total raised
        let current_total = Self::get_total_raised(env.clone(), campaign_id);
        let new_total = current_total
            .checked_add(amount)
            .ok_or(EscrowError::ArithmeticError)?;

        let total_key = DataKey::CampaignTotal(campaign_id);
        env.storage().persistent().set(&total_key, &new_total);
        env.storage().persistent().extend_ttl(
            &total_key,
            PERSISTENT_LIFETIME_THRESHOLD,
            PERSISTENT_BUMP_AMOUNT,
        );

        // Update individual contribution record
        let contrib_key = DataKey::Contribution(campaign_id, contributor.clone());
        let previous_record = env.storage().persistent().get::<_, ContributionRecord>(&contrib_key);

        let new_record = match previous_record {
            Some(rec) => ContributionRecord {
                amount: rec
                    .amount
                    .checked_add(amount)
                    .ok_or(EscrowError::ArithmeticError)?,
                timestamp: current_time,
            },
            None => {
                // Add to contributors list for campaign
                let mut contributors = Self::get_contributors(env.clone(), campaign_id);
                contributors.push_back(contributor.clone());
                let list_key = DataKey::Contributors(campaign_id);
                env.storage().persistent().set(&list_key, &contributors);
                env.storage().persistent().extend_ttl(
                    &list_key,
                    PERSISTENT_LIFETIME_THRESHOLD,
                    PERSISTENT_BUMP_AMOUNT,
                );

                // Add to contributor's backed campaigns list
                let mut user_camps = Self::get_contributor_campaigns(env.clone(), contributor.clone());
                user_camps.push_back(campaign_id);
                let user_camps_key = DataKey::ContributorCampaigns(contributor.clone());
                env.storage().persistent().set(&user_camps_key, &user_camps);
                env.storage().persistent().extend_ttl(
                    &user_camps_key,
                    PERSISTENT_LIFETIME_THRESHOLD,
                    PERSISTENT_BUMP_AMOUNT,
                );

                ContributionRecord {
                    amount,
                    timestamp: current_time,
                }
            }
        };

        env.storage().persistent().set(&contrib_key, &new_record);
        env.storage().persistent().extend_ttl(
            &contrib_key,
            PERSISTENT_LIFETIME_THRESHOLD,
            PERSISTENT_BUMP_AMOUNT,
        );

        // Auto-progress campaign status to Funded if goal met
        if new_total >= campaign.target_amount {
            registry_client.set_funded(&campaign_id, &env.current_contract_address());
        }

        env.events().publish(
            (symbol_short!("contrib"), campaign_id, contributor),
            amount,
        );

        Ok(new_total)
    }

    pub fn release_funds(env: Env, campaign_id: u64, caller: Address) -> Result<i128, EscrowError> {
        caller.require_auth();

        if Self::is_funds_released(env.clone(), campaign_id) {
            return Err(EscrowError::FundsAlreadyReleased);
        }

        let registry_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::RegistryContract)
            .ok_or(EscrowError::NotInitialized)?;

        let registry_client = CampaignRegistryClient::new(&env, &registry_addr);
        let campaign = registry_client.get_campaign(&campaign_id);

        if caller != campaign.creator {
            return Err(EscrowError::Unauthorized);
        }

        if campaign.status != CampaignStatus::Funded {
            return Err(EscrowError::GoalNotReached);
        }

        let total_raised = Self::get_total_raised(env.clone(), campaign_id);
        if total_raised <= 0 {
            return Err(EscrowError::InvalidAmount);
        }

        // Mark as released before external token transfer (reentrancy protection)
        let released_key = DataKey::FundsReleased(campaign_id);
        env.storage().persistent().set(&released_key, &true);
        env.storage().persistent().extend_ttl(
            &released_key,
            PERSISTENT_LIFETIME_THRESHOLD,
            PERSISTENT_BUMP_AMOUNT,
        );

        // Transfer funds from escrow to creator
        let token_client = TokenClient::new(&env, &campaign.asset);
        token_client.transfer(&env.current_contract_address(), &campaign.creator, &total_raised);

        // Advance registry state to Completed
        registry_client.set_completed(&campaign_id, &env.current_contract_address());

        env.events().publish(
            (symbol_short!("fund_rel"), campaign_id, campaign.creator),
            total_raised,
        );

        Ok(total_raised)
    }

    pub fn claim_refund(env: Env, campaign_id: u64, contributor: Address) -> Result<i128, EscrowError> {
        contributor.require_auth();

        let contrib_key = DataKey::Contribution(campaign_id, contributor.clone());
        let record = env
            .storage()
            .persistent()
            .get::<_, ContributionRecord>(&contrib_key)
            .ok_or(EscrowError::NoContributionToRefund)?;

        if record.amount <= 0 {
            return Err(EscrowError::NoContributionToRefund);
        }

        let registry_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::RegistryContract)
            .ok_or(EscrowError::NotInitialized)?;

        let registry_client = CampaignRegistryClient::new(&env, &registry_addr);
        let campaign = registry_client.get_campaign(&campaign_id);

        let current_time = env.ledger().timestamp();
        let is_expired_unmet = campaign.status == CampaignStatus::Active
            && current_time > campaign.deadline
            && Self::get_total_raised(env.clone(), campaign_id) < campaign.target_amount;

        let is_cancelled = campaign.status == CampaignStatus::Cancelled;
        let is_refund_state = campaign.status == CampaignStatus::Refund;

        if !is_expired_unmet && !is_cancelled && !is_refund_state {
            return Err(EscrowError::CampaignNotEligibleForRefund);
        }

        // If campaign was active and expired unmet, notify Registry of Refund state
        if is_expired_unmet {
            registry_client.set_refund(&campaign_id, &env.current_contract_address());
        }

        let refund_amount = record.amount;

        // Zero out contributor balance before transfer
        env.storage().persistent().set(
            &contrib_key,
            &ContributionRecord {
                amount: 0,
                timestamp: current_time,
            },
        );

        // Transfer refund back to contributor
        let token_client = TokenClient::new(&env, &campaign.asset);
        token_client.transfer(&env.current_contract_address(), &contributor, &refund_amount);

        env.events().publish(
            (symbol_short!("refund"), campaign_id, contributor),
            refund_amount,
        );

        Ok(refund_amount)
    }

    pub fn get_total_raised(env: Env, campaign_id: u64) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::CampaignTotal(campaign_id))
            .unwrap_or(0)
    }

    pub fn get_contribution(env: Env, campaign_id: u64, contributor: Address) -> Option<ContributionRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Contribution(campaign_id, contributor))
    }

    pub fn get_contributors(env: Env, campaign_id: u64) -> Vec<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::Contributors(campaign_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_contributor_count(env: Env, campaign_id: u64) -> u32 {
        Self::get_contributors(env, campaign_id).len()
    }

    pub fn get_contributor_campaigns(env: Env, contributor: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::ContributorCampaigns(contributor))
            .unwrap_or(Vec::new(&env))
    }

    pub fn is_funds_released(env: Env, campaign_id: u64) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::FundsReleased(campaign_id))
            .unwrap_or(false)
    }

    pub fn get_admin(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::Admin)
    }

    pub fn get_registry(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::RegistryContract)
    }
}

#[cfg(test)]
mod test;
