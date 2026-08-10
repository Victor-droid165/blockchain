export const monetaryOracleAbi = [
  {
    type: "function",
    name: "currentIndex",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "updateIndex",
    stateMutability: "nonpayable",
    inputs: [{ name: "newIndex", type: "uint256" }],
    outputs: [],
  },
] as const;

export const quitusTokenAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "previewBalance",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "syncBalance",
    stateMutability: "nonpayable",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "tokenizePrecatorio",
    stateMutability: "nonpayable",
    inputs: [
      { name: "precatorioIdHash", type: "bytes32" },
      { name: "beneficiary", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const debitusTokenAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "registerFiscalDebt",
    stateMutability: "nonpayable",
    inputs: [
      { name: "fiscalDebtIdHash", type: "bytes32" },
      { name: "debtor", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "fiscalDebts",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [
      { name: "debtor", type: "address" },
      { name: "originalAmount", type: "uint256" },
      { name: "remainingAmount", type: "uint256" },
      { name: "registeredAt", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
] as const;

export const compensationManagerAbi = [
  {
    type: "function",
    name: "compensate",
    stateMutability: "nonpayable",
    inputs: [
      { name: "referenceId", type: "bytes32" },
      { name: "fiscalDebtIdHash", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "totalCompensatedByAccount",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const marketplaceAbi = [
  {
    type: "function",
    name: "nextOrderId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalTrades",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "lastTradePriceWei",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "orders",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "maker", type: "address" },
      { name: "side", type: "uint8" },
      { name: "amount", type: "uint256" },
      { name: "remaining", type: "uint256" },
      { name: "pricePerUnitWei", type: "uint256" },
      { name: "createdAt", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "createSellOrder",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "pricePerUnitWei", type: "uint256" },
    ],
    outputs: [{ name: "orderId", type: "uint256" }],
  },
  {
    type: "function",
    name: "createBuyOrder",
    stateMutability: "payable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "pricePerUnitWei", type: "uint256" },
    ],
    outputs: [{ name: "orderId", type: "uint256" }],
  },
  {
    type: "function",
    name: "fillSellOrder",
    stateMutability: "payable",
    inputs: [
      { name: "orderId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "fillBuyOrder",
    stateMutability: "nonpayable",
    inputs: [
      { name: "orderId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelOrder",
    stateMutability: "nonpayable",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [],
  },
] as const;
