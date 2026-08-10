import "viem/window";

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Chain,
  type PublicClient,
} from "viem";
import { hardhat, sepolia } from "viem/chains";

import type { Deployment } from "./types";

const KNOWN_CHAINS: Record<number, Chain> = {
  [hardhat.id]: hardhat,
  [sepolia.id]: sepolia,
};

/**
 * A PoC não fica travada na rede Hardhat local: o `chainId` gravado em
 * `deployment.json` decide a chain e o RPC usados pelo frontend. Redes
 * desconhecidas ainda funcionam com metadados mínimos, mas sem RPC público
 * conhecido — nesse caso é necessário definir `VITE_RPC_URL`.
 */
function resolveChain(chainId: number): Chain {
  return (
    KNOWN_CHAINS[chainId] ?? {
      id: chainId,
      name: `Rede ${chainId}`,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [] } },
    }
  );
}

function resolveRpcUrl(chainId: number): string {
  if (chainId === hardhat.id) {
    return "http://127.0.0.1:8545";
  }

  const override = import.meta.env.VITE_RPC_URL as string | undefined;
  if (override) return override;

  const [defaultRpc] = resolveChain(chainId).rpcUrls.default.http;
  if (!defaultRpc) {
    throw new Error(
      `Nenhum RPC conhecido para a rede ${chainId}. Defina VITE_RPC_URL em frontend/.env.`,
    );
  }

  return defaultRpc;
}

let activeChain: Chain = hardhat;
let activePublicClient: PublicClient = createPublicClient({
  chain: hardhat,
  transport: http(resolveRpcUrl(hardhat.id)),
});

/**
 * Reconfigura o client Viem para a rede do deployment carregado.
 * Deve ser chamado uma vez, logo após `loadDeployment()`, antes de qualquer
 * leitura de contrato (`getPublicClient`) ou conexão de carteira.
 */
export function configureNetwork(deployment: Deployment) {
  activeChain = resolveChain(deployment.chainId);
  activePublicClient = createPublicClient({
    chain: activeChain,
    transport: http(resolveRpcUrl(deployment.chainId)),
  });
}

export function getActiveChain(): Chain {
  return activeChain;
}

export function getPublicClient() {
  return activePublicClient;
}

export async function loadDeployment(): Promise<Deployment> {
  const response = await fetch("/deployment.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(
      "deployment.json não encontrado. Execute `npm run chain:node` e depois `npm run chain:deploy:localhost` na raiz de Lab4.",
    );
  }

  return (await response.json()) as Deployment;
}

/**
 * Garante que a carteira injetada esteja na mesma rede do deployment ativo.
 * Para redes conhecidas pela carteira (ex.: Sepolia) o `switchEthereumChain`
 * basta; para a rede Hardhat local, que a carteira não conhece por padrão,
 * cai no fallback de `addEthereumChain` com os metadados locais.
 */
export async function ensureNetwork() {
  if (!window.ethereum) {
    throw new Error("Nenhuma carteira injetada encontrada. Instale/abra o MetaMask.");
  }

  const chainIdHex = `0x${activeChain.id.toString(16)}`;

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
          chainName: activeChain.name,
          nativeCurrency: activeChain.nativeCurrency,
          rpcUrls: [resolveRpcUrl(activeChain.id)],
        },
      ],
    });
  }
}

export async function connectInjectedWallet() {
  if (!window.ethereum) {
    throw new Error("Nenhuma carteira injetada encontrada. Instale/abra o MetaMask.");
  }

  await ensureNetwork();

  const walletClient = createWalletClient({
    chain: activeChain,
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
