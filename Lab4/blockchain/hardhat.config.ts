import { defineConfig } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatUpgrades from "@openzeppelin/hardhat-upgrades/viem";

export default defineConfig({
  plugins: [hardhatToolboxViem, hardhatUpgrades],
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
});
