import type { Address, Hex } from "viem";

import {
  precatorioMarketplaceAbi,
  precatorioNFTAbi,
} from "./abis";
import { publicClient } from "./client";
import type {
  Deployment,
  MarketplaceListing,
  PrecatorioAsset,
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

type ClosedListingArgs = {
  listingId?: bigint;
};

function required<T>(value: T | undefined, field: string): T {
  if (value === undefined) {
    throw new Error(`Evento on-chain sem campo obrigatório: ${field}.`);
  }
  return value;
}

/**
 * Reconstitui o índice leve da PoC a partir dos eventos dos proxies.
 * Não é um indexador persistente: os logs continuam vindo diretamente do RPC.
 */
export async function loadProtocolEventIndex(
  deployment: Deployment,
): Promise<{
  precatorios: PrecatorioAsset[];
  listings: MarketplaceListing[];
}> {
  const fromBlock = BigInt(deployment.deploymentBlock ?? "0");

  const [mintLogs, listedLogs, soldLogs, cancelledLogs] = await Promise.all([
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

  const activeListingByTokenId = new Map<string, bigint>();
  for (const listing of listingsById.values()) {
    if (listing.active) {
      activeListingByTokenId.set(listing.tokenId.toString(), listing.id);
    }
  }

  const precatorios = await Promise.all(
    mintLogs.map(async (log) => {
      const args = log.args as MintEventArgs;
      const tokenId = required(args.tokenId, "tokenId");

      const owner = (await publicClient.readContract({
        address: deployment.contracts.precatorioNFT,
        abi: precatorioNFTAbi,
        functionName: "ownerOf",
        args: [tokenId],
      })) as Address;

      return {
        tokenId,
        identifier: required(args.identifier, "identifier"),
        faceValue: required(args.faceValue, "faceValue"),
        registeredAt: required(args.registeredAt, "registeredAt"),
        owner,
        activeListingId:
          activeListingByTokenId.get(tokenId.toString()) ?? 0n,
      } satisfies PrecatorioAsset;
    }),
  );

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

        const [approvedAddress, approvedForAll] = (await Promise.all([
          publicClient.readContract({
            address: deployment.contracts.precatorioNFT,
            abi: precatorioNFTAbi,
            functionName: "getApproved",
            args: [listing.tokenId],
          }),
          publicClient.readContract({
            address: deployment.contracts.precatorioNFT,
            abi: precatorioNFTAbi,
            functionName: "isApprovedForAll",
            args: [listing.seller, deployment.contracts.precatorioMarketplace],
          }),
        ])) as [Address, boolean];

        if (
          !sameAddress(
            approvedAddress,
            deployment.contracts.precatorioMarketplace,
          ) &&
          !approvedForAll
        ) {
          listing.executable = false;
          listing.unavailableReason =
            "A aprovação do marketplace foi revogada pelo vendedor.";
        }
      }),
  );

  precatorios.sort((a, b) => Number(a.tokenId - b.tokenId));
  const listings = [...listingsById.values()].sort((a, b) =>
    a.id === b.id ? 0 : a.id > b.id ? -1 : 1,
  );

  return { precatorios, listings };
}
