import { useState } from "react";
import type { Address } from "viem";

import { FormField } from "../components/FormField";
import { Panel } from "../components/Panel";
import { fromInternalUnits, shortAddress } from "../blockchain/utils";

type FiscalDebtTuple = readonly [Address, bigint, bigint, bigint, boolean];

export function FiscalPage({
  defaultDebtor,
  loading,
  onRegister,
  onLookup,
}: {
  defaultDebtor?: Address;
  loading: boolean;
  onRegister: (identifier: string, debtor: Address, value: string) => Promise<unknown>;
  onLookup: (identifier: string) => Promise<FiscalDebtTuple>;
}) {
  const [identifier, setIdentifier] = useState("DIVIDA-2026-001");
  const [debtor, setDebtor] = useState(defaultDebtor ?? "");
  const [value, setValue] = useState("400.00");
  const [lookupIdentifier, setLookupIdentifier] = useState("DIVIDA-2026-001");
  const [debt, setDebt] = useState<FiscalDebtTuple>();

  return (
    <div className="two-column">
      <Panel title="Registrar obrigação fiscal" description="Operação institucional da Fazenda na PoC.">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onRegister(identifier, debtor as Address, value);
          }}
        >
          <FormField label="Identificador da obrigação" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          <FormField label="Devedor" value={debtor} onChange={(e) => setDebtor(e.target.value)} placeholder="0x…" required />
          <FormField label="Valor da obrigação (R$)" value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" required />
          <button type="submit" disabled={loading}>Registrar obrigação</button>
        </form>
      </Panel>

      <Panel title="Consultar obrigação" description="Consulta o registro on-chain pelo mesmo identificador textual usado no cadastro.">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onLookup(lookupIdentifier).then(setDebt);
          }}
        >
          <FormField label="Identificador" value={lookupIdentifier} onChange={(e) => setLookupIdentifier(e.target.value)} required />
          <button type="submit">Consultar</button>
        </form>

        {debt && (
          <div className="result-card">
            <span>Devedor <strong>{shortAddress(debt[0])}</strong></span>
            <span>Original <strong>{fromInternalUnits(debt[1])}</strong></span>
            <span>Restante <strong>{fromInternalUnits(debt[2])}</strong></span>
            <span>Status <strong>{debt[4] ? "Ativa" : "Encerrada"}</strong></span>
          </div>
        )}
      </Panel>
    </div>
  );
}
