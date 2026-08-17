#!/usr/bin/env node

/**
 * Synchronizes deployed Soroban contract addresses across all project files:
 * - .env.local
 * - .env.example
 * - src/config/contracts.json
 * - src/config/stellar.ts
 * - README.md
 *
 * Usage:
 * node scripts/sync-contract-addresses.js <registryContractId> <escrowContractId> [adminAddress]
 */

const fs = require("fs");
const path = require("path");

function syncContracts() {
  const args = process.argv.slice(2);
  const registryId = args[0] || process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ID;
  const escrowId = args[1] || process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID;
  const adminAddress = args[2] || process.env.ADMIN_ADDRESS;

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
  if (adminAddress) {
    console.log(`Admin Address:        ${adminAddress}`);
  }
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
    fs.writeFileSync(envExamplePath, envExContent, "utf8");
    console.log("✅ Updated .env.example");
  }

  // 3. Update src/config/contracts.json
  const contractsJsonPath = path.join(rootDir, "src", "config", "contracts.json");
  const contractsData = {
    network: "testnet",
    registryContractId: registryId,
    escrowContractId: escrowId,
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
    if (adminAddress) {
      stellarTsContent = stellarTsContent.replace(
        /adminAddress:\s*"[^"]*"/g,
        `adminAddress: "${adminAddress}"`
      );
    }
    fs.writeFileSync(stellarTsPath, stellarTsContent, "utf8");
    console.log("✅ Updated src/config/stellar.ts");
  }

  // 5. Update README.md
  const readmePath = path.join(rootDir, "README.md");
  if (fs.existsSync(readmePath)) {
    let readmeContent = fs.readFileSync(readmePath, "utf8");
    readmeContent = readmeContent.replace(
      /\|\s*\*\*Campaign Registry\*\*\s*\|\s*Testnet\s*\|\s*`[^`]*`\s*\|\s*\[Inspect Registry Contract\]\(https:\/\/stellar\.expert\/explorer\/testnet\/contract\/[^)]*\)\s*\|/g,
      `| **Campaign Registry** | Testnet | \`${registryId}\` | [Inspect Registry Contract](https://stellar.expert/explorer/testnet/contract/${registryId}) |`
    );
    readmeContent = readmeContent.replace(
      /\|\s*\*\*Funding Escrow\*\*\s*\|\s*Testnet\s*\|\s*`[^`]*`\s*\|\s*\[Inspect Escrow Contract\]\(https:\/\/stellar\.expert\/explorer\/testnet\/contract\/[^)]*\)\s*\|/g,
      `| **Funding Escrow** | Testnet | \`${escrowId}\` | [Inspect Escrow Contract](https://stellar.expert/explorer/testnet/contract/${escrowId}) |`
    );
    fs.writeFileSync(readmePath, readmeContent, "utf8");
    console.log("✅ Updated README.md");
  }

  console.log("---------------------------------------------------------");
  console.log("✨ All contract addresses successfully synced!");
  console.log("=========================================================");
}

syncContracts();
