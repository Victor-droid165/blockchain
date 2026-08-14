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

const PUBLIC_SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

function resolveRpcUrl(chainId: number): string {
  if (chainId === hardhat.id) {
    return "http://127.0.0.1:8545";
  }

  const override = import.meta.env.VITE_RPC_URL as string | undefined;
  if (override) return override;

  if (chainId === sepolia.id) {
    return PUBLIC_SEPOLIA_RPC;
  }

  const [defaultRpc] = resolveChain(chainId).rpcUrls.default.http;
  if (!defaultRpc) {
    throw new Error(
      `Nenhum RPC conhecido para a rede ${chainId}. Defina VITE_RPC_URL em frontend/.env.`,
    );
  }

  return defaultRpc;
}

/**
 * RPC anunciado à carteira em `wallet_addEthereumChain`. Nunca reutiliza
 * `VITE_RPC_URL`: chaves de Alchemy/Infura no browser quebram o probe do
 * MetaMask ("JSON is not a valid request object" / "RPC Request failed").
 */
function resolveWalletRpcUrl(chainId: number): string {
  if (chainId === hardhat.id) {
    return "http://127.0.0.1:8545";
  }

  if (chainId === sepolia.id) {
    return PUBLIC_SEPOLIA_RPC;
  }

  const [defaultRpc] = resolveChain(chainId).rpcUrls.default.http;
  return defaultRpc ?? PUBLIC_SEPOLIA_RPC;
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
  const currentChainId = (await window.ethereum.request({
    method: "eth_chainId",
  })) as string;

  if (currentChainId.toLowerCase() === chainIdHex.toLowerCase()) {
    return;
  }

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
          rpcUrls: [resolveWalletRpcUrl(activeChain.id)],
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

/**
 * Reabre o seletor de contas da carteira. MetaMask não tem um "logout"
 * on-chain: `wallet_requestPermissions` força o modal de permissão/contas;
 * se a carteira não implementar, cai no connect normal.
 */
export async function switchInjectedWallet() {
  if (!window.ethereum) {
    throw new Error("Nenhuma carteira injetada encontrada. Instale/abra o MetaMask.");
  }

  try {
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code === 4001) throw error;
  }

  return connectInjectedWallet();
}
