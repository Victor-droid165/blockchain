import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address, Hash } from "viem";

import {
  precatorioMarketplaceAbi,
  precatorioNFTAbi,
} from "../blockchain/abis";
import { publicClient, type ConnectedWallet } from "../blockchain/client";
import { loadProtocolEventIndex } from "../blockchain/eventIndex";
import type {
  AdminTarget,
  ContractState,
  Deployment,
  MarketplaceListing,
  PrecatorioAsset,
  ProtocolStats,
} from "../blockchain/types";
import {
  hashIdentifier,
  sameAddress,
  toCents,
  toWei,
} from "../blockchain/utils";

type ConnectWallet = () => Promise<ConnectedWallet>;

const EMPTY_STATS: ProtocolStats = {
  totalMinted: 0n,
  totalListings: 0n,
  activeListings: 0n,
  staleListings: 0n,
  totalSales: 0n,
  lastSalePrice: 0n,
};

const EMPTY_STATE: ContractState = {
  paused: false,
  invalidated: false,
};

export function usePrecatorioProtocol(
  deployment: Deployment | undefined,
  account: Address | undefined,
  connect: ConnectWallet,
) {
  const [stats, setStats] = useState<ProtocolStats>(EMPTY_STATS);
  const [precatorios, setPrecatorios] = useState<PrecatorioAsset[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [nftState, setNftState] = useState<ContractState>(EMPTY_STATE);
  const [marketplaceState, setMarketplaceState] =
    useState<ContractState>(EMPTY_STATE);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!deployment) return;

    setError(undefined);

    const [
      index,
      totalSales,
      lastSalePrice,
      nftPaused,
      nftInvalidated,
      marketplacePaused,
      marketplaceInvalidated,
    ] = await Promise.all([
      loadProtocolEventIndex(deployment),
      publicClient.readContract({
        address: deployment.contracts.precatorioMarketplace,
        abi: precatorioMarketplaceAbi,
        functionName: "totalSales",
      }),
      publicClient.readContract({
        address: deployment.contracts.precatorioMarketplace,
        abi: precatorioMarketplaceAbi,
        functionName: "lastSalePrice",
      }),
      publicClient.readContract({
        address: deployment.contracts.precatorioNFT,
        abi: precatorioNFTAbi,
        functionName: "paused",
      }),
      publicClient.readContract({
        address: deployment.contracts.precatorioNFT,
        abi: precatorioNFTAbi,
        functionName: "invalidated",
      }),
      publicClient.readContract({
        address: deployment.contracts.precatorioMarketplace,
        abi: precatorioMarketplaceAbi,
        functionName: "paused",
      }),
      publicClient.readContract({
        address: deployment.contracts.precatorioMarketplace,
        abi: precatorioMarketplaceAbi,
        functionName: "invalidated",
      }),
    ]);

    const activeListings = index.listings.filter((listing) => listing.active);
    const staleListings = activeListings.filter(
      (listing) => !listing.executable,
    );

    setPrecatorios(index.precatorios);
    setListings(index.listings);
    setStats({
      totalMinted: BigInt(index.precatorios.length),
      totalListings: BigInt(index.listings.length),
      activeListings: BigInt(activeListings.length),
      staleListings: BigInt(staleListings.length),
      totalSales,
      lastSalePrice,
    });
    setNftState({
      paused: nftPaused,
      invalidated: nftInvalidated,
    });
    setMarketplaceState({
      paused: marketplacePaused,
      invalidated: marketplaceInvalidated,
    });
  }, [deployment]);

  useEffect(() => {
    refresh().catch((cause: unknown) => {
      setError(
        cause instanceof Error
          ? cause.message
          : "Falha ao consultar os contratos.",
      );
    });
  }, [refresh]);

  const run = useCallback(
    async (
      label: string,
      action: (wallet: ConnectedWallet) => Promise<Hash>,
    ) => {
      if (!deployment) {
        throw new Error("Deployment ainda não está disponível.");
      }

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
        const message =
          cause instanceof Error ? cause.message : "Transação falhou.";
        setError(message);
        setStatus(undefined);
        throw cause;
      } finally {
        setLoading(false);
      }
    },
    [connect, deployment, refresh],
  );

  const mintPrecatorio = useCallback(
    (identifier: string, beneficiary: Address, value: string) =>
      run("Emissão do NFT", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.precatorioNFT,
          abi: precatorioNFTAbi,
          functionName: "mintPrecatorio",
          args: [
            beneficiary,
            hashIdentifier(identifier),
            toCents(value),
          ],
        }),
      ),
    [deployment, run],
  );

  const approveMarketplace = useCallback(
    (tokenId: bigint) =>
      run("Aprovação do marketplace", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.precatorioNFT,
          abi: precatorioNFTAbi,
          functionName: "approve",
          args: [deployment!.contracts.precatorioMarketplace, tokenId],
        }),
      ),
    [deployment, run],
  );

  const listPrecatorio = useCallback(
    (tokenId: bigint, priceEth: string) =>
      run("Listagem", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.precatorioMarketplace,
          abi: precatorioMarketplaceAbi,
          functionName: "list",
          args: [tokenId, toWei(priceEth)],
        }),
      ),
    [deployment, run],
  );

  const buyListing = useCallback(
    (listing: MarketplaceListing) =>
      run("Compra", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.precatorioMarketplace,
          abi: precatorioMarketplaceAbi,
          functionName: "buy",
          args: [listing.id],
          value: listing.price,
        }),
      ),
    [deployment, run],
  );

  const cancelListing = useCallback(
    (listingId: bigint) =>
      run("Cancelamento da listagem", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.precatorioMarketplace,
          abi: precatorioMarketplaceAbi,
          functionName: "cancel",
          args: [listingId],
        }),
      ),
    [deployment, run],
  );

  const setPaused = useCallback(
    (target: AdminTarget, paused: boolean) =>
      run(
        paused ? "Pausa administrativa" : "Retomada administrativa",
        async ({ walletClient, account: signer }) => {
          if (target === "nft") {
            if (paused) {
              return walletClient.writeContract({
                account: signer,
                address: deployment!.contracts.precatorioNFT,
                abi: precatorioNFTAbi,
                functionName: "pause",
              });
            }

            return walletClient.writeContract({
              account: signer,
              address: deployment!.contracts.precatorioNFT,
              abi: precatorioNFTAbi,
              functionName: "unpause",
            });
          }

          if (paused) {
            return walletClient.writeContract({
              account: signer,
              address: deployment!.contracts.precatorioMarketplace,
              abi: precatorioMarketplaceAbi,
              functionName: "pause",
            });
          }

          return walletClient.writeContract({
            account: signer,
            address: deployment!.contracts.precatorioMarketplace,
            abi: precatorioMarketplaceAbi,
            functionName: "unpause",
          });
        },
      ),
    [deployment, run],
  );

  const invalidate = useCallback(
    (target: AdminTarget) =>
      run("Invalidação permanente", async ({ walletClient, account: signer }) => {
        if (target === "nft") {
          return walletClient.writeContract({
            account: signer,
            address: deployment!.contracts.precatorioNFT,
            abi: precatorioNFTAbi,
            functionName: "invalidate",
          });
        }

        return walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.precatorioMarketplace,
          abi: precatorioMarketplaceAbi,
          functionName: "invalidate",
        });
      }),
    [deployment, run],
  );

  const ownedPrecatorios = useMemo(
    () =>
      account
        ? precatorios.filter((item) => sameAddress(item.owner, account))
        : [],
    [account, precatorios],
  );

  const activeListings = useMemo(
    () => listings.filter((listing) => listing.active),
    [listings],
  );

  const isAdmin = sameAddress(account, deployment?.admin);

  return {
    stats,
    precatorios,
    ownedPrecatorios,
    listings,
    activeListings,
    nftState,
    marketplaceState,
    isAdmin,
    loading,
    status,
    error,
    refresh,
    mintPrecatorio,
    approveMarketplace,
    listPrecatorio,
    buyListing,
    cancelListing,
    setPaused,
    invalidate,
  };
}
