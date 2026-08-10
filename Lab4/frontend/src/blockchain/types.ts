import type { Address, Hex } from "viem";

export type Deployment = {
  network: string;
  chainId: number;
  admin: Address;
  deploymentBlock?: string;
  contracts: {
    precatorioNFT: Address;
    precatorioMarketplace: Address;
  };
};

export type PrecatorioAsset = {
  tokenId: bigint;
  identifier: Hex;
  faceValue: bigint;
  registeredAt: bigint;
  owner: Address;
  activeListingId: bigint;
};

export type MarketplaceListing = {
  id: bigint;
  seller: Address;
  tokenId: bigint;
  price: bigint;
  createdAt: bigint;
  active: boolean;
  executable: boolean;
  unavailableReason?: string;
};

export type ContractState = {
  paused: boolean;
  invalidated: boolean;
};

export type ProtocolStats = {
  totalMinted: bigint;
  totalListings: bigint;
  activeListings: bigint;
  staleListings: bigint;
  totalSales: bigint;
  lastSalePrice: bigint;
};

export type AdminTarget = "nft" | "marketplace";
