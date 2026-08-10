import { useState } from "react";

import { FormField } from "../components/FormField";
import { Panel } from "../components/Panel";

export function CompensationPage({
  loading,
  onCompensate,
}: {
  loading: boolean;
  onCompensate: (reference: string, debtIdentifier: string, value: string) => Promise<unknown>;
}) {
  const [reference, setReference] = useState("COMP-2026-001");
  const [debtIdentifier, setDebtIdentifier] = useState("DIVIDA-2026-001");
  const [value, setValue] = useState("250.00");

  return (
    <Panel
      title="Compensar obrigação fiscal"
      description="QTS é queimado, DBT é materializado/queimado e o saldo da obrigação é reduzido na mesma transação."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onCompensate(reference, debtIdentifier, value);
        }}
      >
        <FormField label="Referência única da compensação" value={reference} onChange={(e) => setReference(e.target.value)} required />
        <FormField label="Identificador da obrigação fiscal" value={debtIdentifier} onChange={(e) => setDebtIdentifier(e.target.value)} required />
        <FormField label="Valor a compensar (R$)" value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" required />
        <button type="submit" disabled={loading}>Executar compensação</button>
      </form>
    </Panel>
  );
}
