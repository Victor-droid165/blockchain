import { useCallback, useEffect, useState } from "react";
import type { Address, Hash } from "viem";

import { compensationManagerAbi, monetaryOracleAbi } from "../blockchain/abis";
import { getPublicClient, type ConnectedWallet } from "../blockchain/client";
import { toFriendlyError } from "../blockchain/errors";
import { loadCompensationEventIndex } from "../blockchain/eventIndex";
import type {
  CompensationRecord,
  ContractState,
  Deployment,
  FiscalDebt,
  OracleAdminTarget,
  OracleInfo,
} from "../blockchain/types";
import { hashIdentifier, sameAddress, toCents, toIndex } from "../blockchain/utils";

type ConnectWallet = () => Promise<ConnectedWallet>;

const EMPTY_ORACLE_INFO: OracleInfo = {
  currentIndex: 1_000_000_000_000_000_000n,
  lastUpdateAt: 0n,
  totalUpdates: 0n,
};

const EMPTY_STATE: ContractState = {
  paused: false,
  invalidated: false,
};

/**
 * Espelha `usePrecatorioProtocol`, mas para os dois contratos reintroduzidos
 * depois da simplificação inicial: MonetaryOracle e CompensationManager.
 * Ambos os endereços são opcionais no deployment — deploys anteriores à
 * reintrodução não os possuem, e o hook degrada graciosamente nesse caso.
 */
export function useCompensationProtocol(
  deployment: Deployment | undefined,
  account: Address | undefined,
  connect: ConnectWallet,
) {
  const [oracleInfo, setOracleInfo] = useState<OracleInfo>(EMPTY_ORACLE_INFO);
  const [oracleState, setOracleState] = useState<ContractState>(EMPTY_STATE);
  const [compensationState, setCompensationState] =
    useState<ContractState>(EMPTY_STATE);
  const [debts, setDebts] = useState<FiscalDebt[]>([]);
  const [compensations, setCompensations] = useState<CompensationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();

  const available = Boolean(
    deployment?.contracts.monetaryOracle &&
      deployment?.contracts.compensationManager,
  );

  const refresh = useCallback(async () => {
    if (!deployment) return;
    const { monetaryOracle, compensationManager } = deployment.contracts;
    if (!monetaryOracle || !compensationManager) return;

    setError(undefined);

    const publicClient = getPublicClient();

    const [
      currentIndex,
      lastUpdateAt,
      totalUpdates,
      oraclePaused,
      oracleInvalidated,
      compensationPaused,
      compensationInvalidated,
      index,
    ] = await Promise.all([
      publicClient.readContract({
        address: monetaryOracle,
        abi: monetaryOracleAbi,
        functionName: "currentIndex",
      }),
      publicClient.readContract({
        address: monetaryOracle,
        abi: monetaryOracleAbi,
        functionName: "lastUpdateAt",
      }),
      publicClient.readContract({
        address: monetaryOracle,
        abi: monetaryOracleAbi,
        functionName: "totalUpdates",
      }),
      publicClient.readContract({
        address: monetaryOracle,
        abi: monetaryOracleAbi,
        functionName: "paused",
      }),
      publicClient.readContract({
        address: monetaryOracle,
        abi: monetaryOracleAbi,
        functionName: "invalidated",
      }),
      publicClient.readContract({
        address: compensationManager,
        abi: compensationManagerAbi,
        functionName: "paused",
      }),
      publicClient.readContract({
        address: compensationManager,
        abi: compensationManagerAbi,
        functionName: "invalidated",
      }),
      loadCompensationEventIndex(deployment),
    ]);

    setOracleInfo({ currentIndex, lastUpdateAt, totalUpdates });
    setOracleState({ paused: oraclePaused, invalidated: oracleInvalidated });
    setCompensationState({
      paused: compensationPaused,
      invalidated: compensationInvalidated,
    });
    setDebts(index.debts);
    setCompensations(index.compensations);
  }, [deployment]);

  useEffect(() => {
    refresh().catch((cause: unknown) => {
      setError(toFriendlyError(cause, deployment));
    });
  }, [refresh, deployment]);

  const run = useCallback(
    async (
      label: string,
      action: (wallet: ConnectedWallet) => Promise<Hash>,
    ) => {
      if (!deployment?.contracts.monetaryOracle || !deployment?.contracts.compensationManager) {
        throw new Error("Oráculo e compensação ainda não foram implantados.");
      }

      setLoading(true);
      setError(undefined);
      setStatus(`${label}: aguardando assinatura…`);

      try {
        const wallet = await connect();
        const hash = await action(wallet);

        setStatus(`${label}: aguardando confirmação…`);
        await getPublicClient().waitForTransactionReceipt({ hash });

        setStatus(`${label}: transação confirmada.`);
        await refresh();

        return hash;
      } catch (cause) {
        setError(toFriendlyError(cause, deployment));
        setStatus(undefined);
        throw cause;
      } finally {
        setLoading(false);
      }
    },
    [connect, deployment, refresh],
  );

  const updateIndex = useCallback(
    (newIndex: string) =>
      run("Publicação do índice", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.monetaryOracle!,
          abi: monetaryOracleAbi,
          functionName: "updateIndex",
          args: [toIndex(newIndex)],
        }),
      ),
    [deployment, run],
  );

  const registerDebt = useCallback(
    (identifier: string, debtor: Address, amountReais: string) =>
      run("Registro de débito fiscal", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.compensationManager!,
          abi: compensationManagerAbi,
          functionName: "registerDebt",
          args: [hashIdentifier(identifier), debtor, toCents(amountReais)],
        }),
      ),
    [deployment, run],
  );

  const compensate = useCallback(
    (tokenId: bigint, debtId: bigint) =>
      run("Compensação atômica", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.compensationManager!,
          abi: compensationManagerAbi,
          functionName: "compensate",
          args: [tokenId, debtId],
        }),
      ),
    [deployment, run],
  );

  const setPaused = useCallback(
    (target: OracleAdminTarget, paused: boolean) =>
      run(
        paused ? "Pausa administrativa" : "Retomada administrativa",
        async ({ walletClient, account: signer }) => {
          const address =
            target === "oracle"
              ? deployment!.contracts.monetaryOracle!
              : deployment!.contracts.compensationManager!;
          const abi =
            target === "oracle" ? monetaryOracleAbi : compensationManagerAbi;

          return walletClient.writeContract({
            account: signer,
            address,
            abi,
            functionName: paused ? "pause" : "unpause",
          });
        },
      ),
    [deployment, run],
  );

  const invalidate = useCallback(
    (target: OracleAdminTarget) =>
      run("Invalidação permanente", async ({ walletClient, account: signer }) => {
        const address =
          target === "oracle"
            ? deployment!.contracts.monetaryOracle!
            : deployment!.contracts.compensationManager!;
        const abi =
          target === "oracle" ? monetaryOracleAbi : compensationManagerAbi;

        return walletClient.writeContract({
          account: signer,
          address,
          abi,
          functionName: "invalidate",
        });
      }),
    [deployment, run],
  );

  const myDebts = account
    ? debts.filter(
        (debt) => sameAddress(debt.debtor, account) && debt.outstanding > 0n,
      )
    : [];

  const isAdmin = sameAddress(account, deployment?.admin);

  return {
    available,
    oracleInfo,
    oracleState,
    compensationState,
    debts,
    myDebts,
    compensations,
    isAdmin,
    loading,
    status,
    error,
    refresh,
    updateIndex,
    registerDebt,
    compensate,
    setPaused,
    invalidate,
  };
}
