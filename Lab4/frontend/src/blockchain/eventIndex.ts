import type { Address, Hex } from "viem";

import {
  compensationManagerAbi,
  precatorioMarketplaceAbi,
  precatorioNFTAbi,
} from "./abis";
import { getPublicClient } from "./client";
import type {
  CompensationRecord,
  Deployment,
  FiscalDebt,
  MarketplaceListing,
  MarketplaceOffer,
  PrecatorioAsset,
  SaleRecord,
} from "./types";
import { sameAddress } from "./utils";

type MintEventArgs = {
  tokenId?: bigint;
  identifier?: Hex;
  owner?: Address;
  faceValue?: bigint;
  registeredAt?: bigint;
};

type ListedEventArgs = {
  listingId?: bigint;
  tokenId?: bigint;
  seller?: Address;
  price?: bigint;
  createdAt?: bigint;
};

type SoldEventArgs = {
  listingId?: bigint;
  tokenId?: bigint;
  seller?: Address;
  buyer?: Address;
  price?: bigint;
  soldAt?: bigint;
};

type ClosedListingArgs = {
  listingId?: bigint;
};

type OfferMadeArgs = {
  offerId?: bigint;
  tokenId?: bigint;
  buyer?: Address;
  amount?: bigint;
  createdAt?: bigint;
};

type ClosedOfferArgs = {
  offerId?: bigint;
};

type OfferAcceptedArgs = {
  offerId?: bigint;
  tokenId?: bigint;
  seller?: Address;
  buyer?: Address;
  amount?: bigint;
  acceptedAt?: bigint;
};

type FiscalDebtRegisteredArgs = {
  debtId?: bigint;
  identifier?: Hex;
  debtor?: Address;
  amount?: bigint;
  registeredAt?: bigint;
};

type CompensationExecutedArgs = {
  compensationId?: bigint;
  tokenId?: bigint;
  debtId?: bigint;
  creditor?: Address;
  faceValue?: bigint;
  adjustedValue?: bigint;
  executedAt?: bigint;
};

function required<T>(value: T | undefined, field: string): T {
  if (value === undefined) {
    throw new Error(`Evento on-chain sem campo obrigatório: ${field}.`);
  }
  return value;
}

async function isMarketplaceApproved(
  deployment: Deployment,
  tokenId: bigint,
  owner: Address,
): Promise<boolean> {
  const publicClient = getPublicClient();
  const [approvedAddress, approvedForAll] = (await Promise.all([
    publicClient.readContract({
      address: deployment.contracts.precatorioNFT,
      abi: precatorioNFTAbi,
      functionName: "getApproved",
      args: [tokenId],
    }),
    publicClient.readContract({
      address: deployment.contracts.precatorioNFT,
      abi: precatorioNFTAbi,
      functionName: "isApprovedForAll",
      args: [owner, deployment.contracts.precatorioMarketplace],
    }),
  ])) as [Address, boolean];

  return (
    sameAddress(approvedAddress, deployment.contracts.precatorioMarketplace) ||
    approvedForAll
  );
}

/**
 * Reconstitui o índice leve da PoC a partir dos eventos dos proxies.
 * Não é um indexador persistente: os logs continuam vindo diretamente do RPC.
 *
 * Cobre os dois lados do mercado secundário — listagens a preço fixo
 * (oferta do vendedor) e lances em ETH de teste (demanda do comprador,
 * `makeOffer`/`acceptOffer`/`cancelOffer`) — e unifica as vendas concluídas
 * de ambos os fluxos em `sales`, usado como histórico de preços.
 */
