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

console.log(`MonetaryOracle: ${oracle.address}`);

const qts = await viem.deployContract(
  "QuitusToken",
  [
    issuer.account.address,
    oracle.address,
  ],
);

console.log(`QuitusToken: ${qts.address}`);

const dbt = await viem.deployContract(
  "DebitusToken",
  [issuer.account.address],
);

console.log(`DebitusToken: ${dbt.address}`);

const manager = await viem.deployContract(
  "CompensationManager",
  [
    qts.address,
    dbt.address,
  ],
);

console.log(`CompensationManager: ${manager.address}`);

const marketplace = await viem.deployContract(
  "QuitusMarketplace",
  [qts.address],
);

console.log(`QuitusMarketplace: ${marketplace.address}`);

console.log("Configuring CompensationManager on QTS...");

const qtsManagerTx = await qts.write.setCompensationManager(
  [manager.address],
  { account: issuer.account },
);

await publicClient.waitForTransactionReceipt({
  hash: qtsManagerTx,
  confirmations: 1,
});

console.log("Configuring CompensationManager on DBT...");

const dbtManagerTx = await dbt.write.setCompensationManager(
  [manager.address],
  { account: issuer.account },
);

await publicClient.waitForTransactionReceipt({
  hash: dbtManagerTx,
  confirmations: 1,
});

const deployment = {
  network: networkName,
  issuer: issuer.account.address,
  contracts: {
    monetaryOracle: oracle.address,
    quitusToken: qts.address,
    debitusToken: dbt.address,
    compensationManager: manager.address,
    quitusMarketplace: marketplace.address,
  },
};

console.log("");
console.log("Deployment completed.");
console.log(JSON.stringify(deployment, null, 2));
