import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deploySystem,
  id,
  viem,
  waitFor,
} from "./helpers.js";

describe("QuitusMarketplace", () => {
  it("executa uma ordem de venda de QTS", async () => {
    const {
      issuer,
      debtor: seller,
      buyer,
      qts,
      marketplace,
    } = await deploySystem();

    await waitFor(
      await qts.write.tokenizePrecatorio(
        [
          id("precatorio-market-sell"),
          seller.account.address,
          100000n,
        ],
        { account: issuer.account },
      ),
    );

    await waitFor(
      await qts.write.approve(
        [
          marketplace.address,
          10000n,
        ],
        { account: seller.account },
      ),
    );

    const pricePerUnitWei = 1000000n;
    const amount = 10000n;

    await waitFor(
      await marketplace.write.createSellOrder(
        [
          amount,
          pricePerUnitWei,
        ],
        { account: seller.account },
      ),
    );

    await waitFor(
      await marketplace.write.fillSellOrder(
        [1n, amount],
        {
          account: buyer.account,
          value: amount * pricePerUnitWei,
        },
      ),
    );

    assert.equal(
      await qts.read.balanceOf([seller.account.address]),
      90000n,
    );

    assert.equal(
      await qts.read.balanceOf([buyer.account.address]),
      10000n,
    );

    const order = await marketplace.read.orders([1n]);

    assert.equal(order[3], 0n);
    assert.equal(order[6], false);

    assert.equal(
      await marketplace.read.totalTrades(),
      1n,
    );

    assert.equal(
      await marketplace.read.lastTradePriceWei(),
      pricePerUnitWei,
    );
  });

  it("mantém ETH em escrow numa ordem de compra e devolve o remanescente no cancelamento", async () => {
    const {
      buyer,
      marketplace,
    } = await deploySystem();

    const amount = 20000n;
    const pricePerUnitWei = 1000000n;

    await waitFor(
      await marketplace.write.createBuyOrder(
        [
          amount,
          pricePerUnitWei,
        ],
        {
          account: buyer.account,
          value: amount * pricePerUnitWei,
        },
      ),
    );

    const publicClient = await viem.getPublicClient();

    assert.equal(
      await publicClient.getBalance({
        address: marketplace.address,
      }),
      amount * pricePerUnitWei,
    );

    await waitFor(
      await marketplace.write.cancelOrder(
        [1n],
        { account: buyer.account },
      ),
    );

    assert.equal(
      await publicClient.getBalance({
        address: marketplace.address,
      }),
      0n,
    );

    const order = await marketplace.read.orders([1n]);
    assert.equal(order[3], 0n);
    assert.equal(order[6], false);
  });
});
