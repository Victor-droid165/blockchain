import assert from "node:assert/strict";
import { describe, it } from "node:test";

import hre from "hardhat";
import { upgrades } from "@openzeppelin/hardhat-upgrades/viem";
import { keccak256, toBytes } from "viem";

const connection = await hre.network.create();
const { viem } = connection;
const upgradesApi = await upgrades(hre, connection);
const publicClient = await viem.getPublicClient();
const [admin, seller, buyer, outsider] = await viem.getWalletClients();

function identifier(label: string) {
  return keccak256(toBytes(label));
}

async function waitFor(hash: `0x${string}`) {
  await publicClient.waitForTransactionReceipt({ hash });
}

function assertAddressEqual(actual: string, expected: string) {
  assert.equal(actual.toLowerCase(), expected.toLowerCase());
}

async function deploySystem() {
  const nft = await upgradesApi.deployProxy(
    "PrecatorioNFT",
    [admin.account.address],
    { kind: "uups" },
  );

  const marketplace = await upgradesApi.deployProxy(
    "PrecatorioMarketplace",
    [
      admin.account.address,
      nft.address,
    ],
    { kind: "uups" },
  );

  return { nft, marketplace };
}

async function mintAndApprove(
  nft: Awaited<ReturnType<typeof deploySystem>>["nft"],
  marketplaceAddress: `0x${string}`,
  label: string,
  faceValue = 500000n,
) {
  await waitFor(
    await nft.write.mintPrecatorio(
      [
        seller.account.address,
        identifier(label),
        faceValue,
      ],
      { account: admin.account },
    ),
  );

  await waitFor(
    await nft.write.approve(
      [marketplaceAddress, 1n],
      { account: seller.account },
    ),
  );
}

