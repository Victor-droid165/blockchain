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

// Mock institucional de atualização monetária: começa no fator neutro 1,0
// e o admin publica novos índices conforme o roteiro de demonstração.
const monetaryOracle = await upgradesApi.deployProxy(
  "MonetaryOracle",
  [admin.account.address],
  { kind: "uups" },
);

const compensationManager = await upgradesApi.deployProxy(
  "CompensationManager",
  [
    admin.account.address,
    precatorioNFT.address,
    monetaryOracle.address,
  ],
  { kind: "uups" },
);

// Autoriza o módulo de compensação a queimar precatórios compensados.
const authorizeTx = await precatorioNFT.write.setCompensationManager(
  [compensationManager.address],
  { account: admin.account },
);
await publicClient.waitForTransactionReceipt({ hash: authorizeTx });

const deployment = {
  network: networkName,
  chainId: await publicClient.getChainId(),
  admin: admin.account.address,
  deploymentBlock: deploymentBlock.toString(),
  contracts: {
    precatorioNFT: precatorioNFT.address,
    precatorioMarketplace: precatorioMarketplace.address,
    monetaryOracle: monetaryOracle.address,
    compensationManager: compensationManager.address,
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

// O frontend não distingue rede local de rede de testes pública: ambas
// alimentam o mesmo public/deployment.json, e o client Viem escolhe a chain
// e o RPC certos a partir do chainId gravado nesse arquivo.
if (networkName === "localhost" || networkName === "sepolia") {
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

  if (networkName === "sepolia") {
    console.log(
      "\nPara verificar o código-fonte no Etherscan, use a implementação " +
        "registrada em .openzeppelin/sepolia.json e execute:",
    );
    console.log(
      "  npx hardhat verify --network sepolia <endereco_da_implementacao>",
    );
  }
}
