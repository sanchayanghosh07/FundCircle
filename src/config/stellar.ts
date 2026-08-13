export const STELLAR_NETWORKS = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    rpcUrl: process.env.NEXT_PUBLIC_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org",
    horizonUrl: process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org",
    explorerUrl: process.env.NEXT_PUBLIC_STELLAR_EXPLORER_URL || "https://stellar.expert/explorer/testnet",
    nativeAssetContract: process.env.NEXT_PUBLIC_NATIVE_ASSET_CONTRACT_ID || "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  },
  futurenet: {
    networkPassphrase: "Test SDF Future Network ; October 2022",
    rpcUrl: "https://rpc-futurenet.stellar.org",
    horizonUrl: "https://horizon-futurenet.stellar.org",
    explorerUrl: "https://stellar.expert/explorer/futurenet",
    nativeAssetContract: "CB64D3G7SM2RTH6JSGG34DDTRHQVCPI4566F53J5G4G675J6D5C7F6H3",
  },
  mainnet: {
    networkPassphrase: "Public Global Stellar Network ; September 2015",
    rpcUrl: "https://soroban-rpc.stellar.org",
    horizonUrl: "https://horizon.stellar.org",
    explorerUrl: "https://stellar.expert/explorer/public",
    nativeAssetContract: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
  },
};

export const CURRENT_NETWORK_KEY = (process.env.NEXT_PUBLIC_STELLAR_NETWORK as keyof typeof STELLAR_NETWORKS) || "testnet";
export const ACTIVE_NETWORK = STELLAR_NETWORKS[CURRENT_NETWORK_KEY];

export const CONTRACT_CONFIG = {
  registryContractId: process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ID || "CBZCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M",
  escrowContractId: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID || "CAYCR2Z4UGP5J44N64C72BMSN657XQ4F4J4B7W4UGQO676S47M4UGW5M",
  nativeAssetContractId: ACTIVE_NETWORK.nativeAssetContract,
};

export function getExplorerTxUrl(txHash?: string): string {
  if (!txHash) return ACTIVE_NETWORK.explorerUrl;
  return `${ACTIVE_NETWORK.explorerUrl}/tx/${txHash}`;
}

export function getExplorerAccountUrl(address?: string): string {
  if (!address) return ACTIVE_NETWORK.explorerUrl;
  return `${ACTIVE_NETWORK.explorerUrl}/account/${address}`;
}

export function getExplorerContractUrl(contractId?: string): string {
  if (!contractId) return ACTIVE_NETWORK.explorerUrl;
  return `${ACTIVE_NETWORK.explorerUrl}/contract/${contractId}`;
}