describe("PrecatorioMarketplace", () => {
  it("lista e vende um precatório NFT completo", async () => {
    const { nft, marketplace } = await deploySystem();
    const price = 1000000000000000n;

    await mintAndApprove(
      nft,
      marketplace.address,
      "precatorio-marketplace-sale",
    );

    await waitFor(
      await marketplace.write.list(
        [1n, price],
        { account: seller.account },
      ),
    );

    assert.equal(
      await marketplace.read.activeListingByTokenId([1n]),
      1n,
    );

    await waitFor(
      await marketplace.write.buy(
        [1n],
        {
          account: buyer.account,
          value: price,
        },
      ),
    );

    assertAddressEqual(
      await nft.read.ownerOf([1n]),
      buyer.account.address,
    );

    const listing = await marketplace.read.listings([1n]);
    assert.equal(listing[4], false);

    assert.equal(
      await marketplace.read.activeListingByTokenId([1n]),
      0n,
    );
    assert.equal(await marketplace.read.totalSales(), 1n);
    assert.equal(await marketplace.read.lastSalePrice(), price);
  });

  it("exige propriedade e aprovação antes de criar a listagem", async () => {
    const { nft, marketplace } = await deploySystem();

    await waitFor(
      await nft.write.mintPrecatorio(
        [
          seller.account.address,
          identifier("precatorio-sem-aprovacao"),
          300000n,
        ],
        { account: admin.account },
      ),
    );

    await assert.rejects(
      marketplace.write.list(
        [1n, 1000n],
        { account: seller.account },
      ),
    );

    await assert.rejects(
      marketplace.write.list(
        [1n, 1000n],
        { account: outsider.account },
      ),
    );

    await waitFor(
      await nft.write.approve(
        [marketplace.address, 1n],
        { account: seller.account },
      ),
    );

    await waitFor(
      await marketplace.write.list(
        [1n, 1000n],
        { account: seller.account },
      ),
    );

    await assert.rejects(
      marketplace.write.list(
        [1n, 2000n],
        { account: seller.account },
      ),
    );
  });

  it("permite ao vendedor cancelar uma listagem", async () => {
    const { nft, marketplace } = await deploySystem();

    await mintAndApprove(
      nft,
      marketplace.address,
      "precatorio-cancelamento",
    );

    await waitFor(
      await marketplace.write.list(
        [1n, 2000n],
        { account: seller.account },
      ),
    );

    await assert.rejects(
      marketplace.write.cancel(
        [1n],
        { account: outsider.account },
      ),
    );

    await waitFor(
      await marketplace.write.cancel(
        [1n],
        { account: seller.account },
      ),
    );

    const listing = await marketplace.read.listings([1n]);
    assert.equal(listing[4], false);

    await assert.rejects(
      marketplace.write.buy(
        [1n],
        {
          account: buyer.account,
          value: 2000n,
        },
      ),
    );
  });

  it("rejeita auto-compra, pagamento incorreto e renúncia de ownership", async () => {
    const { nft, marketplace } = await deploySystem();
    const price = 2500n;

    await mintAndApprove(
      nft,
      marketplace.address,
      "precatorio-validacoes-market",
    );

    await waitFor(
      await marketplace.write.list(
        [1n, price],
        { account: seller.account },
      ),
    );

    await assert.rejects(
      marketplace.write.buy(
        [1n],
        {
          account: seller.account,
          value: price,
        },
      ),
    );

    await assert.rejects(
      marketplace.write.buy(
        [1n],
        {
          account: buyer.account,
          value: price - 1n,
        },
      ),
    );

    await assert.rejects(
      marketplace.write.renounceOwnership(
        [],
        { account: admin.account },
      ),
    );

    assertAddressEqual(
      await marketplace.read.owner(),
      admin.account.address,
    );
  });

  it("pausa e retoma temporariamente o marketplace", async () => {
    const { nft, marketplace } = await deploySystem();

    await mintAndApprove(
      nft,
      marketplace.address,
      "precatorio-pause-market",
    );

    await waitFor(
      await marketplace.write.list(
        [1n, 3000n],
        { account: seller.account },
      ),
    );

    await waitFor(
      await marketplace.write.pause(
        [],
        { account: admin.account },
      ),
    );

    await assert.rejects(
      marketplace.write.buy(
        [1n],
        {
          account: buyer.account,
          value: 3000n,
        },
      ),
    );

    await waitFor(
      await marketplace.write.unpause(
        [],
        { account: admin.account },
      ),
    );

    await waitFor(
      await marketplace.write.buy(
        [1n],
        {
          account: buyer.account,
          value: 3000n,
        },
      ),
    );

    assertAddressEqual(
      await nft.read.ownerOf([1n]),
      buyer.account.address,
    );
  });

  it("preserva endereço e listagens ao fazer upgrade UUPS enquanto válido", async () => {
    const { nft, marketplace } = await deploySystem();

    await mintAndApprove(
      nft,
      marketplace.address,
      "precatorio-upgrade-market",
    );

    await waitFor(
      await marketplace.write.list(
        [1n, 4000n],
        { account: seller.account },
      ),
    );

    const proxyAddress = marketplace.address;

    const upgraded = await upgradesApi.upgradeProxy(
      proxyAddress,
      "PrecatorioMarketplaceV2",
    );

    assert.equal(upgraded.address, proxyAddress);
    assert.equal(await upgraded.read.version(), 2n);

    const listing = await upgraded.read.listings([1n]);
    assertAddressEqual(listing[0], seller.account.address);
    assert.equal(listing[1], 1n);
    assert.equal(listing[2], 4000n);
    assert.equal(listing[4], true);
  });

  it("permite fazer, cancelar e receber reembolso de uma oferta sem listagem prévia", async () => {
    const { nft, marketplace } = await deploySystem();
    const amount = 800000000000000n;

    await waitFor(
      await nft.write.mintPrecatorio(
        [
          seller.account.address,
          identifier("precatorio-oferta-cancelada"),
          400000n,
        ],
        { account: admin.account },
      ),
    );

    await waitFor(
      await marketplace.write.makeOffer([1n], {
        account: buyer.account,
        value: amount,
      }),
    );

    assert.equal(
      await marketplace.read.activeOfferByBuyerAndToken([
        buyer.account.address,
        1n,
      ]),
      1n,
    );

    await assert.rejects(
      marketplace.write.makeOffer([1n], {
        account: buyer.account,
        value: amount,
      }),
    );

    await assert.rejects(
      marketplace.write.makeOffer([1n], {
        account: seller.account,
        value: amount,
      }),
    );

    await assert.rejects(
      marketplace.write.cancelOffer([1n], { account: outsider.account }),
    );

    await waitFor(
      await marketplace.write.cancelOffer([1n], {
        account: buyer.account,
      }),
    );

    const offer = await marketplace.read.offers([1n]);
    assert.equal(offer[4], false);

    assert.equal(
      await marketplace.read.activeOfferByBuyerAndToken([
        buyer.account.address,
        1n,
      ]),
      0n,
    );

    await assert.rejects(
      marketplace.write.cancelOffer([1n], { account: buyer.account }),
    );
  });

  it("aceita uma oferta sem listagem prévia e transfere NFT e ETH", async () => {
    const { nft, marketplace } = await deploySystem();
    const amount = 1200000000000000n;

    await waitFor(
      await nft.write.mintPrecatorio(
        [
          seller.account.address,
          identifier("precatorio-oferta-aceita"),
          600000n,
        ],
        { account: admin.account },
      ),
    );

    await waitFor(
      await nft.write.approve([marketplace.address, 1n], {
        account: seller.account,
      }),
    );

    await waitFor(
      await marketplace.write.makeOffer([1n], {
        account: buyer.account,
        value: amount,
      }),
    );

    await assert.rejects(
      marketplace.write.acceptOffer([1n], { account: outsider.account }),
    );

    await waitFor(
      await marketplace.write.acceptOffer([1n], {
        account: seller.account,
      }),
    );

    assertAddressEqual(await nft.read.ownerOf([1n]), buyer.account.address);

    const offer = await marketplace.read.offers([1n]);
    assert.equal(offer[4], false);

    assert.equal(await marketplace.read.totalSales(), 1n);
    assert.equal(await marketplace.read.lastSalePrice(), amount);

    await assert.rejects(
      marketplace.write.acceptOffer([1n], { account: seller.account }),
    );
  });

  it("encerra a listagem a preço fixo ao aceitar uma oferta concorrente pelo mesmo NFT", async () => {
    const { nft, marketplace } = await deploySystem();
    const offerAmount = 900000000000000n;

    await mintAndApprove(
      nft,
      marketplace.address,
      "precatorio-oferta-vs-listagem",
    );

    await waitFor(
      await marketplace.write.list([1n, 2000000000000000n], {
        account: seller.account,
      }),
    );

    await waitFor(
      await marketplace.write.makeOffer([1n], {
        account: buyer.account,
        value: offerAmount,
      }),
    );

    await waitFor(
      await marketplace.write.acceptOffer([1n], {
        account: seller.account,
      }),
    );

    assertAddressEqual(await nft.read.ownerOf([1n]), buyer.account.address);

    assert.equal(
      await marketplace.read.activeListingByTokenId([1n]),
      0n,
    );

    const listing = await marketplace.read.listings([1n]);
    assert.equal(listing[4], false);
  });

  it("permite ao novo proprietário aceitar uma oferta feita antes da compra em listagem", async () => {
    const { nft, marketplace } = await deploySystem();
    const listingPrice = 1000000000000000n;
    const offerAmount = 1500000000000000n;

    await mintAndApprove(
      nft,
      marketplace.address,
      "precatorio-oferta-pos-venda",
    );

    await waitFor(
      await marketplace.write.list([1n, listingPrice], {
        account: seller.account,
      }),
    );

    await waitFor(
      await marketplace.write.makeOffer([1n], {
        account: outsider.account,
        value: offerAmount,
      }),
    );

    await waitFor(
      await marketplace.write.buy([1n], {
        account: buyer.account,
        value: listingPrice,
      }),
    );

    assertAddressEqual(await nft.read.ownerOf([1n]), buyer.account.address);

    await waitFor(
      await nft.write.approve([marketplace.address, 1n], {
        account: buyer.account,
      }),
    );

    await waitFor(
      await marketplace.write.acceptOffer([1n], {
        account: buyer.account,
      }),
    );

    assertAddressEqual(
      await nft.read.ownerOf([1n]),
      outsider.account.address,
    );
  });

  it("continua permitindo cancelOffer e devolvendo ETH mesmo com o marketplace pausado ou invalidado", async () => {
    const { nft, marketplace } = await deploySystem();
    const amount = 500000000000000n;

    await waitFor(
      await nft.write.mintPrecatorio(
        [
          seller.account.address,
          identifier("precatorio-oferta-pausado"),
          200000n,
        ],
        { account: admin.account },
      ),
    );

    await waitFor(
      await marketplace.write.makeOffer([1n], {
        account: buyer.account,
        value: amount,
      }),
    );

    await waitFor(
      await marketplace.write.pause([], { account: admin.account }),
    );

    await assert.rejects(
      marketplace.write.makeOffer([1n], {
        account: outsider.account,
        value: amount,
      }),
    );

    await waitFor(
      await marketplace.write.cancelOffer([1n], {
        account: buyer.account,
      }),
    );

    const offer = await marketplace.read.offers([1n]);
    assert.equal(offer[4], false);
  });

  it("invalida permanentemente operações e upgrades do marketplace", async () => {
    const { nft, marketplace } = await deploySystem();

    await mintAndApprove(
      nft,
      marketplace.address,
      "precatorio-invalidacao-market",
    );

    await waitFor(
      await marketplace.write.list(
        [1n, 5000n],
        { account: seller.account },
      ),
    );

    await waitFor(
      await marketplace.write.makeOffer([1n], {
        account: outsider.account,
        value: 3000n,
      }),
    );

    await waitFor(
      await marketplace.write.invalidate(
        [],
        { account: admin.account },
      ),
    );

    assert.equal(await marketplace.read.invalidated(), true);
    assert.equal(await marketplace.read.paused(), true);

    await assert.rejects(
      marketplace.write.buy(
        [1n],
        {
          account: buyer.account,
          value: 5000n,
        },
      ),
    );

    await assert.rejects(
      marketplace.write.cancel(
        [1n],
        { account: seller.account },
      ),
    );

    await assert.rejects(
      marketplace.write.makeOffer([1n], {
        account: buyer.account,
        value: 4000n,
      }),
    );

    await assert.rejects(
      marketplace.write.acceptOffer([1n], { account: seller.account }),
    );

    await waitFor(
      await marketplace.write.cancelOffer([1n], {
        account: outsider.account,
      }),
    );

    const refundedOffer = await marketplace.read.offers([1n]);
    assert.equal(refundedOffer[4], false);

    await assert.rejects(
      marketplace.write.unpause(
        [],
        { account: admin.account },
      ),
    );

    await assert.rejects(
      upgradesApi.upgradeProxy(
        marketplace.address,
        "PrecatorioMarketplaceV2",
      ),
    );

    await assert.rejects(
      marketplace.write.transferOwnership(
        [outsider.account.address],
        { account: admin.account },
      ),
    );

    const listing = await marketplace.read.listings([1n]);
    assert.equal(listing[4], true);

    assertAddressEqual(
      await nft.read.ownerOf([1n]),
      seller.account.address,
    );
  });
});
