import { rpc, Horizon, Networks, TransactionBuilder, Account, Address, scValToNative, nativeToScVal, xdr, Contract } from "@stellar/stellar-sdk";
import { ACTIVE_NETWORK, CONTRACT_CONFIG } from "@/config/stellar";

export class StellarRpcService {
  private rpcServer: rpc.Server;
  private horizonServer: Horizon.Server;

  constructor() {
    this.rpcServer = new rpc.Server(ACTIVE_NETWORK.rpcUrl);
    this.horizonServer = new Horizon.Server(ACTIVE_NETWORK.horizonUrl);
  }

  public async getAccountBalance(publicKey: string): Promise<string> {
    try {
      const account = await this.horizonServer.loadAccount(publicKey);
      const nativeBalance = account.balances.find(
        (b) => b.asset_type === "native"
      );
      return nativeBalance ? nativeBalance.balance : "0";
    } catch {
      return "0";
    }
  }

  public async getAccount(publicKey: string): Promise<Account> {
    try {
      return await this.rpcServer.getAccount(publicKey);
    } catch {
      const horizonAcc = await this.horizonServer.loadAccount(publicKey);
      return new Account(publicKey, horizonAcc.sequence);
    }
  }

  public async simulateAndAssembleTransaction({
    callerPublicKey,
    contractId,
    method,
    args,
    fee = "100000",
  }: {
    callerPublicKey: string;
    contractId: string;
    method: string;
    args: xdr.ScVal[];
    fee?: string;
  }) {
    const account = await this.getAccount(callerPublicKey);
    const contract = new Contract(contractId);

    const callOp = contract.call(method, ...args);

    const tx = new TransactionBuilder(account, {
      fee,
      networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
    })
      .addOperation(callOp)
      .setTimeout(300)
      .build();

    const simResponse = await this.rpcServer.simulateTransaction(tx);

    if (rpc.Api.isSimulationError(simResponse)) {
      throw new Error(`Simulation failed: ${simResponse.error}`);
    }

    const assembledTx = rpc.assembleTransaction(tx, simResponse);
    return {
      assembledTx,
      txXdr: assembledTx.build().toXDR(),
      simulation: simResponse,
    };
  }

  public async submitTransaction(signedXdr: string): Promise<{
    hash: string;
    status: "SUCCESS" | "FAILED" | "PENDING";
    returnValue?: any;
    error?: string;
  }> {
    const tx = TransactionBuilder.fromXDR(
      signedXdr,
      ACTIVE_NETWORK.networkPassphrase
    );

    const sendResponse = await this.rpcServer.sendTransaction(tx);

    if (sendResponse.status === "ERROR") {
      throw new Error(`Transaction submission error: ${JSON.stringify(sendResponse.errorResult)}`);
    }

    const hash = sendResponse.hash;

    // Poll for transaction completion
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1500));
      const getTxResponse = await this.rpcServer.getTransaction(hash);

      if (getTxResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        let returnValue: any = undefined;
        if (getTxResponse.returnValue) {
          try {
            returnValue = scValToNative(getTxResponse.returnValue);
          } catch {
            returnValue = getTxResponse.returnValue;
          }
        }
        return {
          hash,
          status: "SUCCESS",
          returnValue,
        };
      }

      if (getTxResponse.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(
          `Transaction failed on ledger: ${JSON.stringify(getTxResponse.resultXdr)}`
        );
      }

      attempts++;
    }

    return {
      hash,
      status: "PENDING",
    };
  }

  public async callReadOnly({
    contractId,
    method,
    args = [],
    callerPublicKey = CONTRACT_CONFIG.adminAddress,
  }: {
    contractId: string;
    method: string;
    args?: xdr.ScVal[];
    callerPublicKey?: string;
  }): Promise<any> {
    const account = new Account(callerPublicKey, "100");
    const contract = new Contract(contractId);
    const callOp = contract.call(method, ...args);

    const tx = new TransactionBuilder(account, {
      fee: "100000",
      networkPassphrase: ACTIVE_NETWORK.networkPassphrase,
    })
      .addOperation(callOp)
      .setTimeout(300)
      .build();

    const simResponse = await this.rpcServer.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simResponse)) {
      throw new Error(`Simulation failed: ${simResponse.error}`);
    }
    if (!simResponse.result) {
      return null;
    }
    return scValToNative(simResponse.result.retval);
  }

  public async getLatestLedgerSequence(): Promise<number> {
    try {
      const info = await this.rpcServer.getLatestLedger();
      return info.sequence || 0;
    } catch {
      return 0;
    }
  }

  public async getEvents(startLedger?: number) {
    try {
      let start = startLedger;

      if (!start || start <= 0) {
        try {
          const latestSeq = await this.getLatestLedgerSequence();
          if (latestSeq > 0) {
            // Stay safely within Soroban RPC's ledger retention window (last ~5000 ledgers)
            start = Math.max(1, latestSeq - 5000);
          } else {
            start = 1;
          }
        } catch {
          start = 1;
        }
      }

      const validContractIds = [
        CONTRACT_CONFIG.registryContractId,
        CONTRACT_CONFIG.escrowContractId,
      ].filter((id) => Boolean(id && typeof id === "string" && id.startsWith("C") && id.length >= 50));

      const filters: any[] = [];
      if (validContractIds.length > 0) {
        filters.push({
          type: "contract",
          contractIds: validContractIds,
        });
      } else {
        filters.push({
          type: "contract",
        });
      }

      const response = await this.rpcServer.getEvents({
        startLedger: start,
        filters,
        limit: 100,
      });

      return response.events || [];
    } catch (err) {
      console.warn("Could not fetch on-chain events from Soroban RPC:", err);
      return [];
    }
  }
}

export const stellarRpc = new StellarRpcService();
