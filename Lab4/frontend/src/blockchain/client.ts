import "viem/window";

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
} from "viem";
import { hardhat } from "viem/chains";

import type { Deployment } from "./types";

export const publicClient = createPublicClient({
  chain: hardhat,
  transport: http("http://127.0.0.1:8545"),
});

export async function loadDeployment(): Promise<Deployment> {
  const response = await fetch("/deployment.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(
      "deployment.json não encontrado. Execute `npm run chain:node` e depois `npm run chain:deploy:localhost` na raiz de Lab4.",
    );
  }

  return (await response.json()) as Deployment;
}

export async function ensureLocalNetwork() {
  if (!window.ethereum) {
    throw new Error("Nenhuma carteira injetada encontrada. Instale/abra o MetaMask.");
  }

  const chainIdHex = `0x${hardhat.id.toString(16)}`;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code !== 4902) throw error;

    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: chainIdHex,
          chainName: "Hardhat Local",
          nativeCurrency: {
            name: "ETH",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: ["http://127.0.0.1:8545"],
        },
      ],
    });
  }
}

export async function connectInjectedWallet() {
  if (!window.ethereum) {
    throw new Error("Nenhuma carteira injetada encontrada. Instale/abra o MetaMask.");
  }

  await ensureLocalNetwork();

  const walletClient = createWalletClient({
    chain: hardhat,
    transport: custom(window.ethereum),
  });

  const addresses = await walletClient.requestAddresses();
  const account = addresses[0] as Address | undefined;

  if (!account) {
    throw new Error("A carteira não retornou uma conta.");
  }

  return { walletClient, account };
}

export type ConnectedWallet = Awaited<ReturnType<typeof connectInjectedWallet>>;
