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

/** Lado de demanda do livro de ofertas: um lance em ETH de teste por um tokenId. */
export type MarketplaceOffer = {
  id: bigint;
  buyer: Address;
  tokenId: bigint;
  amount: bigint;
  createdAt: bigint;
  active: boolean;
  executable: boolean;
  unavailableReason?: string;
};

export type SaleSource = "listing" | "offer";

/** Registro unificado de venda concluída, usado no histórico de preços. */
export type SaleRecord = {
  tokenId: bigint;
  seller: Address;
  buyer: Address;
  price: bigint;
  soldAt: bigint;
  source: SaleSource;
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
  totalOffers: bigint;
  activeOffers: bigint;
  totalSales: bigint;
  lastSalePrice: bigint;
};

export type AdminTarget = "nft" | "marketplace";
