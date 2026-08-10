import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deploySystem,
  id,
  waitFor,
} from "./helpers.js";

describe("MonetaryOracle + QuitusToken", () => {
  it("materializa a atualização monetária do QTS", async () => {
    const {
      issuer,
      debtor,
      oracle,
      qts,
    } = await deploySystem();

    await waitFor(
      await qts.write.tokenizePrecatorio(
        [
          id("precatorio-oracle"),
          debtor.account.address,
          100000n,
        ],
        { account: issuer.account },
      ),
    );

    assert.equal(
      await qts.read.balanceOf([debtor.account.address]),
      100000n,
    );

    await waitFor(
      await oracle.write.updateIndex(
        [1010000n],
        { account: issuer.account },
      ),
    );

    assert.equal(
      await qts.read.previewBalance([debtor.account.address]),
      101000n,
    );

    await waitFor(
      await qts.write.syncBalance([debtor.account.address]),
    );

    assert.equal(
      await qts.read.balanceOf([debtor.account.address]),
      101000n,
    );

    assert.equal(
      await qts.read.lastAppliedIndex([debtor.account.address]),
      1010000n,
    );

    assert.equal(
      await qts.read.totalSupply(),
      101000n,
    );
  });

  it("impede que uma conta não autorizada atualize o índice", async () => {
    const {
      debtor,
      oracle,
    } = await deploySystem();

    await assert.rejects(
      oracle.write.updateIndex(
        [1010000n],
        { account: debtor.account },
      ),
    );

    assert.equal(
      await oracle.read.currentIndex(),
      1000000n,
    );
  });
});
