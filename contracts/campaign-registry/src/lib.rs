#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env,
    String, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    CampaignNotFound = 4,
    InvalidStateTransition = 5,
    InvalidGoalAmount = 6,
    InvalidDeadline = 7,
    InvalidMetadata = 8,
    CallerNotEscrow = 9,
    CallerNotAdmin = 10,
    CallerNotCreator = 11,
}

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

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    EscrowContract,
    CampaignCount,
    Campaign(u64),
    CreatorCampaigns(Address),
    Initialized,
}

const DAY_IN_LEDGERS: u32 = 17280;
const INSTANCE_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const INSTANCE_LIFETIME_THRESHOLD: u32 = 7 * DAY_IN_LEDGERS;
const PERSISTENT_BUMP_AMOUNT: u32 = 60 * DAY_IN_LEDGERS;
const PERSISTENT_LIFETIME_THRESHOLD: u32 = 14 * DAY_IN_LEDGERS;

#[contract]
pub struct CampaignRegistry;

#[contractimpl]
impl CampaignRegistry {
    /// Initialize the Campaign Registry with an administrative authority
    pub fn initialize(env: Env, admin: Address) -> Result<(), ContractError> {
        if env.storage().instance().has(&DataKey::Initialized) {
            return Err(ContractError::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::CampaignCount, &0u64);
        env.storage().instance().set(&DataKey::Initialized, &true);

        Self::extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("reg_init"), admin),
            symbol_short!("success"),
        );

