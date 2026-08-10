import { useCallback, useEffect, useMemo, useState } from "react";
import type { Address, Hash } from "viem";

import {
  precatorioMarketplaceAbi,
  precatorioNFTAbi,
} from "../blockchain/abis";
import { getPublicClient, type ConnectedWallet } from "../blockchain/client";
import { loadProtocolEventIndex } from "../blockchain/eventIndex";
import type {
  AdminTarget,
  ContractState,
  Deployment,
  MarketplaceListing,
  MarketplaceOffer,
  PrecatorioAsset,
  ProtocolStats,
  SaleRecord,
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
  totalOffers: 0n,
  activeOffers: 0n,
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
  const [offers, setOffers] = useState<MarketplaceOffer[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [nftState, setNftState] = useState<ContractState>(EMPTY_STATE);
  const [marketplaceState, setMarketplaceState] =
    useState<ContractState>(EMPTY_STATE);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    if (!deployment) return;

    setError(undefined);

    const publicClient = getPublicClient();

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
    const activeOffers = index.offers.filter((offer) => offer.active);

    setPrecatorios(index.precatorios);
    setListings(index.listings);
    setOffers(index.offers);
    setSales(index.sales);
    setStats({
      totalMinted: BigInt(index.precatorios.length),
      totalListings: BigInt(index.listings.length),
      activeListings: BigInt(activeListings.length),
      staleListings: BigInt(staleListings.length),
      totalOffers: BigInt(index.offers.length),
      activeOffers: BigInt(activeOffers.length),
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
        await getPublicClient().waitForTransactionReceipt({ hash });

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

  const makeOffer = useCallback(
    (tokenId: bigint, amountEth: string) =>
      run("Oferta", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.precatorioMarketplace,
          abi: precatorioMarketplaceAbi,
          functionName: "makeOffer",
          args: [tokenId],
          value: toWei(amountEth),
        }),
      ),
    [deployment, run],
  );

  const cancelOffer = useCallback(
    (offerId: bigint) =>
      run("Cancelamento da oferta", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.precatorioMarketplace,
          abi: precatorioMarketplaceAbi,
          functionName: "cancelOffer",
          args: [offerId],
        }),
      ),
    [deployment, run],
  );

  const acceptOffer = useCallback(
    (offerId: bigint) =>
      run("Aceite da oferta", async ({ walletClient, account: signer }) =>
        walletClient.writeContract({
          account: signer,
          address: deployment!.contracts.precatorioMarketplace,
          abi: precatorioMarketplaceAbi,
          functionName: "acceptOffer",
          args: [offerId],
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

  const activeOffers = useMemo(
    () => offers.filter((offer) => offer.active),
    [offers],
  );

  const ownedTokenIds = useMemo(
    () => new Set(ownedPrecatorios.map((asset) => asset.tokenId.toString())),
    [ownedPrecatorios],
  );

  /** Ofertas enviadas pela carteira conectada, em qualquer precatório. */
  const myOffers = useMemo(
    () =>
      account
        ? activeOffers.filter((offer) => sameAddress(offer.buyer, account))
        : [],
    [account, activeOffers],
  );

  /** Ofertas recebidas em precatórios que a carteira conectada possui. */
  const incomingOffers = useMemo(
    () =>
      activeOffers.filter((offer) =>
        ownedTokenIds.has(offer.tokenId.toString()),
      ),
    [activeOffers, ownedTokenIds],
  );

  const isAdmin = sameAddress(account, deployment?.admin);

  return {
    stats,
    precatorios,
    ownedPrecatorios,
    listings,
    activeListings,
    offers,
    activeOffers,
    myOffers,
    incomingOffers,
    sales,
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
    makeOffer,
    cancelOffer,
    acceptOffer,
    setPaused,
    invalidate,
  };
}
