import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deploySystem,
  id,
  waitFor,
} from "./helpers.js";

describe("CompensationManager", () => {
  it("compensa QTS e reduz a obrigação fiscal atomicamente", async () => {
    const {
      issuer,
      debtor,
      oracle,
      qts,
      dbt,
      manager,
    } = await deploySystem();

    const precatorioId = id("precatorio-compensacao");
    const fiscalDebtId = id("divida-compensacao");
    const referenceId = id("compensacao-1");

    await waitFor(
      await qts.write.tokenizePrecatorio(
        [
          precatorioId,
          debtor.account.address,
          100000n,
        ],
        { account: issuer.account },
      ),
    );

    await waitFor(
      await oracle.write.updateIndex(
        [1010000n],
        { account: issuer.account },
      ),
    );

    await waitFor(
      await dbt.write.registerFiscalDebt(
        [
          fiscalDebtId,
          debtor.account.address,
          40000n,
        ],
        { account: issuer.account },
      ),
    );

    await waitFor(
      await manager.write.compensate(
        [
          referenceId,
          fiscalDebtId,
          25000n,
        ],
        { account: debtor.account },
      ),
    );

    assert.equal(
      await qts.read.balanceOf([debtor.account.address]),
      76000n,
    );

    assert.equal(
      await dbt.read.balanceOf([debtor.account.address]),
      0n,
    );

    const debt = await dbt.read.fiscalDebts([fiscalDebtId]);

    assert.equal(debt[1], 40000n);
    assert.equal(debt[2], 15000n);
    assert.equal(debt[4], true);

    assert.equal(
      await manager.read.totalCompensatedByAccount([
        debtor.account.address,
      ]),
      25000n,
    );

    assert.equal(
      await manager.read.compensationReferencesUsed([referenceId]),
      true,
    );
  });

  it("reverte também a queima de QTS quando a dívida restante é insuficiente", async () => {
    const {
      issuer,
      debtor,
      qts,
      dbt,
      manager,
    } = await deploySystem();

    const precatorioId = id("precatorio-atomicidade");
    const fiscalDebtId = id("divida-atomicidade");
    const firstReference = id("compensacao-ok");
    const failingReference = id("compensacao-falha");

    await waitFor(
      await qts.write.tokenizePrecatorio(
        [
          precatorioId,
          debtor.account.address,
          100000n,
        ],
        { account: issuer.account },
      ),
    );

    await waitFor(
      await dbt.write.registerFiscalDebt(
        [
          fiscalDebtId,
          debtor.account.address,
          40000n,
        ],
        { account: issuer.account },
      ),
    );

    await waitFor(
      await manager.write.compensate(
        [
          firstReference,
          fiscalDebtId,
          25000n,
        ],
        { account: debtor.account },
      ),
    );

    assert.equal(
      await qts.read.balanceOf([debtor.account.address]),
      75000n,
    );

    await assert.rejects(
      manager.write.compensate(
        [
          failingReference,
          fiscalDebtId,
          20000n,
        ],
        { account: debtor.account },
      ),
    );

    assert.equal(
      await qts.read.balanceOf([debtor.account.address]),
      75000n,
    );

    const debt = await dbt.read.fiscalDebts([fiscalDebtId]);
    assert.equal(debt[2], 15000n);

    assert.equal(
      await manager.read.totalCompensatedByAccount([
        debtor.account.address,
      ]),
      25000n,
    );

    assert.equal(
      await manager.read.compensationReferencesUsed([
        failingReference,
      ]),
      false,
    );
  });
});
