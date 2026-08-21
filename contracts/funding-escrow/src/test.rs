#![cfg(test)]

use super::*;
use fundcircle_campaign_registry::{CampaignRegistry, CampaignRegistryClient, CampaignStatus};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{Client as TokenClient, StellarAssetClient},
    Address, Env, String,
};

struct TestSetup<'a> {
    env: Env,
    admin: Address,
    creator: Address,
    contributor1: Address,
    contributor2: Address,
    token_address: Address,
    token_client: TokenClient<'a>,
    registry_client: CampaignRegistryClient<'a>,
    escrow_client: FundingEscrowClient<'a>,
}

fn setup_test() -> TestSetup<'static> {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1000);

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let contributor1 = Address::generate(&env);
    let contributor2 = Address::generate(&env);
    let token_admin = Address::generate(&env);

    // Register SAC token contract
    let token_address = env.register_stellar_asset_contract_v2(token_admin).address();
    let token_client = TokenClient::new(&env, &token_address);
    let token_asset_client = StellarAssetClient::new(&env, &token_address);

    // Mint test balances
    token_asset_client.mint(&contributor1, &50_000_0000000i128);
    token_asset_client.mint(&contributor2, &50_000_0000000i128);

    // Register Campaign Registry contract directly without WASM dependency
    let reg_contract_id = env.register(CampaignRegistry, ());
    let registry_client = CampaignRegistryClient::new(&env, &reg_contract_id);
    registry_client.initialize(&admin);

    // Register Funding Escrow contract
    let escrow_contract_id = env.register(FundingEscrow, ());
    let escrow_client = FundingEscrowClient::new(&env, &escrow_contract_id);
    escrow_client.initialize(&admin, &reg_contract_id);

    // Set Escrow in Registry
    registry_client.set_escrow(&escrow_contract_id);

    TestSetup {
        env,
        admin,
        creator,
        contributor1,
        contributor2,
        token_address,
        token_client,
        registry_client,
        escrow_client,
    }
}

fn create_active_campaign(setup: &TestSetup, target_amount: i128, deadline: u64) -> u64 {
    let title = String::from_str(&setup.env, "Youth Coding Workshop");
    let desc = String::from_str(&setup.env, "Free weekend workshops for underprivileged youth");
    let category = String::from_str(&setup.env, "Education");
    let img = String::from_str(&setup.env, "https://fundcircle.org/code.png");

    setup.registry_client.create_campaign(
        &setup.creator,
        &title,
        &desc,
        &category,
        &img,
        &target_amount,
        &setup.token_address,
        &deadline,
    )
}

#[test]
fn test_escrow_initialization() {
    let setup = setup_test();

    assert_eq!(setup.escrow_client.get_admin(), Some(setup.admin.clone()));
    assert_eq!(
        setup.escrow_client.get_registry(),
        Some(setup.registry_client.address.clone())
    );

    // Double init rejected
    let res = setup.escrow_client.try_initialize(&setup.admin, &setup.registry_client.address);
    assert_eq!(res.unwrap_err(), Ok(EscrowError::AlreadyInitialized));
}

#[test]
fn test_contribution_flow_and_intercontract_state_advance() {
    let setup = setup_test();
    let goal = 10_000_0000000i128; // 10,000 XLM
    let deadline = 1000 + 10 * 86400;

    let cid = create_active_campaign(&setup, goal, deadline);
    assert_eq!(setup.registry_client.get_campaign(&cid).status, CampaignStatus::Active);

    // Contributor 1 contributes 4,000 XLM
    let c1_amount = 4_000_0000000i128;
    let raised1 = setup.escrow_client.contribute(&cid, &setup.contributor1, &c1_amount);
    assert_eq!(raised1, c1_amount);
    assert_eq!(setup.escrow_client.get_total_raised(&cid), c1_amount);
    assert_eq!(setup.escrow_client.get_contributor_count(&cid), 1);

    // Check individual contribution record
    let record1 = setup.escrow_client.get_contribution(&cid, &setup.contributor1).unwrap();
    assert_eq!(record1.amount, c1_amount);

    // Still Active
    assert_eq!(setup.registry_client.get_campaign(&cid).status, CampaignStatus::Active);

    // Contributor 2 contributes 6,000 XLM (reaches goal!)
    let c2_amount = 6_000_0000000i128;
    let raised2 = setup.escrow_client.contribute(&cid, &setup.contributor2, &c2_amount);
    assert_eq!(raised2, goal);
    assert_eq!(setup.escrow_client.get_total_raised(&cid), goal);
    assert_eq!(setup.escrow_client.get_contributor_count(&cid), 2);

    // Inter-contract check: Campaign in Registry should now be automatically "Funded"!
    assert_eq!(setup.registry_client.get_campaign(&cid).status, CampaignStatus::Funded);

    // Check user backed campaigns list
    let user1_camps = setup.escrow_client.get_contributor_campaigns(&setup.contributor1);
    assert_eq!(user1_camps.len(), 1);
    assert_eq!(user1_camps.get(0).unwrap(), cid);
}

