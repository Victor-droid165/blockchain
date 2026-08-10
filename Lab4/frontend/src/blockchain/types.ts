import type { Address } from "viem";

export type Deployment = {
  network: string;
  chainId: number;
  issuer: Address;
  contracts: {
    monetaryOracle: Address;
    quitusToken: Address;
    debitusToken: Address;
    compensationManager: Address;
    quitusMarketplace: Address;
  };
};

export type MarketplaceOrder = {
  id: bigint;
  maker: Address;
  side: "Venda" | "Compra";
  amount: bigint;
  remaining: bigint;
  pricePerUnitWei: bigint;
  createdAt: bigint;
  active: boolean;
};

export type ProtocolStats = {
  currentIndex: bigint;
  qtsBalance: bigint;
  qtsPreviewBalance: bigint;
  totalCompensated: bigint;
  totalTrades: bigint;
  lastTradePriceWei: bigint;
};
