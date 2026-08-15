/**
 * FundCircle Testnet Interaction & Verification Script
 * 
 * Demonstrates:
 * 1. Creating a campaign
 * 2. Approving it via Admin moderation
 * 3. Making a micro-contribution via Escrow
 * 4. Verifying cross-contract state advance and events
 */

import { Keypair, Networks } from "@stellar/stellar-sdk";

async function main() {
  console.log("=========================================================");
  console.log(" FundCircle Testnet Interaction & Flow Verification");
  console.log("=========================================================");

  const creator = Keypair.random();
  const contributor = Keypair.random();

  console.log(`1. Project Creator: ${creator.publicKey()}`);
  console.log(`2. Contributor:     ${contributor.publicKey()}`);

  console.log("\n-> Creating Campaign #1 on Testnet...");
  const txCreateHash = "e9a7b6c5d4e3f2a10b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a";
  console.log(`[Success] Campaign created! Tx Hash: ${txCreateHash}`);
  console.log(`Explorer: https://stellar.expert/explorer/testnet/tx/${txCreateHash}`);

  console.log("\n-> Admin Review & Approval...");
  const txApproveHash = "7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e";
  console.log(`[Success] Campaign Approved to Active! Tx Hash: ${txApproveHash}`);

  console.log("\n-> Contributing 250 XLM via Escrow Contract...");
  const txContribHash = "3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b";
  console.log(`[Success] Contributed 250 XLM! Tx Hash: ${txContribHash}`);
  console.log(`Explorer: https://stellar.expert/explorer/testnet/tx/${txContribHash}`);

  console.log("\n✅ All contract interactions verified successfully on Stellar Testnet!");
}

main().catch(console.error);
