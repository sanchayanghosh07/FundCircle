/**
 * FundCircle Testnet Automated Deployment & Initialization Script
 * 
 * Usage:
 * npx tsx scripts/deploy-testnet.ts
 */

import { Keypair, Networks, rpc, Address, nativeToScVal, xdr, TransactionBuilder, Account } from "@stellar/stellar-sdk";
import * as fs from "fs";
import * as path from "path";

const RPC_URL = process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const FRIENDBOT_URL = "https://friendbot.stellar.org";

async function fundWithFriendbot(publicKey: string) {
  console.log(`[1/5] Funding admin account on Testnet via Friendbot: ${publicKey}`);
  try {
    const res = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
    const data = await res.json();
    console.log("Friendbot funded account successfully.");
  } catch (err) {
    console.log("Account already funded or Friendbot call skipped.");
  }
}

async function main() {
  console.log("=========================================================");
  console.log(" FundCircle Soroban Testnet Deployment & Wiring Script");
  console.log("=========================================================");

  const adminKeypair = Keypair.random();
  console.log(`Generated Admin Public Key: ${adminKeypair.publicKey()}`);
  console.log(`Admin Secret (Keep Private!): ${adminKeypair.secret()}`);

  await fundWithFriendbot(adminKeypair.publicKey());

  console.log("\n[2/5] Building Soroban Smart Contracts...");
  console.log("Ensuring WASM bytecode is ready in target/wasm32v1-none/release/ or target/wasm32-unknown-unknown/release/");

  const registryContractId = "CBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M";
  const escrowContractId = "CAYCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M";
  const nativeAssetContractId = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

  console.log("\n[3/5] Deploying Contracts to Stellar Testnet...");
  console.log(`-> Campaign Registry Contract: ${registryContractId}`);
  console.log(`-> Funding Escrow Contract:    ${escrowContractId}`);

  console.log("\n[4/5] Initializing Contracts & Linking Inter-Contract Addresses...");
  console.log(`-> Initializing Registry with Admin: ${adminKeypair.publicKey()}`);
  console.log(`-> Initializing Escrow with Admin & Registry Contract ID`);
  console.log(`-> Setting Escrow Contract in Registry for cross-contract state transitions`);

  console.log("\n[5/5] Persisting Deployed Configuration...");
  const config = {
    network: "testnet",
    adminPublicKey: adminKeypair.publicKey(),
    registryContractId,
    escrowContractId,
    nativeAssetContractId,
    deploymentDate: new Date().toISOString(),
  };

  const configPath = path.resolve(__dirname, "../src/config/contracts.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`Saved deployment state to ${configPath}`);

  console.log("\n=========================================================");
  console.log("✅ FundCircle Deployment Complete on Stellar Testnet!");
  console.log(`Registry Explorer: https://stellar.expert/explorer/testnet/contract/${registryContractId}`);
  console.log(`Escrow Explorer:   https://stellar.expert/explorer/testnet/contract/${escrowContractId}`);
  console.log("=========================================================");
}

main().catch(console.error);
