import hre from "hardhat";
import { keccak256, toBytes } from "viem";

export const { viem } = await hre.network.create();

export function id(label: string) {
  return keccak256(toBytes(label));
}

export async function waitFor(
  transactionHash: `0x${string}`,
) {
  const publicClient = await viem.getPublicClient();
  await publicClient.waitForTransactionReceipt({
    hash: transactionHash,
  });
}

export async function deploySystem() {
  const [issuer, debtor, buyer, seller] =
    await viem.getWalletClients();

  const oracle = await viem.deployContract(
    "MonetaryOracle",
    [issuer.account.address],
  );

  const qts = await viem.deployContract(
    "QuitusToken",
    [
      issuer.account.address,
      oracle.address,
    ],
  );

  const dbt = await viem.deployContract(
    "DebitusToken",
    [issuer.account.address],
  );

  const manager = await viem.deployContract(
    "CompensationManager",
    [
      qts.address,
      dbt.address,
    ],
  );

  const marketplace = await viem.deployContract(
    "QuitusMarketplace",
    [qts.address],
  );

  await waitFor(
    await qts.write.setCompensationManager(
      [manager.address],
      { account: issuer.account },
    ),
  );

  await waitFor(
    await dbt.write.setCompensationManager(
      [manager.address],
      { account: issuer.account },
    ),
  );

  return {
    issuer,
    debtor,
    buyer,
    seller,
    oracle,
    qts,
    dbt,
    manager,
    marketplace,
  };
}