export async function loadProtocolEventIndex(
  deployment: Deployment,
): Promise<{
  precatorios: PrecatorioAsset[];
  listings: MarketplaceListing[];
  offers: MarketplaceOffer[];
  sales: SaleRecord[];
}> {
  const publicClient = getPublicClient();
  const fromBlock = BigInt(deployment.deploymentBlock ?? "0");

  const [
    mintLogs,
    listedLogs,
    soldLogs,
    cancelledLogs,
    offerMadeLogs,
    offerCancelledLogs,
    offerAcceptedLogs,
  ] = await Promise.all([
    publicClient.getContractEvents({
      address: deployment.contracts.precatorioNFT,
      abi: precatorioNFTAbi,
      eventName: "PrecatorioMinted",
      fromBlock,
      toBlock: "latest",
    }),
    publicClient.getContractEvents({
      address: deployment.contracts.precatorioMarketplace,
      abi: precatorioMarketplaceAbi,
      eventName: "PrecatorioListed",
      fromBlock,
      toBlock: "latest",
    }),
    publicClient.getContractEvents({
      address: deployment.contracts.precatorioMarketplace,
      abi: precatorioMarketplaceAbi,
      eventName: "PrecatorioSold",
      fromBlock,
      toBlock: "latest",
    }),
    publicClient.getContractEvents({
      address: deployment.contracts.precatorioMarketplace,
      abi: precatorioMarketplaceAbi,
      eventName: "ListingCancelled",
      fromBlock,
      toBlock: "latest",
    }),
    publicClient.getContractEvents({
      address: deployment.contracts.precatorioMarketplace,
      abi: precatorioMarketplaceAbi,
      eventName: "OfferMade",
      fromBlock,
      toBlock: "latest",
    }),
    publicClient.getContractEvents({
      address: deployment.contracts.precatorioMarketplace,
      abi: precatorioMarketplaceAbi,
      eventName: "OfferCancelled",
      fromBlock,
      toBlock: "latest",
    }),
    publicClient.getContractEvents({
      address: deployment.contracts.precatorioMarketplace,
      abi: precatorioMarketplaceAbi,
      eventName: "OfferAccepted",
      fromBlock,
      toBlock: "latest",
    }),
  ]);

  const listingsById = new Map<string, MarketplaceListing>();

  for (const log of listedLogs) {
    const args = log.args as ListedEventArgs;
    const id = required(args.listingId, "listingId");

    listingsById.set(id.toString(), {
      id,
      seller: required(args.seller, "seller"),
      tokenId: required(args.tokenId, "tokenId"),
      price: required(args.price, "price"),
      createdAt: required(args.createdAt, "createdAt"),
      active: true,
      executable: true,
    });
  }

  for (const log of [...soldLogs, ...cancelledLogs]) {
    const args = log.args as ClosedListingArgs;
    const id = required(args.listingId, "listingId");
    const listing = listingsById.get(id.toString());
    if (listing) listing.active = false;
  }

  const offersById = new Map<string, MarketplaceOffer>();

  for (const log of offerMadeLogs) {
    const args = log.args as OfferMadeArgs;
    const id = required(args.offerId, "offerId");

    offersById.set(id.toString(), {
      id,
      buyer: required(args.buyer, "buyer"),
      tokenId: required(args.tokenId, "tokenId"),
      amount: required(args.amount, "amount"),
      createdAt: required(args.createdAt, "createdAt"),
      active: true,
      executable: true,
    });
  }

  for (const log of offerCancelledLogs) {
    const args = log.args as ClosedOfferArgs;
    const id = required(args.offerId, "offerId");
    const offer = offersById.get(id.toString());
    if (offer) offer.active = false;
  }

  for (const log of offerAcceptedLogs) {
    const args = log.args as ClosedOfferArgs;
    const id = required(args.offerId, "offerId");
    const offer = offersById.get(id.toString());
    if (offer) offer.active = false;
  }

  const activeListingByTokenId = new Map<string, bigint>();
  for (const listing of listingsById.values()) {
    if (listing.active) {
      activeListingByTokenId.set(listing.tokenId.toString(), listing.id);
    }
  }

  const precatorios = (
    await Promise.all(
      mintLogs.map(async (log) => {
        const args = log.args as MintEventArgs;
        const tokenId = required(args.tokenId, "tokenId");

        let owner: Address;

        try {
          owner = (await publicClient.readContract({
            address: deployment.contracts.precatorioNFT,
            abi: precatorioNFTAbi,
            functionName: "ownerOf",
            args: [tokenId],
          })) as Address;
        } catch {
          // NFT queimado pela compensação atômica: sai do índice de ativos
          // vigentes. O histórico permanece nos eventos on-chain.
          return undefined;
        }

        return {
          tokenId,
          identifier: required(args.identifier, "identifier"),
          faceValue: required(args.faceValue, "faceValue"),
          registeredAt: required(args.registeredAt, "registeredAt"),
          owner,
          activeListingId:
            activeListingByTokenId.get(tokenId.toString()) ?? 0n,
          marketplaceApproved: await isMarketplaceApproved(
            deployment,
            tokenId,
            owner,
          ),
        } satisfies PrecatorioAsset;
      }),
    )
  ).filter((asset): asset is PrecatorioAsset => asset !== undefined);

  const ownerByTokenId = new Map<string, Address>(
    precatorios.map((asset) => [asset.tokenId.toString(), asset.owner]),
  );

  await Promise.all(
    [...listingsById.values()]
      .filter((listing) => listing.active)
      .map(async (listing) => {
        const owner = ownerByTokenId.get(listing.tokenId.toString());

        if (!owner || !sameAddress(owner, listing.seller)) {
          listing.executable = false;
          listing.unavailableReason =
            "O vendedor não é mais o proprietário deste NFT.";
          return;
        }

        if (
          !(await isMarketplaceApproved(
            deployment,
            listing.tokenId,
            listing.seller,
          ))
        ) {
          listing.executable = false;
          listing.unavailableReason =
            "A aprovação do marketplace foi revogada pelo vendedor.";
        }
      }),
  );

  // Quem aceita é o proprietário atual, desde que ele não seja o próprio
  // comprador da oferta e tenha aprovado o marketplace. Isso evita registrar
  // uma venda artificial quando o comprador recebeu o NFT por outro fluxo.
  await Promise.all(
    [...offersById.values()]
      .filter((offer) => offer.active)
      .map(async (offer) => {
        const owner = ownerByTokenId.get(offer.tokenId.toString());

        if (!owner) {
          offer.executable = false;
          offer.unavailableReason = "Precatório não encontrado.";
          return;
        }

        if (sameAddress(owner, offer.buyer)) {
          offer.executable = false;
          offer.unavailableReason =
            "O comprador já é o proprietário; cancele a oferta para recuperar o ETH.";
          return;
        }

        if (!(await isMarketplaceApproved(deployment, offer.tokenId, owner))) {
          offer.executable = false;
          offer.unavailableReason =
            "O proprietário atual ainda não aprovou o marketplace.";
        }
      }),
  );

  const sales: SaleRecord[] = [
    ...soldLogs.map((log) => {
      const args = log.args as SoldEventArgs;
      return {
        tokenId: required(args.tokenId, "tokenId"),
        seller: required(args.seller, "seller"),
        buyer: required(args.buyer, "buyer"),
        price: required(args.price, "price"),
        soldAt: required(args.soldAt, "soldAt"),
        source: "listing" as const,
      };
    }),
    ...offerAcceptedLogs.map((log) => {
      const args = log.args as OfferAcceptedArgs;
      return {
        tokenId: required(args.tokenId, "tokenId"),
        seller: required(args.seller, "seller"),
        buyer: required(args.buyer, "buyer"),
        price: required(args.amount, "amount"),
        soldAt: required(args.acceptedAt, "acceptedAt"),
        source: "offer" as const,
      };
    }),
  ].sort((a, b) => (a.soldAt === b.soldAt ? 0 : a.soldAt > b.soldAt ? -1 : 1));

  precatorios.sort((a, b) => Number(a.tokenId - b.tokenId));

  const listings = [...listingsById.values()].sort((a, b) =>
    a.id === b.id ? 0 : a.id > b.id ? -1 : 1,
  );

  const offers = [...offersById.values()].sort((a, b) =>
    a.id === b.id ? 0 : a.id > b.id ? -1 : 1,
  );

  return { precatorios, listings, offers, sales };
}

