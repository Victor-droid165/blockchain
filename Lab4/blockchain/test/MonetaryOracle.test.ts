import assert from "node:assert/strict";
import { describe, it } from "node:test";

import hre from "hardhat";
import { upgrades } from "@openzeppelin/hardhat-upgrades/viem";

const connection = await hre.network.create();
const { viem } = connection;
const upgradesApi = await upgrades(hre, connection);
const publicClient = await viem.getPublicClient();
const [admin, outsider] = await viem.getWalletClients();

const INDEX_PRECISION = 10n ** 18n;

async function waitFor(hash: `0x${string}`) {
  await publicClient.waitForTransactionReceipt({ hash });
}

async function deployOracle() {
  return upgradesApi.deployProxy(
    "MonetaryOracle",
    [admin.account.address],
    { kind: "uups" },
  );
}

describe("MonetaryOracle", () => {
  it("inicializa com índice neutro e valor ajustado igual ao valor de face", async () => {
    const oracle = await deployOracle();

    assert.equal(await oracle.read.currentIndex(), INDEX_PRECISION);
    assert.equal(await oracle.read.totalUpdates(), 0n);
    assert.ok((await oracle.read.lastUpdateAt()) > 0n);
    assert.equal(await oracle.read.adjustedValue([1500000n]), 1500000n);
  });

  it("publica novo índice e corrige o valor de face proporcionalmente", async () => {
    const oracle = await deployOracle();

    // 1,10x: 10% de correção acumulada.
    const newIndex = (INDEX_PRECISION * 110n) / 100n;

    await waitFor(
      await oracle.write.updateIndex([newIndex], { account: admin.account }),
    );

    assert.equal(await oracle.read.currentIndex(), newIndex);
    assert.equal(await oracle.read.totalUpdates(), 1n);
    assert.equal(await oracle.read.adjustedValue([1000000n]), 1100000n);
  });

  it("restringe a publicação ao owner e rejeita índice regressivo", async () => {
    const oracle = await deployOracle();
    const higher = (INDEX_PRECISION * 105n) / 100n;

    await assert.rejects(
      oracle.write.updateIndex([higher], { account: outsider.account }),
    );

    await waitFor(
      await oracle.write.updateIndex([higher], { account: admin.account }),
    );

    await assert.rejects(
      oracle.write.updateIndex([INDEX_PRECISION], {
        account: admin.account,
      }),
    );

    assert.equal(await oracle.read.currentIndex(), higher);
  });

  it("pausa e retoma a publicação sem invalidar o contrato", async () => {
    const oracle = await deployOracle();
    const newIndex = (INDEX_PRECISION * 102n) / 100n;

    await waitFor(
      await oracle.write.pause([], { account: admin.account }),
    );

    assert.equal(await oracle.read.paused(), true);
    assert.equal(await oracle.read.invalidated(), false);

    await assert.rejects(
      oracle.write.updateIndex([newIndex], { account: admin.account }),
    );

    // Consulta continua disponível durante a pausa.
    assert.equal(await oracle.read.adjustedValue([100000n]), 100000n);

    await waitFor(
      await oracle.write.unpause([], { account: admin.account }),
    );

    await waitFor(
      await oracle.write.updateIndex([newIndex], { account: admin.account }),
    );

    assert.equal(await oracle.read.currentIndex(), newIndex);
  });

  it("invalida permanentemente publicação, retomada e transferência de ownership", async () => {
    const oracle = await deployOracle();
    const newIndex = (INDEX_PRECISION * 103n) / 100n;

    await waitFor(
      await oracle.write.updateIndex([newIndex], { account: admin.account }),
    );

    await waitFor(
      await oracle.write.invalidate([], { account: admin.account }),
    );

    assert.equal(await oracle.read.invalidated(), true);
    assert.equal(await oracle.read.paused(), true);

    await assert.rejects(
      oracle.write.unpause([], { account: admin.account }),
    );

    await assert.rejects(
      oracle.write.updateIndex([newIndex * 2n], { account: admin.account }),
    );

    await assert.rejects(
      oracle.write.transferOwnership(
        [outsider.account.address],
        { account: admin.account },
      ),
    );

    // O último índice publicado permanece consultável.
    assert.equal(await oracle.read.currentIndex(), newIndex);
    assert.equal(await oracle.read.adjustedValue([1000000n]), 1030000n);
  });

  it("mantém uma conta administradora ao desabilitar renúncia de ownership", async () => {
    const oracle = await deployOracle();

    await assert.rejects(
      oracle.write.renounceOwnership([], { account: admin.account }),
    );

    assert.equal(
      (await oracle.read.owner()).toLowerCase(),
      admin.account.address.toLowerCase(),
    );
  });
});
