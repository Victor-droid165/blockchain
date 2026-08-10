import { readFile } from "node:fs/promises";
import path from "node:path";

import hre from "hardhat";
import { upgrades } from "@openzeppelin/hardhat-upgrades/viem";
import type { Address } from "viem";

type Deployment = {
  contracts: {
    precatorioNFT: Address;
    precatorioMarketplace: Address;
  };
};

const connection = await hre.network.create();
const { networkName } = connection;
const upgradesApi = await upgrades(hre, connection);

const deploymentPath = path.resolve(
  process.cwd(),
  "deployments",
  `${networkName}.json`,
);

const deployment = JSON.parse(
  await readFile(deploymentPath, "utf8"),
) as Deployment;

console.log(`Upgrading local demo contracts on ${networkName}...`);

const nft = await upgradesApi.upgradeProxy(
  deployment.contracts.precatorioNFT,
  "PrecatorioNFTV2",
);

const marketplace = await upgradesApi.upgradeProxy(
  deployment.contracts.precatorioMarketplace,
  "PrecatorioMarketplaceV2",
);

console.log("\nUpgrade completed. Proxy addresses remain unchanged:");
console.log(`PrecatorioNFT: ${nft.address} · version ${await nft.read.version()}`);
console.log(
  `PrecatorioMarketplace: ${marketplace.address} · version ${await marketplace.read.version()}`,
);
