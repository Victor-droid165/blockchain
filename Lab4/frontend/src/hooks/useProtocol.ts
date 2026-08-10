import { useCallback, useEffect, useState } from "react";
import type { Address, Hash } from "viem";

import {
  compensationManagerAbi,
  debitusTokenAbi,
  marketplaceAbi,
  monetaryOracleAbi,
  quitusTokenAbi,
} from "../blockchain/abis";
import { publicClient, type ConnectedWallet } from "../blockchain/client";
import type {
  Deployment,
  MarketplaceOrder,
  ProtocolStats,
} from "../blockchain/types";
import { hashIdentifier, toInternalUnits } from "../blockchain/utils";

type ConnectWallet = () => Promise<ConnectedWallet>;

const EMPTY_STATS: ProtocolStats = {
  currentIndex: 0n,
  qtsBalance: 0n,
  qtsPreviewBalance: 0n,
  totalCompensated: 0n,
  totalTrades: 0n,
  lastTradePriceWei: 0n,
};

export function useProtocol(
  deployment: Deployment | undefined,
  account: Address | undefined,
  connect: ConnectWallet,
) {
  const [stats, setStats] = useState<ProtocolStats>(EMPTY_STATS);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!deployment) return;

    const [currentIndex, totalTrades, lastTradePriceWei, nextOrderId] = await Promise.all([
      publicClient.readContract({
        address: deployment.contracts.monetaryOracle,
        abi: monetaryOracleAbi,
        functionName: "currentIndex",
      }),
      publicClient.readContract({
        address: deployment.contracts.quitusMarketplace,
        abi: marketplaceAbi,
        functionName: "totalTrades",
      }),
      publicClient.readContract({
        address: deployment.contracts.quitusMarketplace,
        abi: marketplaceAbi,
        functionName: "lastTradePriceWei",
      }),
      publicClient.readContract({
        address: deployment.contracts.quitusMarketplace,
        abi: marketplaceAbi,
        functionName: "nextOrderId",
      }),
    ]);

    let qtsBalance = 0n;
    let qtsPreviewBalance = 0n;
    let totalCompensated = 0n;

    if (account) {
      [qtsBalance, qtsPreviewBalance, totalCompensated] = await Promise.all([
        publicClient.readContract({
          address: deployment.contracts.quitusToken,
          abi: quitusTokenAbi,
          functionName: "balanceOf",
          args: [account],
        }),
        publicClient.readContract({
          address: deployment.contracts.quitusToken,
          abi: quitusTokenAbi,
          functionName: "previewBalance",
          args: [account],
        }),
        publicClient.readContract({
          address: deployment.contracts.compensationManager,
          abi: compensationManagerAbi,
          functionName: "totalCompensatedByAccount",
          args: [account],
        }),
      ]);
    }

    setStats({
      currentIndex,
      qtsBalance,
      qtsPreviewBalance,
      totalCompensated,
      totalTrades,
      lastTradePriceWei,
    });

    const start = nextOrderId > 11n ? nextOrderId - 10n : 1n;
    const ids: bigint[] = [];
    for (let id = start; id < nextOrderId; id += 1n) ids.push(id);

    const loaded = await Promise.all(
      ids.map(async (id) => {
        const order = await publicClient.readContract({
          address: deployment.contracts.quitusMarketplace,
          abi: marketplaceAbi,
          functionName: "orders",
          args: [id],
        });

        return {
          id,
          maker: order[0],
          side: order[1] === 0 ? "Venda" : "Compra",
          amount: order[2],
          remaining: order[3],
          pricePerUnitWei: order[4],
          createdAt: order[5],
          active: order[6],
        } satisfies MarketplaceOrder;
      }),
    );

    setOrders(loaded.reverse());
  }, [account, deployment]);

  useEffect(() => {
    refresh().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Falha ao consultar contratos.");
    });
  }, [refresh]);

  const run = useCallback(
    async (label: string, action: (wallet: ConnectedWallet) => Promise<Hash>) => {
      if (!deployment) throw new Error("Deployment ainda não está disponível.");

      setLoading(true);
      setError(undefined);
      setStatus(`${label}: aguardando assinatura…`);

      try {
        const wallet = await connect();
        const hash = await action(wallet);
        setStatus(`${label}: aguardando confirmação…`);
        await publicClient.waitForTransactionReceipt({ hash });
        setStatus(`${label}: transação confirmada.`);
        await refresh();
        return hash;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Transação falhou.";
        setError(message);
        setStatus(undefined);
        throw cause;
      } finally {
        setLoading(false);
      }
    },
    [connect, deployment, refresh],
  );

  const tokenizePrecatorio = useCallback(
    (identifier: string, beneficiary: Address, value: string) =>
      run("Tokenização", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.quitusToken,
          abi: quitusTokenAbi,
          functionName: "tokenizePrecatorio",
          args: [hashIdentifier(identifier), beneficiary, toInternalUnits(value)],
        }),
      ),
    [deployment, run],
  );

  const updateIndex = useCallback(
    (newIndex: bigint) =>
      run("Atualização do índice", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.monetaryOracle,
          abi: monetaryOracleAbi,
          functionName: "updateIndex",
          args: [newIndex],
        }),
      ),
    [deployment, run],
  );

  const syncBalance = useCallback(
    (target: Address) =>
      run("Sincronização QTS", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.quitusToken,
          abi: quitusTokenAbi,
          functionName: "syncBalance",
          args: [target],
        }),
      ),
    [deployment, run],
  );

  const registerFiscalDebt = useCallback(
    (identifier: string, debtor: Address, value: string) =>
      run("Registro da obrigação", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.debitusToken,
          abi: debitusTokenAbi,
          functionName: "registerFiscalDebt",
          args: [hashIdentifier(identifier), debtor, toInternalUnits(value)],
        }),
      ),
    [deployment, run],
  );

  const getFiscalDebt = useCallback(
    async (identifier: string) => {
      if (!deployment) throw new Error("Deployment ainda não está disponível.");
      return publicClient.readContract({
        address: deployment.contracts.debitusToken,
        abi: debitusTokenAbi,
        functionName: "fiscalDebts",
        args: [hashIdentifier(identifier)],
      });
    },
    [deployment],
  );

  const compensate = useCallback(
    (reference: string, debtIdentifier: string, value: string) =>
      run("Compensação", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.compensationManager,
          abi: compensationManagerAbi,
          functionName: "compensate",
          args: [
            hashIdentifier(reference),
            hashIdentifier(debtIdentifier),
            toInternalUnits(value),
          ],
        }),
      ),
    [deployment, run],
  );

  const approveMarketplace = useCallback(
    (value: string) =>
      run("Aprovação do marketplace", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.quitusToken,
          abi: quitusTokenAbi,
          functionName: "approve",
          args: [deployment!.contracts.quitusMarketplace, toInternalUnits(value)],
        }),
      ),
    [deployment, run],
  );

  const createSellOrder = useCallback(
    (value: string, pricePerUnitWei: bigint) =>
      run("Criação da oferta de venda", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.quitusMarketplace,
          abi: marketplaceAbi,
          functionName: "createSellOrder",
          args: [toInternalUnits(value), pricePerUnitWei],
        }),
      ),
    [deployment, run],
  );

  const createBuyOrder = useCallback(
    (value: string, pricePerUnitWei: bigint) => {
      const amount = toInternalUnits(value);
      return run("Criação da oferta de compra", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.quitusMarketplace,
          abi: marketplaceAbi,
          functionName: "createBuyOrder",
          args: [amount, pricePerUnitWei],
          value: amount * pricePerUnitWei,
        }),
      );
    },
    [deployment, run],
  );

  const fillOrder = useCallback(
    (order: MarketplaceOrder, value: string) => {
      const amount = toInternalUnits(value);
      const isSell = order.side === "Venda";

      return run("Execução da ordem", async ({ walletClient, account: signer }) => {
        if (isSell) {
          return walletClient.writeContract({
            account: signer,
            address: deployment!.contracts.quitusMarketplace,
            abi: marketplaceAbi,
            functionName: "fillSellOrder",
            args: [order.id, amount],
            value: amount * order.pricePerUnitWei,
          });
        }

        return walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.quitusMarketplace,
          abi: marketplaceAbi,
          functionName: "fillBuyOrder",
          args: [order.id, amount],
        });
      });
    },
    [deployment, run],
  );

  const cancelOrder = useCallback(
    (orderId: bigint) =>
      run("Cancelamento da ordem", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.quitusMarketplace,
          abi: marketplaceAbi,
          functionName: "cancelOrder",
          args: [orderId],
        }),
      ),
    [deployment, run],
  );

  return {
    stats,
    orders,
    loading,
    status,
    error,
    refresh,
    tokenizePrecatorio,
    updateIndex,
    syncBalance,
    registerFiscalDebt,
    getFiscalDebt,
    compensate,
    approveMarketplace,
    createSellOrder,
    createBuyOrder,
    fillOrder,
    cancelOrder,
  };
}