#[test]
fn test_contribute_to_inactive_or_expired_fails() {
    let setup = setup_test();
    let goal = 5_000_0000000i128;
    let deadline = 2000;

    let cid = setup.registry_client.create_campaign(
        &setup.creator,
        &String::from_str(&setup.env, "Campaign"),
        &String::from_str(&setup.env, "Desc"),
        &String::from_str(&setup.env, "Category"),
        &String::from_str(&setup.env, "img"),
        &goal,
        &setup.token_address,
        &deadline,
    );

    // Suspend campaign by admin
    let reason = String::from_str(&setup.env, "Under audit");
    setup.registry_client.suspend_campaign(&cid, &reason);
    assert_eq!(setup.registry_client.get_campaign(&cid).status, CampaignStatus::Review);

    // Attempt contribute to Suspended/Inactive campaign
    let res = setup.escrow_client.try_contribute(&cid, &setup.contributor1, &1_000_0000000i128);
    assert_eq!(res.unwrap_err(), Ok(EscrowError::CampaignNotActive));

    // Resume campaign
    setup.registry_client.resume_campaign(&cid);
    assert_eq!(setup.registry_client.get_campaign(&cid).status, CampaignStatus::Active);

    // Fast forward ledger time past deadline
    setup.env.ledger().set_timestamp(2500);

    // Attempt contribute to expired campaign
    let res2 = setup.escrow_client.try_contribute(&cid, &setup.contributor1, &1_000_0000000i128);
    assert_eq!(res2.unwrap_err(), Ok(EscrowError::CampaignExpired));
}

#[test]
fn test_fund_release_to_creator() {
    let setup = setup_test();
    let goal = 8_000_0000000i128;
    let deadline = 1000 + 86400;

    let cid = create_active_campaign(&setup, goal, deadline);

    // Fund the campaign fully
    setup.escrow_client.contribute(&cid, &setup.contributor1, &goal);

    let initial_creator_balance = setup.token_client.balance(&setup.creator);
    assert_eq!(initial_creator_balance, 0);

    // Release funds by creator
    let released = setup.escrow_client.release_funds(&cid, &setup.creator);
    assert_eq!(released, goal);
    assert!(setup.escrow_client.is_funds_released(&cid));

    // Creator should have received the tokens
    assert_eq!(setup.token_client.balance(&setup.creator), goal);

    // Registry status should be Completed
    assert_eq!(setup.registry_client.get_campaign(&cid).status, CampaignStatus::Completed);

    // Second release attempt must fail
    let res = setup.escrow_client.try_release_funds(&cid, &setup.creator);
    assert_eq!(res.unwrap_err(), Ok(EscrowError::FundsAlreadyReleased));
}

