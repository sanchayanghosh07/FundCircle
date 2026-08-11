#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env, String,
};

fn setup_test() -> (Env, Address, Address, Address, CampaignRegistryClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let asset = Address::generate(&env);

    let contract_id = env.register(CampaignRegistry, ());
    let client = CampaignRegistryClient::new(&env, &contract_id);

    (env, admin, creator, asset, client)
}

#[test]
fn test_initialize() {
    let (_env, admin, _, _, client) = setup_test();

    client.initialize(&admin);
    assert_eq!(client.get_admin(), Some(admin.clone()));
    assert_eq!(client.get_campaign_count(), 0);

    // Double init should fail
    let res = client.try_initialize(&admin);
    assert_eq!(res.unwrap_err(), Ok(ContractError::AlreadyInitialized));
}

#[test]
fn test_set_escrow_and_admin() {
    let (env, admin, _, _, client) = setup_test();
    client.initialize(&admin);

    let escrow = Address::generate(&env);
    client.set_escrow(&escrow);
    assert_eq!(client.get_escrow(), Some(escrow));

    let new_admin = Address::generate(&env);
    client.set_admin(&new_admin);
    assert_eq!(client.get_admin(), Some(new_admin));
}

#[test]
fn test_create_campaign() {
    let (env, admin, creator, asset, client) = setup_test();
    client.initialize(&admin);

    env.ledger().set_timestamp(1000);

    let title = String::from_str(&env, "Community Solar Lanterns");
    let desc = String::from_str(&env, "Providing solar lanterns for local school students");
    let category = String::from_str(&env, "Education");
    let image_url = String::from_str(&env, "https://images.fundcircle.org/solar.jpg");
    let target_amount: i128 = 5_000_0000000; // 5,000 XLM in stroops
    let deadline = 1000 + 30 * 86400; // 30 days later

    let campaign_id = client.create_campaign(
        &creator,
        &title,
        &desc,
        &category,
        &image_url,
        &target_amount,
        &asset,
        &deadline,
    );

    assert_eq!(campaign_id, 1);
    assert_eq!(client.get_campaign_count(), 1);

    let campaign = client.get_campaign(&1);
    assert_eq!(campaign.id, 1);
    assert_eq!(campaign.creator, creator);
    assert_eq!(campaign.target_amount, target_amount);
    assert_eq!(campaign.asset, asset);
    assert_eq!(campaign.deadline, deadline);
    assert_eq!(campaign.status, CampaignStatus::Draft);
    assert_eq!(campaign.metadata.title, title);
    assert_eq!(campaign.metadata.category, category);

    let creator_campaigns = client.get_campaigns_by_creator(&creator);
    assert_eq!(creator_campaigns.len(), 1);
    assert_eq!(creator_campaigns.get(0).unwrap(), 1);
}

#[test]
fn test_invalid_campaign_creation() {
    let (env, admin, creator, asset, client) = setup_test();
    client.initialize(&admin);
    env.ledger().set_timestamp(2000);

    let title = String::from_str(&env, "Valid Title");
    let desc = String::from_str(&env, "Valid Description");
    let category = String::from_str(&env, "Community");
    let image_url = String::from_str(&env, "https://fundcircle.org/img.png");

    // Negative / zero goal
    let res = client.try_create_campaign(
        &creator,
        &title,
        &desc,
        &category,
        &image_url,
        &0i128,
        &asset,
        &3000,
    );
    assert_eq!(res.unwrap_err(), Ok(ContractError::InvalidGoalAmount));

    // Past deadline
    let res2 = client.try_create_campaign(
        &creator,
        &title,
        &desc,
        &category,
        &image_url,
        &1000i128,
        &asset,
        &1500, // before 2000
    );
    assert_eq!(res2.unwrap_err(), Ok(ContractError::InvalidDeadline));
}

#[test]
fn test_campaign_lifecycle_happy_path() {
    let (env, admin, creator, asset, client) = setup_test();
    client.initialize(&admin);

    let escrow = Address::generate(&env);
    client.set_escrow(&escrow);

    env.ledger().set_timestamp(1000);

    let campaign_id = client.create_campaign(
        &creator,
        &String::from_str(&env, "Robotics Lab Equipment"),
        &String::from_str(&env, "Empowering high school STEM clubs with robotics kits"),
        &String::from_str(&env, "Education"),
        &String::from_str(&env, "https://fundcircle.org/robotics.png"),
        &10_000_0000000i128,
        &asset,
        &5000,
    );

    // 1. Draft -> Review
    client.submit_for_review(&campaign_id);
    assert_eq!(client.get_campaign(&campaign_id).status, CampaignStatus::Review);

    // 2. Review -> Active
    client.approve_campaign(&campaign_id);
    assert_eq!(client.get_campaign(&campaign_id).status, CampaignStatus::Active);

    // 3. Active -> Funded (called by escrow)
    client.set_funded(&campaign_id, &escrow);
    assert_eq!(client.get_campaign(&campaign_id).status, CampaignStatus::Funded);

    // 4. Funded -> Completed (called by escrow after releasing funds)
    client.set_completed(&campaign_id, &escrow);
    assert_eq!(client.get_campaign(&campaign_id).status, CampaignStatus::Completed);
}

#[test]
fn test_campaign_review_rejection_and_resubmission() {
    let (env, admin, creator, asset, client) = setup_test();
    client.initialize(&admin);

    env.ledger().set_timestamp(1000);

    let campaign_id = client.create_campaign(
        &creator,
        &String::from_str(&env, "Needs Revision"),
        &String::from_str(&env, "Short desc"),
        &String::from_str(&env, "Misc"),
        &String::from_str(&env, "https://fundcircle.org/pic.png"),
        &2_000_0000000i128,
        &asset,
        &6000,
    );

    client.submit_for_review(&campaign_id);
    assert_eq!(client.get_campaign(&campaign_id).status, CampaignStatus::Review);

    // Admin rejects back to Draft
    let reason = String::from_str(&env, "Please add more details to the project scope");
    client.reject_campaign(&campaign_id, &reason);
    assert_eq!(client.get_campaign(&campaign_id).status, CampaignStatus::Draft);

    // Creator resubmits
    client.submit_for_review(&campaign_id);
    assert_eq!(client.get_campaign(&campaign_id).status, CampaignStatus::Review);

    // Admin approves
    client.approve_campaign(&campaign_id);
    assert_eq!(client.get_campaign(&campaign_id).status, CampaignStatus::Active);
}

#[test]
fn test_campaign_cancellation() {
    let (env, admin, creator, asset, client) = setup_test();
    client.initialize(&admin);

    let escrow = Address::generate(&env);
    client.set_escrow(&escrow);

    env.ledger().set_timestamp(1000);

    let campaign_id = client.create_campaign(
        &creator,
        &String::from_str(&env, "Community Garden"),
        &String::from_str(&env, "Urban planting initiative"),
        &String::from_str(&env, "Environment"),
        &String::from_str(&env, "https://fundcircle.org/garden.png"),
        &1_000_0000000i128,
        &asset,
        &7000,
    );

    // Cancel while in Draft by creator
    client.cancel_campaign(&campaign_id, &creator);
    assert_eq!(client.get_campaign(&campaign_id).status, CampaignStatus::Cancelled);

    // Cannot set to Funded after cancelled
    let res = client.try_set_funded(&campaign_id, &escrow);
    assert_eq!(res.unwrap_err(), Ok(ContractError::InvalidStateTransition));
}
