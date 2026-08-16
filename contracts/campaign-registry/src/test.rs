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
    assert_eq!(campaign.status, CampaignStatus::Active); // Active on creation
    assert_eq!(campaign.metadata.title, title);
    assert_eq!(campaign.metadata.category, category);

    let creator_campaigns = client.get_campaigns_by_creator(&creator);
    assert_eq!(creator_campaigns.len(), 1);
    assert_eq!(creator_campaigns.get(0).unwrap(), 1);
}

#[test]
fn test_admin_suspend_and_resume_campaign() {
    let (env, admin, creator, asset, client) = setup_test();
    client.initialize(&admin);

    env.ledger().set_timestamp(1000);

    let campaign_id = client.create_campaign(
        &creator,
        &String::from_str(&env, "Test Initiative"),
        &String::from_str(&env, "Description"),
        &String::from_str(&env, "Education"),
        &String::from_str(&env, "https://fundcircle.org/img.png"),
        &5_000_0000000i128,
        &asset,
        &5000,
    );

    assert_eq!(client.get_campaign(&campaign_id).status, CampaignStatus::Active);

    // Admin suspends campaign
    let reason = String::from_str(&env, "Compliance review check required");
    client.suspend_campaign(&campaign_id, &reason);
    assert_eq!(client.get_campaign(&campaign_id).status, CampaignStatus::Review);

    // Admin resumes campaign
    client.resume_campaign(&campaign_id);
    assert_eq!(client.get_campaign(&campaign_id).status, CampaignStatus::Active);
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

    // Empty metadata fields
    let empty_title = String::from_str(&env, "");
    let res3 = client.try_create_campaign(
        &creator,
        &empty_title,
        &desc,
        &category,
        &image_url,
        &1000i128,
        &asset,
        &3000,
    );
    assert_eq!(res3.unwrap_err(), Ok(ContractError::InvalidMetadata));
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

    assert_eq!(client.get_campaign(&campaign_id).status, CampaignStatus::Active);

    // Active -> Funded (called by escrow)
    client.set_funded(&campaign_id, &escrow);
    assert_eq!(client.get_campaign(&campaign_id).status, CampaignStatus::Funded);

    // Funded -> Completed (called by escrow after releasing funds)
    client.set_completed(&campaign_id, &escrow);
    assert_eq!(client.get_campaign(&campaign_id).status, CampaignStatus::Completed);
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

    // Cancel while in Active by creator
    client.cancel_campaign(&campaign_id, &creator);
    assert_eq!(client.get_campaign(&campaign_id).status, CampaignStatus::Cancelled);

    // Cannot set to Funded after cancelled
    let res = client.try_set_funded(&campaign_id, &escrow);
    assert_eq!(res.unwrap_err(), Ok(ContractError::InvalidStateTransition));
}

#[test]
fn test_unauthorized_state_transitions() {
    let (env, admin, creator, asset, client) = setup_test();
    client.initialize(&admin);

    let escrow = Address::generate(&env);
    let unauthorized_user = Address::generate(&env);
    client.set_escrow(&escrow);

    env.ledger().set_timestamp(1000);

    let campaign_id = client.create_campaign(
        &creator,
        &String::from_str(&env, "Secure Campaign"),
        &String::from_str(&env, "Testing security invariants"),
        &String::from_str(&env, "Security"),
        &String::from_str(&env, "https://fundcircle.org/sec.png"),
        &5_000_0000000i128,
        &asset,
        &8000,
    );

    // Unauthorized user attempts to mark as Funded -> must fail with Unauthorized
    let res = client.try_set_funded(&campaign_id, &unauthorized_user);
    assert_eq!(res.unwrap_err(), Ok(ContractError::Unauthorized));

    // Unauthorized user attempts to cancel -> must fail
    let res2 = client.try_cancel_campaign(&campaign_id, &unauthorized_user);
    assert_eq!(res2.unwrap_err(), Ok(ContractError::Unauthorized));
}

#[test]
fn test_lookup_nonexistent_campaign() {
    let (_env, admin, _, _, client) = setup_test();
    client.initialize(&admin);

    let res = client.try_get_campaign(&999);
    assert_eq!(res.unwrap_err(), Ok(ContractError::CampaignNotFound));
}