/**
 * Reconstitui débitos fiscais mock e compensações executadas a partir dos
 * eventos do CompensationManager. `outstanding` é relido on-chain para cada
 * débito, já que `compensate` o reduz depois do registro inicial.
 *
 * Retorna listas vazias quando o deployment ainda não possui
 * `compensationManager` (deploys anteriores à reintrodução do oráculo).
 */
export async function loadCompensationEventIndex(
  deployment: Deployment,
): Promise<{ debts: FiscalDebt[]; compensations: CompensationRecord[] }> {
  const compensationManager = deployment.contracts.compensationManager;
  if (!compensationManager) {
    return { debts: [], compensations: [] };
  }

  const publicClient = getPublicClient();
  const fromBlock = BigInt(deployment.deploymentBlock ?? "0");

  const [registeredLogs, executedLogs] = await Promise.all([
    publicClient.getContractEvents({
      address: compensationManager,
      abi: compensationManagerAbi,
      eventName: "FiscalDebtRegistered",
      fromBlock,
      toBlock: "latest",
    }),
    publicClient.getContractEvents({
      address: compensationManager,
      abi: compensationManagerAbi,
      eventName: "CompensationExecuted",
      fromBlock,
      toBlock: "latest",
    }),
  ]);

  const debts = await Promise.all(
    registeredLogs.map(async (log) => {
      const args = log.args as FiscalDebtRegisteredArgs;
      const id = required(args.debtId, "debtId");

      const [, , , outstanding] = (await publicClient.readContract({
        address: compensationManager,
        abi: compensationManagerAbi,
        functionName: "debts",
        args: [id],
      })) as [Hex, Address, bigint, bigint, bigint];

      return {
        id,
        identifier: required(args.identifier, "identifier"),
        debtor: required(args.debtor, "debtor"),
        originalAmount: required(args.amount, "amount"),
        outstanding,
        registeredAt: required(args.registeredAt, "registeredAt"),
      } satisfies FiscalDebt;
    }),
  );

  const compensations: CompensationRecord[] = executedLogs.map((log) => {
    const args = log.args as CompensationExecutedArgs;
    return {
      id: required(args.compensationId, "compensationId"),
      tokenId: required(args.tokenId, "tokenId"),
      debtId: required(args.debtId, "debtId"),
      creditor: required(args.creditor, "creditor"),
      faceValue: required(args.faceValue, "faceValue"),
      adjustedValue: required(args.adjustedValue, "adjustedValue"),
      executedAt: required(args.executedAt, "executedAt"),
    };
  });

  debts.sort((a, b) => (a.id === b.id ? 0 : a.id > b.id ? -1 : 1));
  compensations.sort((a, b) =>
    a.executedAt === b.executedAt ? 0 : a.executedAt > b.executedAt ? -1 : 1,
  );

  return { debts, compensations };
}