#[test]
fn test_refund_flow_on_expired_unmet_campaign() {
    let setup = setup_test();
    let goal = 10_000_0000000i128;
    let deadline = 2000;

    let cid = create_active_campaign(&setup, goal, deadline);

    // Partial contribution
    let contrib_amount = 3_000_0000000i128;
    setup.escrow_client.contribute(&cid, &setup.contributor1, &contrib_amount);

    let balance_after_contrib = setup.token_client.balance(&setup.contributor1);

    // Try refund before deadline -> must fail
    let res = setup.escrow_client.try_claim_refund(&cid, &setup.contributor1);
    assert_eq!(res.unwrap_err(), Ok(EscrowError::CampaignNotEligibleForRefund));

    // Advance time past deadline
    setup.env.ledger().set_timestamp(2500);

    // Claim refund
    let refunded = setup.escrow_client.claim_refund(&cid, &setup.contributor1);
    assert_eq!(refunded, contrib_amount);

    // Contributor received their tokens back
    assert_eq!(
        setup.token_client.balance(&setup.contributor1),
        balance_after_contrib + contrib_amount
    );

    // Double refund must fail
    let res2 = setup.escrow_client.try_claim_refund(&cid, &setup.contributor1);
    assert_eq!(res2.unwrap_err(), Ok(EscrowError::NoContributionToRefund));

    // Registry campaign status updated to Refund
    assert_eq!(setup.registry_client.get_campaign(&cid).status, CampaignStatus::Refund);
}

#[test]
fn test_refund_flow_on_cancelled_campaign() {
    let setup = setup_test();
    let goal = 10_000_0000000i128;
    let deadline = 5000;

    let cid = create_active_campaign(&setup, goal, deadline);

    let c1_amount = 2_000_0000000i128;
    let c2_amount = 1_500_0000000i128;
    setup.escrow_client.contribute(&cid, &setup.contributor1, &c1_amount);
    setup.escrow_client.contribute(&cid, &setup.contributor2, &c2_amount);

    let b1 = setup.token_client.balance(&setup.contributor1);
    let b2 = setup.token_client.balance(&setup.contributor2);

    // Creator cancels campaign
    setup.registry_client.cancel_campaign(&cid, &setup.creator);
    assert_eq!(setup.registry_client.get_campaign(&cid).status, CampaignStatus::Cancelled);

    // Both contributors claim refund
    let r1 = setup.escrow_client.claim_refund(&cid, &setup.contributor1);
    assert_eq!(r1, c1_amount);
    assert_eq!(setup.token_client.balance(&setup.contributor1), b1 + c1_amount);

    let r2 = setup.escrow_client.claim_refund(&cid, &setup.contributor2);
    assert_eq!(r2, c2_amount);
    assert_eq!(setup.token_client.balance(&setup.contributor2), b2 + c2_amount);
}

#[test]
fn test_unauthorized_fund_release_fails() {
    let setup = setup_test();
    let goal = 5_000_0000000i128;
    let deadline = 5000;

    let cid = create_active_campaign(&setup, goal, deadline);
    setup.escrow_client.contribute(&cid, &setup.contributor1, &goal);

    let unauthorized_user = Address::generate(&setup.env);
    let res = setup.escrow_client.try_release_funds(&cid, &unauthorized_user);
    assert_eq!(res.unwrap_err(), Ok(EscrowError::Unauthorized));
}

#[test]
fn test_invalid_contribution_amounts() {
    let setup = setup_test();
    let goal = 5_000_0000000i128;
    let deadline = 5000;

    let cid = create_active_campaign(&setup, goal, deadline);

    // Zero contribution
    let res = setup.escrow_client.try_contribute(&cid, &setup.contributor1, &0i128);
    assert_eq!(res.unwrap_err(), Ok(EscrowError::InvalidAmount));

    // Negative contribution
    let res2 = setup.escrow_client.try_contribute(&cid, &setup.contributor1, &-100i128);
    assert_eq!(res2.unwrap_err(), Ok(EscrowError::InvalidAmount));
}

#[test]
fn test_multiple_contributions_from_same_user() {
    let setup = setup_test();
    let goal = 10_000_0000000i128;
    let deadline = 5000;

    let cid = create_active_campaign(&setup, goal, deadline);

    setup.escrow_client.contribute(&cid, &setup.contributor1, &2_000_0000000i128);
    setup.escrow_client.contribute(&cid, &setup.contributor1, &3_000_0000000i128);

    assert_eq!(setup.escrow_client.get_total_raised(&cid), 5_000_0000000i128);
    assert_eq!(setup.escrow_client.get_contributor_count(&cid), 1);

    let record = setup.escrow_client.get_contribution(&cid, &setup.contributor1).unwrap();
    assert_eq!(record.amount, 5_000_0000000i128);
}