        Ok(())
    }

    /// Link the Funding Escrow contract
    pub fn set_escrow(env: Env, escrow: Address) -> Result<(), ContractError> {
        let admin = Self::get_admin(env.clone()).ok_or(ContractError::NotInitialized)?;
        admin.require_auth();

        env.storage().instance().set(&DataKey::EscrowContract, &escrow);
        Self::extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("set_escr"), admin),
            escrow,
        );

        Ok(())
    }

    /// Update administrator address
    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), ContractError> {
        let current_admin = Self::get_admin(env.clone()).ok_or(ContractError::NotInitialized)?;
        current_admin.require_auth();
        new_admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &new_admin);
        Self::extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("set_adm"), current_admin),
            new_admin,
        );

        Ok(())
    }

    /// Create a new micro-funding campaign
    pub fn create_campaign(
        env: Env,
        creator: Address,
        title: String,
        description: String,
        category: String,
        image_url: String,
        target_amount: i128,
        asset: Address,
        deadline: u64,
    ) -> Result<u64, ContractError> {
        if !env.storage().instance().has(&DataKey::Initialized) {
            return Err(ContractError::NotInitialized);
        }

        creator.require_auth();

        if target_amount <= 0 {
            return Err(ContractError::InvalidGoalAmount);
        }

        let current_time = env.ledger().timestamp();
        if deadline <= current_time {
            return Err(ContractError::InvalidDeadline);
        }

        if title.len() == 0 || description.len() == 0 || category.len() == 0 {
            return Err(ContractError::InvalidMetadata);
        }

        let mut count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::CampaignCount)
            .unwrap_or(0);
        count = count.checked_add(1).ok_or(ContractError::InvalidGoalAmount)?;

        let metadata = CampaignMetadata {
            title,
            description,
            category,
            image_url,
        };

        let campaign = Campaign {
            id: count,
            creator: creator.clone(),
            metadata,
            target_amount,
            asset,
            deadline,
            status: CampaignStatus::Draft,
            created_at: current_time,
        };

        let campaign_key = DataKey::Campaign(count);
        env.storage().persistent().set(&campaign_key, &campaign);
        env.storage().persistent().extend_ttl(
            &campaign_key,
            PERSISTENT_LIFETIME_THRESHOLD,
            PERSISTENT_BUMP_AMOUNT,
        );

        // Update creator index
        let creator_key = DataKey::CreatorCampaigns(creator.clone());
        let mut creator_campaigns: Vec<u64> = env
            .storage()
            .persistent()
            .get(&creator_key)
            .unwrap_or_else(|| Vec::new(&env));
        creator_campaigns.push_back(count);
        env.storage().persistent().set(&creator_key, &creator_campaigns);
        env.storage().persistent().extend_ttl(
            &creator_key,
            PERSISTENT_LIFETIME_THRESHOLD,
            PERSISTENT_BUMP_AMOUNT,
        );

        env.storage().instance().set(&DataKey::CampaignCount, &count);
        Self::extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("cmp_creat"), creator, count),
            target_amount,
        );

        Ok(count)
    }

    /// Submit campaign for review by creator
    pub fn submit_for_review(env: Env, campaign_id: u64) -> Result<(), ContractError> {
        let mut campaign = Self::get_campaign(env.clone(), campaign_id)?;
        campaign.creator.require_auth();

        if campaign.status != CampaignStatus::Draft {
            return Err(ContractError::InvalidStateTransition);
        }

        campaign.status = CampaignStatus::Review;
        let campaign_key = DataKey::Campaign(campaign_id);
        env.storage().persistent().set(&campaign_key, &campaign);
        Self::extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("cmp_sub"), campaign.creator, campaign_id),
            symbol_short!("review"),
        );

        Ok(())
    }

    /// Admin approves campaign, making it Active for contributions
    pub fn approve_campaign(env: Env, campaign_id: u64) -> Result<(), ContractError> {
        let admin = Self::get_admin(env.clone()).ok_or(ContractError::NotInitialized)?;
        admin.require_auth();

        let mut campaign = Self::get_campaign(env.clone(), campaign_id)?;
        if campaign.status != CampaignStatus::Review && campaign.status != CampaignStatus::Draft {
            return Err(ContractError::InvalidStateTransition);
        }

        campaign.status = CampaignStatus::Active;
        let campaign_key = DataKey::Campaign(campaign_id);
        env.storage().persistent().set(&campaign_key, &campaign);
        Self::extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("cmp_appr"), admin, campaign_id),
            symbol_short!("active"),
        );

        Ok(())
    }

    /// Admin rejects campaign with a reason string, returning it to Draft for updates
    pub fn reject_campaign(
        env: Env,
        campaign_id: u64,
        reason: String,
    ) -> Result<(), ContractError> {
        let admin = Self::get_admin(env.clone()).ok_or(ContractError::NotInitialized)?;
        admin.require_auth();

        let mut campaign = Self::get_campaign(env.clone(), campaign_id)?;
        if campaign.status != CampaignStatus::Review {
            return Err(ContractError::InvalidStateTransition);
        }

        campaign.status = CampaignStatus::Draft;
        let campaign_key = DataKey::Campaign(campaign_id);
        env.storage().persistent().set(&campaign_key, &campaign);
        Self::extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("cmp_rej"), admin, campaign_id),
            reason,
        );

        Ok(())
    }

    /// Cancel a campaign (creator or admin)
    pub fn cancel_campaign(
        env: Env,
        campaign_id: u64,
        caller: Address,
    ) -> Result<(), ContractError> {
        caller.require_auth();

        let mut campaign = Self::get_campaign(env.clone(), campaign_id)?;
        let admin = Self::get_admin(env.clone());

        let is_authorized = caller == campaign.creator
            || (admin.is_some() && admin.unwrap() == caller);

        if !is_authorized {
            return Err(ContractError::Unauthorized);
        }

        match campaign.status {
            CampaignStatus::Draft | CampaignStatus::Review | CampaignStatus::Active => {
                campaign.status = CampaignStatus::Cancelled;
            }
            _ => return Err(ContractError::InvalidStateTransition),
        }

        let campaign_key = DataKey::Campaign(campaign_id);
        env.storage().persistent().set(&campaign_key, &campaign);
        Self::extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("cmp_canc"), campaign_id),
            symbol_short!("cancelled"),
        );

        Ok(())
    }

    /// Transition to Funded state (called by Funding Escrow or Admin)
    pub fn set_funded(
        env: Env,
        campaign_id: u64,
        caller: Address,
    ) -> Result<(), ContractError> {
        caller.require_auth();
        Self::verify_caller_is_escrow_or_admin(&env, &caller)?;

        let mut campaign = Self::get_campaign(env.clone(), campaign_id)?;
        if campaign.status != CampaignStatus::Active {
            return Err(ContractError::InvalidStateTransition);
        }

        campaign.status = CampaignStatus::Funded;
        let campaign_key = DataKey::Campaign(campaign_id);
        env.storage().persistent().set(&campaign_key, &campaign);
        Self::extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("cmp_stat"), campaign_id),
            symbol_short!("funded"),
        );

        Ok(())
    }

    /// Transition to Completed state (called by Funding Escrow upon fund release)
    pub fn set_completed(
        env: Env,
        campaign_id: u64,
        caller: Address,
    ) -> Result<(), ContractError> {
        caller.require_auth();
        Self::verify_caller_is_escrow_or_admin(&env, &caller)?;

        let mut campaign = Self::get_campaign(env.clone(), campaign_id)?;
        if campaign.status != CampaignStatus::Funded {
            return Err(ContractError::InvalidStateTransition);
        }

        campaign.status = CampaignStatus::Completed;
        let campaign_key = DataKey::Campaign(campaign_id);
        env.storage().persistent().set(&campaign_key, &campaign);
        Self::extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("cmp_stat"), campaign_id),
            symbol_short!("completed"),
        );

        Ok(())
    }

    /// Transition to Refund state (called by Escrow or Admin)
    pub fn set_refund(
        env: Env,
        campaign_id: u64,
        caller: Address,
    ) -> Result<(), ContractError> {
        caller.require_auth();
        Self::verify_caller_is_escrow_or_admin(&env, &caller)?;

        let mut campaign = Self::get_campaign(env.clone(), campaign_id)?;
        match campaign.status {
            CampaignStatus::Active | CampaignStatus::Cancelled => {
                campaign.status = CampaignStatus::Refund;
            }
            _ => return Err(ContractError::InvalidStateTransition),
        }

        let campaign_key = DataKey::Campaign(campaign_id);
        env.storage().persistent().set(&campaign_key, &campaign);
        Self::extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("cmp_stat"), campaign_id),
            symbol_short!("refund"),
        );

        Ok(())
    }

    // =========================================================================
    // View Functions
    // =========================================================================

    /// Get single campaign by ID
    pub fn get_campaign(env: Env, campaign_id: u64) -> Result<Campaign, ContractError> {
        let key = DataKey::Campaign(campaign_id);
        let campaign: Campaign = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::CampaignNotFound)?;

        env.storage().persistent().extend_ttl(
            &key,
            PERSISTENT_LIFETIME_THRESHOLD,
            PERSISTENT_BUMP_AMOUNT,
        );

        Ok(campaign)
    }

    /// Get total number of campaigns created
    pub fn get_campaign_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::CampaignCount)
            .unwrap_or(0)
    }

    /// Get campaign IDs created by a given address
    pub fn get_campaigns_by_creator(env: Env, creator: Address) -> Vec<u64> {
        let key = DataKey::CreatorCampaigns(creator);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Get current Admin address
    pub fn get_admin(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::Admin)
    }

    /// Get linked Escrow address
    pub fn get_escrow(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::EscrowContract)
    }

    // =========================================================================
    // Internal Helpers
    // =========================================================================

    fn verify_caller_is_escrow_or_admin(
        env: &Env,
        caller: &Address,
    ) -> Result<(), ContractError> {
        let escrow_opt = Self::get_escrow(env.clone());
        let admin_opt = Self::get_admin(env.clone());

        let is_escrow = escrow_opt.map_or(false, |e| &e == caller);
        let is_admin = admin_opt.map_or(false, |a| &a == caller);

        if !is_escrow && !is_admin {
            return Err(ContractError::Unauthorized);
        }

        Ok(())
    }

    fn extend_instance_ttl(env: &Env) {
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
    }
}

#[cfg(test)]
mod test;
