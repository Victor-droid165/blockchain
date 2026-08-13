import assert from "node:assert/strict";
import { describe, it } from "node:test";

import hre from "hardhat";
import { upgrades } from "@openzeppelin/hardhat-upgrades/viem";
import { keccak256, toBytes } from "viem";

const connection = await hre.network.create();
const { viem } = connection;
const upgradesApi = await upgrades(hre, connection);
const publicClient = await viem.getPublicClient();
const [admin, creditor, outsider] = await viem.getWalletClients();

const INDEX_PRECISION = 10n ** 18n;

function identifier(label: string) {
  return keccak256(toBytes(label));
}

async function waitFor(hash: `0x${string}`) {
  await publicClient.waitForTransactionReceipt({ hash });
}

/**
 * Implanta o conjunto completo usado pela compensação: NFT, oráculo e
 * manager, já com o manager autorizado a queimar precatórios.
 */
async function deployProtocol() {
  const nft = await upgradesApi.deployProxy(
    "PrecatorioNFT",
    [admin.account.address],
    { kind: "uups" },
  );

  const oracle = await upgradesApi.deployProxy(
    "MonetaryOracle",
    [admin.account.address],
    { kind: "uups" },
  );

  const manager = await upgradesApi.deployProxy(
    "CompensationManager",
    [admin.account.address, nft.address, oracle.address],
    { kind: "uups" },
  );

  await waitFor(
    await nft.write.setCompensationManager([manager.address], {
      account: admin.account,
    }),
  );

  return { nft, oracle, manager };
}

