import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import hre from "hardhat";
import { upgrades } from "@openzeppelin/hardhat-upgrades/viem";
import type { Address } from "viem";

/**
 * Estende um deployment existente (só PrecatorioNFT + PrecatorioMarketplace,
 * de antes da reintrodução do oráculo) para o conjunto completo de quatro
 * proxies, sem descartar os proxies já publicados/verificados:
 *
 * 1. upgrade in-place de PrecatorioNFT e PrecatorioMarketplace para as
 *    implementações atuais (mesmo endereço de proxy, novo código);
 * 2. deploy de novos proxies UUPS para MonetaryOracle e CompensationManager;
 * 3. autorização do CompensationManager a queimar precatórios no NFT.
 *
 * Ao contrário de `deploy.ts` (que sempre implanta os quatro do zero), este
 * script é para o caso em que PrecatorioNFT/PrecatorioMarketplace já têm
 * histórico e endereço divulgado (ex.: a Sepolia atual) e só precisam da
 * nova implementação, preservando `deploymentBlock` para o índice de
 * eventos do frontend continuar cobrindo o histórico anterior.
 */
type ExistingDeployment = {
  network: string;
  chainId: number;
  admin: Address;
  deploymentBlock?: string;
  contracts: {
    precatorioNFT: Address;
    precatorioMarketplace: Address;
    monetaryOracle?: Address;
    compensationManager?: Address;
  };
};

const connection = await hre.network.create();
const { viem, networkName } = connection;
const upgradesApi = await upgrades(hre, connection);

const publicClient = await viem.getPublicClient();
const [signer] = await viem.getWalletClients();

const deploymentPath = path.resolve(
  process.cwd(),
  "deployments",
  `${networkName}.json`,
);

const existing = JSON.parse(
  await readFile(deploymentPath, "utf8"),
) as ExistingDeployment;

if (
  existing.contracts.monetaryOracle &&
  existing.contracts.compensationManager
) {
  throw new Error(
    `${deploymentPath} já possui monetaryOracle/compensationManager. ` +
      "Nada a estender.",
  );
}

console.log(`Estendendo deployment em ${networkName}...`);
console.log(`Conta usada para upgrade/deploy: ${signer.account.address}`);
console.log(`Admin registrado no deployment atual: ${existing.admin}`);

if (signer.account.address.toLowerCase() !== existing.admin.toLowerCase()) {
  throw new Error(
    "A conta configurada (SEPOLIA_PRIVATE_KEY) não é o admin do deployment " +
      "existente; upgrade e setCompensationManager exigem a conta owner.",
  );
}

console.log("\n1) Upgrade de PrecatorioNFT (adiciona burnForCompensation)...");
const precatorioNFT = await upgradesApi.upgradeProxy(
  existing.contracts.precatorioNFT,
  "PrecatorioNFT",
);
console.log(`   Proxy inalterado: ${precatorioNFT.address}`);

console.log(
  "\n2) Upgrade de PrecatorioMarketplace (impede autoaceite de ofertas)...",
);
const precatorioMarketplace = await upgradesApi.upgradeProxy(
  existing.contracts.precatorioMarketplace,
  "PrecatorioMarketplace",
);
console.log(`   Proxy inalterado: ${precatorioMarketplace.address}`);

console.log("\n3) Deploy do novo proxy MonetaryOracle...");
const monetaryOracle = await upgradesApi.deployProxy(
  "MonetaryOracle",
  [existing.admin],
  { kind: "uups" },
);
console.log(`   Novo proxy: ${monetaryOracle.address}`);

console.log("\n4) Deploy do novo proxy CompensationManager...");
const compensationManager = await upgradesApi.deployProxy(
  "CompensationManager",
  [existing.admin, precatorioNFT.address, monetaryOracle.address],
  { kind: "uups" },
);
console.log(`   Novo proxy: ${compensationManager.address}`);

console.log(
  "\n5) Autorizando CompensationManager a queimar precatórios compensados...",
);
const authorizeTx = await precatorioNFT.write.setCompensationManager(
  [compensationManager.address],
  { account: signer.account },
);
await publicClient.waitForTransactionReceipt({ hash: authorizeTx });

const deployment: ExistingDeployment = {
  ...existing,
  contracts: {
    precatorioNFT: precatorioNFT.address,
    precatorioMarketplace: precatorioMarketplace.address,
    monetaryOracle: monetaryOracle.address,
    compensationManager: compensationManager.address,
  },
};

await writeFile(
  deploymentPath,
  `${JSON.stringify(deployment, null, 2)}\n`,
  "utf8",
);

console.log("\nDeployment estendido:");
console.log(JSON.stringify(deployment, null, 2));
console.log(`\nBlockchain deployment file: ${deploymentPath}`);

if (networkName === "localhost" || networkName === "sepolia") {
  const frontendOutput = path.resolve(
    process.cwd(),
    "../frontend/public/deployment.json",
  );

  await writeFile(
    frontendOutput,
    `${JSON.stringify(deployment, null, 2)}\n`,
    "utf8",
  );

  console.log(`Frontend deployment file: ${frontendOutput}`);
}

if (networkName === "sepolia") {
  console.log(
    "\nPara verificar o código-fonte das novas implementações no " +
      "Etherscan, use os endereços registrados em .openzeppelin/sepolia.json " +
      "e execute, para cada um:",
  );
  console.log("  npx hardhat verify --network sepolia <endereco_da_implementacao>");
}
