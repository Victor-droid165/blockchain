import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import hre from "hardhat";
import { upgrades } from "@openzeppelin/hardhat-upgrades/viem";

const connection = await hre.network.create();
const { viem, networkName } = connection;
const upgradesApi = await upgrades(hre, connection);

const publicClient = await viem.getPublicClient();
const [admin] = await viem.getWalletClients();

console.log(`Deploying Quitus & Debitus NFT PoC to ${networkName}...`);
console.log(`Administrator: ${admin.account.address}`);

// Event discovery in the frontend starts here instead of scanning from block 0.
const deploymentBlock = await publicClient.getBlockNumber();

const precatorioNFT = await upgradesApi.deployProxy(
  "PrecatorioNFT",
  [admin.account.address],
  { kind: "uups" },
);

const precatorioMarketplace = await upgradesApi.deployProxy(
  "PrecatorioMarketplace",
  [
    admin.account.address,
    precatorioNFT.address,
  ],
  { kind: "uups" },
);

const deployment = {
  network: networkName,
  chainId: await publicClient.getChainId(),
  admin: admin.account.address,
  deploymentBlock: deploymentBlock.toString(),
  contracts: {
    precatorioNFT: precatorioNFT.address,
    precatorioMarketplace: precatorioMarketplace.address,
  },
};

const blockchainOutput = path.resolve(
  process.cwd(),
  "deployments",
  `${networkName}.json`,
);

await mkdir(path.dirname(blockchainOutput), { recursive: true });
await writeFile(
  blockchainOutput,
  `${JSON.stringify(deployment, null, 2)}\n`,
  "utf8",
);

console.log("\nDeployment completed:");
console.log(JSON.stringify(deployment, null, 2));
console.log(`\nBlockchain deployment file: ${blockchainOutput}`);

if (networkName === "localhost") {
  const frontendOutput = path.resolve(
    process.cwd(),
    "../frontend/public/deployment.json",
  );

  await mkdir(path.dirname(frontendOutput), { recursive: true });
  await writeFile(
    frontendOutput,
    `${JSON.stringify(deployment, null, 2)}\n`,
    "utf8",
  );

  console.log(`Frontend deployment file: ${frontendOutput}`);
}
