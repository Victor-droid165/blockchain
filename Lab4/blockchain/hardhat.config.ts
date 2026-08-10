import { defineConfig } from "hardhat/config";
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
});
