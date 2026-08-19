#!/usr/bin/env node

/**
 * Synchronizes deployed Soroban contract addresses across all project files:
 * - .env.local
 * - .env.example
 * - src/config/contracts.json
 * - src/config/stellar.ts
 * - README.md (Badges, Mermaid Architecture, Section 3 Specs, Section 10 Verification Table)
 * - .github/workflows/test.yml
 *
 * Usage:
 * node scripts/sync-contract-addresses.js <registryContractId> <escrowContractId> [adminAddress]
 */

const fs = require("fs");
const path = require("path");

function syncContracts() {
  const args = process.argv.slice(2);
  const registryId = (args[0] || process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ID || "").trim();
  const escrowId = (args[1] || process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID || "").trim();
  const adminAddress = (args[2] || process.env.ADMIN_ADDRESS || process.env.NEXT_PUBLIC_ADMIN_PUBLIC_KEY || "GCPUZLCKI4NONG3ZLNUWKMTBZS3CO6SXFMHR2H2PGQHMENR4HL7HNMFD").trim();

  if (!registryId || !escrowId) {
    console.error("❌ Error: Missing contract IDs.");
    console.error("Usage: node scripts/sync-contract-addresses.js <registryContractId> <escrowContractId> [adminAddress]");
    process.exit(1);
  }

  const rootDir = path.resolve(__dirname, "..");

  console.log("=========================================================");
  console.log(" 🔄 Synchronizing Contract Addresses Across Project");
  console.log("=========================================================");
  console.log(`Campaign Registry ID: ${registryId}`);
  console.log(`Funding Escrow ID:    ${escrowId}`);
  console.log(`Admin Address:        ${adminAddress}`);
  console.log("---------------------------------------------------------");

  // 1. Update / Create .env.local
  const envLocalPath = path.join(rootDir, ".env.local");
  const envLocalContent = `# FundCircle Stellar Testnet Deployed Configuration
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_STELLAR_EXPLORER_URL=https://stellar.expert/explorer/testnet
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_REGISTRY_CONTRACT_ID=${registryId}
NEXT_PUBLIC_ESCROW_CONTRACT_ID=${escrowId}
NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
NEXT_PUBLIC_ADMIN_PUBLIC_KEY=${adminAddress}
`;
  fs.writeFileSync(envLocalPath, envLocalContent, "utf8");
  console.log("✅ Updated .env.local");

  // 2. Update .env.example
  const envExamplePath = path.join(rootDir, ".env.example");
  if (fs.existsSync(envExamplePath)) {
    let envExContent = fs.readFileSync(envExamplePath, "utf8");
    envExContent = envExContent.replace(
      /NEXT_PUBLIC_REGISTRY_CONTRACT_ID=.*/g,
      `NEXT_PUBLIC_REGISTRY_CONTRACT_ID=${registryId}`
    );
    envExContent = envExContent.replace(
      /NEXT_PUBLIC_ESCROW_CONTRACT_ID=.*/g,
      `NEXT_PUBLIC_ESCROW_CONTRACT_ID=${escrowId}`
    );
    envExContent = envExContent.replace(
      /NEXT_PUBLIC_ADMIN_PUBLIC_KEY=.*/g,
      `NEXT_PUBLIC_ADMIN_PUBLIC_KEY=${adminAddress}`
    );
    fs.writeFileSync(envExamplePath, envExContent, "utf8");
    console.log("✅ Updated .env.example");
  }

  // 3. Update src/config/contracts.json
  const contractsJsonPath = path.join(rootDir, "src", "config", "contracts.json");
  const contractsData = {
    network: "testnet",
    registryContractId: registryId,
    escrowContractId: escrowId,
    adminAddress: adminAddress,
    nativeAssetContractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    deploymentDate: new Date().toISOString(),
  };
  fs.writeFileSync(contractsJsonPath, JSON.stringify(contractsData, null, 2) + "\n", "utf8");
  console.log("✅ Updated src/config/contracts.json");

  // 4. Update src/config/stellar.ts
  const stellarTsPath = path.join(rootDir, "src", "config", "stellar.ts");
  if (fs.existsSync(stellarTsPath)) {
    let stellarTsContent = fs.readFileSync(stellarTsPath, "utf8");
    stellarTsContent = stellarTsContent.replace(
      /registryContractId:\s*process\.env\.NEXT_PUBLIC_REGISTRY_CONTRACT_ID\s*\|\|\s*"[^"]*"/g,
      `registryContractId: process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ID || "${registryId}"`
    );
    stellarTsContent = stellarTsContent.replace(
      /escrowContractId:\s*process\.env\.NEXT_PUBLIC_ESCROW_CONTRACT_ID\s*\|\|\s*"[^"]*"/g,
      `escrowContractId: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID || "${escrowId}"`
    );
    stellarTsContent = stellarTsContent.replace(
      /adminAddress:\s*process\.env\.NEXT_PUBLIC_ADMIN_PUBLIC_KEY\s*\|\|\s*"[^"]*"/g,
      `adminAddress: process.env.NEXT_PUBLIC_ADMIN_PUBLIC_KEY || "${adminAddress}"`
    );
    fs.writeFileSync(stellarTsPath, stellarTsContent, "utf8");
    console.log("✅ Updated src/config/stellar.ts");
  }

  // 5. Update README.md
  const readmePath = path.join(rootDir, "README.md");
  if (fs.existsSync(readmePath)) {
    let readmeContent = fs.readFileSync(readmePath, "utf8");

    // Header Badges
    readmeContent = readmeContent.replace(
      /href="https:\/\/stellar\.expert\/explorer\/testnet\/contract\/[^"]*"><img src="[^"]*CampaignRegistry[^"]*"/g,
      `href="https://stellar.expert/explorer/testnet/contract/${registryId}"><img src="https://img.shields.io/badge/CampaignRegistry-Testnet-blue?logo=stellar"`
    );
    readmeContent = readmeContent.replace(
      /href="https:\/\/stellar\.expert\/explorer\/testnet\/contract\/[^"]*"><img src="[^"]*FundingEscrow[^"]*"/g,
      `href="https://stellar.expert/explorer/testnet/contract/${escrowId}"><img src="https://img.shields.io/badge/FundingEscrow-Testnet-blue?logo=stellar"`
    );

    // Architecture diagram short hashes
    readmeContent = readmeContent.replace(
      /REGISTRY_CTR\["CampaignRegistry Contract\\n[A-Za-z0-9.]+"\]/g,
      `REGISTRY_CTR["CampaignRegistry Contract\\n${registryId.substring(0, 16)}..."]`
    );
    readmeContent = readmeContent.replace(
      /ESCROW_CTR\["FundingEscrow Contract\\n[A-Za-z0-9.]+"\]/g,
      `ESCROW_CTR["FundingEscrow Contract\\n${escrowId.substring(0, 16)}..."]`
    );

    // Section 3.1 & 3.2 Addresses
    readmeContent = readmeContent.replace(
      /(### 3\.1 CampaignRegistry[\s\S]*?\*\*Address\*\*:\s*)\[`[^`]*`\]\(https:\/\/stellar\.expert\/explorer\/testnet\/contract\/[^)]*\)/,
      `$1[\`${registryId}\`](https://stellar.expert/explorer/testnet/contract/${registryId})`
    );
    readmeContent = readmeContent.replace(
      /(### 3\.2 FundingEscrow[\s\S]*?\*\*Address\*\*:\s*)\[`[^`]*`\]\(https:\/\/stellar\.expert\/explorer\/testnet\/contract\/[^)]*\)/,
      `$1[\`${escrowId}\`](https://stellar.expert/explorer/testnet/contract/${escrowId})`
    );

    // Section 10 Table
    readmeContent = readmeContent.replace(
      /\|\s*\*\*Campaign Registry\*\*\s*\|\s*Stellar Testnet\s*\|\s*\[`[^`]*`\]\(https:\/\/stellar\.expert\/explorer\/testnet\/contract\/[^)]*\)\s*\|/g,
      `| **Campaign Registry** | Stellar Testnet | [\`${registryId}\`](https://stellar.expert/explorer/testnet/contract/${registryId}) |`
    );
    readmeContent = readmeContent.replace(
      /\|\s*\*\*Funding Escrow\*\*\s*\|\s*Stellar Testnet\s*\|\s*\[`[^`]*`\]\(https:\/\/stellar\.expert\/explorer\/testnet\/contract\/[^)]*\)\s*\|/g,
      `| **Funding Escrow** | Stellar Testnet | [\`${escrowId}\`](https://stellar.expert/explorer/testnet/contract/${escrowId}) |`
    );
    readmeContent = readmeContent.replace(
      /\|\s*\*\*Admin Authority\*\*\s*\|\s*Stellar Testnet\s*\|\s*\[`[^`]*`\]\(https:\/\/stellar\.expert\/explorer\/testnet\/account\/[^)]*\)\s*\|/g,
      `| **Admin Authority** | Stellar Testnet | [\`${adminAddress}\`](https://stellar.expert/explorer/testnet/account/${adminAddress}) |`
    );

    fs.writeFileSync(readmePath, readmeContent, "utf8");
    console.log("✅ Updated README.md");
  }

  // 6. Update .github/workflows/test.yml
  const testWorkflowPath = path.join(rootDir, ".github", "workflows", "test.yml");
  if (fs.existsSync(testWorkflowPath)) {
    let wfContent = fs.readFileSync(testWorkflowPath, "utf8");
    wfContent = wfContent.replace(
      /NEXT_PUBLIC_REGISTRY_CONTRACT_ID:\s*[A-Z0-9]+/g,
      `NEXT_PUBLIC_REGISTRY_CONTRACT_ID: ${registryId}`
    );
    wfContent = wfContent.replace(
      /NEXT_PUBLIC_ESCROW_CONTRACT_ID:\s*[A-Z0-9]+/g,
      `NEXT_PUBLIC_ESCROW_CONTRACT_ID: ${escrowId}`
    );
    wfContent = wfContent.replace(
      /NEXT_PUBLIC_ADMIN_PUBLIC_KEY:\s*[A-Z0-9]+/g,
      `NEXT_PUBLIC_ADMIN_PUBLIC_KEY: ${adminAddress}`
    );
    fs.writeFileSync(testWorkflowPath, wfContent, "utf8");
    console.log("✅ Updated .github/workflows/test.yml");
  }

  console.log("---------------------------------------------------------");
  console.log("✨ All contract addresses successfully synced!");
  console.log("=========================================================");
}

syncContracts();
