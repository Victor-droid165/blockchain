import { useState } from "react";
import type { Address } from "viem";

import { FormField } from "../components/FormField";
import { Panel } from "../components/Panel";
import { StatCard } from "../components/StatCard";
import type { ProtocolStats } from "../blockchain/types";
import { formatIndex, fromInternalUnits } from "../blockchain/utils";

export function DashboardPage({
  account,
  stats,
  issuer,
  loading,
  onUpdateIndex,
  onSync,
}: {
  account?: Address;
  stats: ProtocolStats;
  issuer: Address;
  loading: boolean;
  onUpdateIndex: (index: bigint) => Promise<unknown>;
  onSync: (account: Address) => Promise<unknown>;
}) {
  const [newIndex, setNewIndex] = useState("1010000");

  return (
    <div className="page-stack">
      <div className="stats-grid">
        <StatCard label="Saldo QTS" value={fromInternalUnits(stats.qtsBalance)} />
        <StatCard
          label="Saldo corrigido"
          value={fromInternalUnits(stats.qtsPreviewBalance)}
          detail="Preview pelo índice atual"
        />
        <StatCard label="Índice monetário" value={formatIndex(stats.currentIndex)} />
        <StatCard label="Total compensado" value={fromInternalUnits(stats.totalCompensated)} />
        <StatCard label="Negociações" value={stats.totalTrades.toString()} />
        <StatCard label="Último preço" value={`${stats.lastTradePriceWei} wei`} />
      </div>

      <div className="two-column">
        <Panel
          title="Atualização monetária"
          description="Operação institucional do mock de oráculo. Apenas o operator configurado no deploy pode executar."
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void onUpdateIndex(BigInt(newIndex));
            }}
          >
            <FormField
              label="Novo índice cumulativo"
              value={newIndex}
              onChange={(event) => setNewIndex(event.target.value)}
              inputMode="numeric"
              required
            />
            <button type="submit" disabled={loading}>Atualizar índice</button>
          </form>
        </Panel>

        <Panel
          title="Sincronizar QTS"
          description="Materializa no saldo persistido a correção já visível no preview."
        >
          <div className="definition-list">
            <span>Emissor/operator</span>
            <code>{issuer}</code>
          </div>
          <button
            onClick={() => account && void onSync(account)}
            disabled={!account || loading}
          >
            Sincronizar minha conta
          </button>
        </Panel>
      </div>
    </div>
  );
}
