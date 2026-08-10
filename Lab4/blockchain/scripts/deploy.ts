import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { network } from "hardhat";

const { viem, networkName } = await network.create();

const publicClient = await viem.getPublicClient();
const [issuer] = await viem.getWalletClients();

console.log(`Deploying Quitus & Debitus to ${networkName}...`);
console.log(`Issuer/operator: ${issuer.account.address}`);

const oracle = await viem.deployContract(
  "MonetaryOracle",
  [issuer.account.address],
);

const qts = await viem.deployContract(
  "QuitusToken",
  [issuer.account.address, oracle.address],
);

const dbt = await viem.deployContract(
  "DebitusToken",
  [issuer.account.address],
);

const manager = await viem.deployContract(
  "CompensationManager",
  [qts.address, dbt.address],
);

const marketplace = await viem.deployContract(
  "QuitusMarketplace",
  [qts.address],
);

const qtsManagerTx = await qts.write.setCompensationManager(
  [manager.address],
  { account: issuer.account },
);
await publicClient.waitForTransactionReceipt({ hash: qtsManagerTx });

const dbtManagerTx = await dbt.write.setCompensationManager(
  [manager.address],
  { account: issuer.account },
);
await publicClient.waitForTransactionReceipt({ hash: dbtManagerTx });

const deployment = {
  network: networkName,
  chainId: await publicClient.getChainId(),
  issuer: issuer.account.address,
  contracts: {
    monetaryOracle: oracle.address,
    quitusToken: qts.address,
    debitusToken: dbt.address,
    compensationManager: manager.address,
    quitusMarketplace: marketplace.address,
  },
};

console.log("\nDeployment completed:");
console.log(JSON.stringify(deployment, null, 2));

if (networkName === "localhost") {
  const output = path.resolve(
    process.cwd(),
    "../frontend/public/deployment.json",
  );

  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(deployment, null, 2)}\n`, "utf8");
  console.log(`\nFrontend deployment file: ${output}`);
}
