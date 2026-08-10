/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * URL RPC pública usada quando o deployment ativo não é a rede Hardhat
   * local. Opcional: sem ela, o frontend usa o RPC público padrão da chain
   * reconhecida em `viem/chains` (ex.: Sepolia).
   */
  readonly VITE_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
