import "dotenv/config";

import { configVariable, defineConfig } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatUpgrades from "@openzeppelin/hardhat-upgrades/viem";

export default defineConfig({
  plugins: [hardhatToolboxViem, hardhatUpgrades],
  solidity: {
    version: "0.8.24",
    settings: {
      // OpenZeppelin Contracts 5.6.x uses the MCOPY opcode in Bytes.sol.
      // Solidity 0.8.24 supports MCOPY when compiling for Cancun.
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Nó Hardhat persistente iniciado à parte (`npm run chain:node`), usado
    // pelo deploy local e pela demonstração com MetaMask. Sem esta entrada,
    // `--network localhost` falha com HHE703 mesmo com o nó rodando.
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
    },
    // Rede de testes pública exigida como alternativa ao Hardhat local.
    // As variáveis são lidas de blockchain/.env (veja .env.example) e nunca
    // ficam hardcoded ou versionadas no repositório.
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
});
