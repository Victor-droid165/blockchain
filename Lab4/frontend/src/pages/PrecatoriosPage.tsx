import { useState } from "react";
import type { Address } from "viem";

import { FormField } from "../components/FormField";
import { Panel } from "../components/Panel";

export function PrecatoriosPage({
  defaultBeneficiary,
  loading,
  onTokenize,
}: {
  defaultBeneficiary?: Address;
  loading: boolean;
  onTokenize: (identifier: string, beneficiary: Address, value: string) => Promise<unknown>;
}) {
  const [identifier, setIdentifier] = useState("PREC-2026-001");
  const [beneficiary, setBeneficiary] = useState(defaultBeneficiary ?? "");
  const [value, setValue] = useState("1000.00");

  return (
    <Panel
      title="Tokenizar precatório"
      description="O identificador textual é convertido em hash antes da transação. A validação jurídica continua fora da blockchain."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onTokenize(identifier, beneficiary as Address, value);
        }}
      >
        <FormField
          label="Identificador institucional"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          required
        />
        <FormField
          label="Beneficiário"
          value={beneficiary}
          onChange={(event) => setBeneficiary(event.target.value)}
          placeholder="0x…"
          required
        />
        <FormField
          label="Valor do precatório (R$)"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          inputMode="decimal"
          required
        />
        <button type="submit" disabled={loading}>Emitir QTS</button>
      </form>
    </Panel>
  );
}