describe("CompensationManager", () => {
  it("registra débito fiscal mock somente pelo owner e sem identificador duplicado", async () => {
    const { manager } = await deployProtocol();
    const id = identifier("cda-0001");

    await assert.rejects(
      manager.write.registerDebt(
        [id, creditor.account.address, 500000n],
        { account: outsider.account },
      ),
    );

    await waitFor(
      await manager.write.registerDebt(
        [id, creditor.account.address, 500000n],
        { account: admin.account },
      ),
    );

    const debt = await manager.read.debts([1n]);
    assert.equal(debt[0], id);
    assert.equal(debt[1].toLowerCase(), creditor.account.address.toLowerCase());
    assert.equal(debt[2], 500000n);
    assert.equal(debt[3], 500000n);

    await assert.rejects(
      manager.write.registerDebt(
        [id, creditor.account.address, 100000n],
        { account: admin.account },
      ),
    );
  });

  it("compensa atomicamente: queima o NFT e abate o débito pelo valor corrigido", async () => {
    const { nft, oracle, manager } = await deployProtocol();

    await waitFor(
      await nft.write.mintPrecatorio(
        [creditor.account.address, identifier("prec-comp-1"), 100000n],
        { account: admin.account },
      ),
    );

    // 10% de correção acumulada: crédito de 100000 vira 110000.
    await waitFor(
      await oracle.write.updateIndex([(INDEX_PRECISION * 110n) / 100n], {
        account: admin.account,
      }),
    );

    await waitFor(
      await manager.write.registerDebt(
        [identifier("cda-comp-1"), creditor.account.address, 500000n],
        { account: admin.account },
      ),
    );

    await waitFor(
      await manager.write.compensate([1n, 1n], {
        account: creditor.account,
      }),
    );

    // O NFT deixa de existir na mesma transação que abate o débito.
    await assert.rejects(nft.read.ownerOf([1n]));

    const debt = await manager.read.debts([1n]);
    assert.equal(debt[3], 390000n);

    const record = await manager.read.compensations([1n]);
    assert.equal(record[0], 1n);
    assert.equal(record[1], 1n);
    assert.equal(record[2].toLowerCase(), creditor.account.address.toLowerCase());
    assert.equal(record[3], 100000n);
    assert.equal(record[4], 110000n);
    assert.ok(record[5] > 0n);

    // Os dados do precatório extinto permanecem como histórico.
    const data = await nft.read.precatorios([1n]);
    assert.equal(data[1], 100000n);
  });

  it("exige que o chamador seja o dono do NFT e o devedor do débito", async () => {
    const { nft, manager } = await deployProtocol();

    await waitFor(
      await nft.write.mintPrecatorio(
        [creditor.account.address, identifier("prec-comp-2"), 100000n],
        { account: admin.account },
      ),
    );

    await waitFor(
      await manager.write.registerDebt(
        [identifier("cda-comp-2"), creditor.account.address, 500000n],
        { account: admin.account },
      ),
    );

    // Débito inexistente.
    await assert.rejects(
      manager.write.compensate([1n, 99n], { account: creditor.account }),
    );

    // Outsider não é dono do NFT.
    await assert.rejects(
      manager.write.compensate([1n, 1n], { account: outsider.account }),
    );

    // Dono do NFT que não é o devedor do débito.
    await waitFor(
      await manager.write.registerDebt(
        [identifier("cda-comp-2b"), outsider.account.address, 500000n],
        { account: admin.account },
      ),
    );

    await assert.rejects(
      manager.write.compensate([1n, 2n], { account: creditor.account }),
    );
  });

  it("rejeita compensação quando o débito não comporta o crédito corrigido", async () => {
    const { nft, manager } = await deployProtocol();

    await waitFor(
      await nft.write.mintPrecatorio(
        [creditor.account.address, identifier("prec-comp-3"), 300000n],
        { account: admin.account },
      ),
    );

    await waitFor(
      await manager.write.registerDebt(
        [identifier("cda-comp-3"), creditor.account.address, 200000n],
        { account: admin.account },
      ),
    );

    await assert.rejects(
      manager.write.compensate([1n, 1n], { account: creditor.account }),
    );

    // Nada foi consumido: NFT e débito permanecem intactos.
    assert.equal(
      (await nft.read.ownerOf([1n])).toLowerCase(),
      creditor.account.address.toLowerCase(),
    );
    const debt = await manager.read.debts([1n]);
    assert.equal(debt[3], 200000n);
  });

  it("permite queimar o precatório somente pelo módulo de compensação autorizado", async () => {
    const { nft } = await deployProtocol();

    await waitFor(
      await nft.write.mintPrecatorio(
        [creditor.account.address, identifier("prec-comp-4"), 100000n],
        { account: admin.account },
      ),
    );

    await assert.rejects(
      nft.write.burnForCompensation([1n], { account: creditor.account }),
    );

    await assert.rejects(
      nft.write.burnForCompensation([1n], { account: admin.account }),
    );

    assert.equal(
      (await nft.read.ownerOf([1n])).toLowerCase(),
      creditor.account.address.toLowerCase(),
    );
  });

  it("bloqueia compensação com o contrato pausado ou invalidado", async () => {
    const { nft, manager } = await deployProtocol();

    await waitFor(
      await nft.write.mintPrecatorio(
        [creditor.account.address, identifier("prec-comp-5"), 100000n],
        { account: admin.account },
      ),
    );

    await waitFor(
      await manager.write.registerDebt(
        [identifier("cda-comp-5"), creditor.account.address, 500000n],
        { account: admin.account },
      ),
    );

    await waitFor(
      await manager.write.pause([], { account: admin.account }),
    );

    await assert.rejects(
      manager.write.compensate([1n, 1n], { account: creditor.account }),
    );

    await waitFor(
      await manager.write.unpause([], { account: admin.account }),
    );

    await waitFor(
      await manager.write.invalidate([], { account: admin.account }),
    );

    await assert.rejects(
      manager.write.compensate([1n, 1n], { account: creditor.account }),
    );

    await assert.rejects(
      manager.write.registerDebt(
        [identifier("cda-comp-5b"), creditor.account.address, 100000n],
        { account: admin.account },
      ),
    );

    // Débitos e histórico continuam consultáveis após a invalidação.
    const debt = await manager.read.debts([1n]);
    assert.equal(debt[3], 500000n);
  });
});
