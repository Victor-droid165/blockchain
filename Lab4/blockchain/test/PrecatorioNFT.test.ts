import assert from "node:assert/strict";
import { describe, it } from "node:test";

import hre from "hardhat";
import { upgrades } from "@openzeppelin/hardhat-upgrades/viem";
import { keccak256, toBytes } from "viem";

const connection = await hre.network.create();
const { viem } = connection;
const upgradesApi = await upgrades(hre, connection);
const publicClient = await viem.getPublicClient();
const [admin, holder, buyer, outsider] = await viem.getWalletClients();

function identifier(label: string) {
  return keccak256(toBytes(label));
}

async function waitFor(hash: `0x${string}`) {
  await publicClient.waitForTransactionReceipt({ hash });
}

function assertAddressEqual(actual: string, expected: string) {
  assert.equal(actual.toLowerCase(), expected.toLowerCase());
}

async function deployNFT() {
  return upgradesApi.deployProxy(
    "PrecatorioNFT",
    [admin.account.address],
    { kind: "uups" },
  );
}

describe("PrecatorioNFT", () => {
  it("cria um precatório ERC-721 com dados mínimos", async () => {
    const nft = await deployNFT();
    const id = identifier("precatorio-nft-1");

    await waitFor(
      await nft.write.mintPrecatorio(
        [holder.account.address, id, 1500000n],
        { account: admin.account },
      ),
    );

    assertAddressEqual(await nft.read.ownerOf([1n]), holder.account.address);
    assert.equal(await nft.read.nextTokenId(), 2n);
    assert.equal(await nft.read.identifiersUsed([id]), true);

    const data = await nft.read.precatorios([1n]);
    assert.equal(data[0], id);
    assert.equal(data[1], 1500000n);
    assert.ok(data[2] > 0n);
  });

  it("restringe mint ao proprietário institucional e impede identificador duplicado", async () => {
    const nft = await deployNFT();
    const id = identifier("precatorio-unico");

    await assert.rejects(
      nft.write.mintPrecatorio(
        [holder.account.address, id, 100000n],
        { account: outsider.account },
      ),
    );

    await waitFor(
      await nft.write.mintPrecatorio(
        [holder.account.address, id, 100000n],
        { account: admin.account },
      ),
    );

    await assert.rejects(
      nft.write.mintPrecatorio(
        [buyer.account.address, id, 200000n],
        { account: admin.account },
      ),
    );
  });

  it("mantém uma conta administradora ao desabilitar renúncia de ownership", async () => {
    const nft = await deployNFT();

    await assert.rejects(
      nft.write.renounceOwnership([], { account: admin.account }),
    );

    assertAddressEqual(await nft.read.owner(), admin.account.address);
  });

  it("pausa e retoma as operações sem invalidar o contrato", async () => {
    const nft = await deployNFT();
    const id = identifier("precatorio-pause");

    await waitFor(
      await nft.write.mintPrecatorio(
        [holder.account.address, id, 100000n],
        { account: admin.account },
      ),
    );

    await waitFor(
      await nft.write.pause([], { account: admin.account }),
    );

    assert.equal(await nft.read.paused(), true);
    assert.equal(await nft.read.invalidated(), false);

    await assert.rejects(
      nft.write.transferFrom(
        [holder.account.address, buyer.account.address, 1n],
        { account: holder.account },
      ),
    );

    await waitFor(
      await nft.write.unpause([], { account: admin.account }),
    );

    await waitFor(
      await nft.write.transferFrom(
        [holder.account.address, buyer.account.address, 1n],
        { account: holder.account },
      ),
    );

    assertAddressEqual(await nft.read.ownerOf([1n]), buyer.account.address);
  });

  it("preserva estado e endereço ao fazer upgrade UUPS enquanto o contrato é válido", async () => {
    const nft = await deployNFT();
    const id = identifier("precatorio-upgrade");

    await waitFor(
      await nft.write.mintPrecatorio(
        [holder.account.address, id, 350000n],
        { account: admin.account },
      ),
    );

    const proxyAddress = nft.address;
    const upgraded = await upgradesApi.upgradeProxy(
      proxyAddress,
      "PrecatorioNFTV2",
    );

    assert.equal(upgraded.address, proxyAddress);
    assert.equal(await upgraded.read.version(), 2n);
    assertAddressEqual(await upgraded.read.ownerOf([1n]), holder.account.address);

    const data = await upgraded.read.precatorios([1n]);
    assert.equal(data[0], id);
    assert.equal(data[1], 350000n);
  });

  it("invalida permanentemente mint, aprovações, transferências, retomada e upgrade", async () => {
    const nft = await deployNFT();
    const id = identifier("precatorio-invalidado");

    await waitFor(
      await nft.write.mintPrecatorio(
        [holder.account.address, id, 500000n],
        { account: admin.account },
      ),
    );

    await waitFor(
      await nft.write.invalidate([], { account: admin.account }),
    );

    assert.equal(await nft.read.invalidated(), true);
    assert.equal(await nft.read.paused(), true);
    assertAddressEqual(await nft.read.ownerOf([1n]), holder.account.address);

    await assert.rejects(
      nft.write.unpause([], { account: admin.account }),
    );

    await assert.rejects(
      nft.write.approve([buyer.account.address, 1n], {
        account: holder.account,
      }),
    );

    await assert.rejects(
      nft.write.transferFrom(
        [holder.account.address, buyer.account.address, 1n],
        { account: holder.account },
      ),
    );

    await assert.rejects(
      nft.write.mintPrecatorio(
        [buyer.account.address, identifier("novo"), 100000n],
        { account: admin.account },
      ),
    );

    await assert.rejects(
      upgradesApi.upgradeProxy(nft.address, "PrecatorioNFTV2"),
    );

    await assert.rejects(
      nft.write.transferOwnership(
        [buyer.account.address],
        { account: admin.account },
      ),
    );

    assertAddressEqual(await nft.read.ownerOf([1n]), holder.account.address);
  });
});
