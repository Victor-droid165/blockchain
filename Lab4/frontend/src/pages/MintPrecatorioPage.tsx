import { useEffect, useState } from "react";
import type { Address } from "viem";

import { FormField } from "../components/FormField";
import { Panel } from "../components/Panel";

export function MintPrecatorioPage({
  defaultBeneficiary,
  isAdmin,
  loading,
  disabled,
  onMint,
}: {
  defaultBeneficiary?: Address;
  isAdmin: boolean;
  loading: boolean;
  disabled: boolean;
  onMint: (
    identifier: string,
    beneficiary: Address,
    value: string,
  ) => Promise<unknown>;
}) {
  const [identifier, setIdentifier] = useState("PREC-2026-001");
  const [beneficiary, setBeneficiary] = useState(defaultBeneficiary ?? "");
  const [value, setValue] = useState("1000.00");

  useEffect(() => {
    if (defaultBeneficiary && !beneficiary) {
      setBeneficiary(defaultBeneficiary);
    }
  }, [beneficiary, defaultBeneficiary]);

  return (
    <Panel
      title="Emitir precatório NFT"
      description="Operação institucional da PoC. A entrada é deliberadamente mínima: identificador, proprietário inicial e valor de face."
    >
      {!isAdmin && (
        <div className="notice">
          Conecte a conta administradora usada no deploy para emitir NFTs.
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onMint(
            identifier,
            beneficiary as Address,
            value,
          );
        }}
      >
        <FormField
          label="Identificador do precatório"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          hint="O frontend envia o hash deste identificador para a blockchain."
          required
        />
        <FormField
          label="Proprietário inicial"
          value={beneficiary}
          onChange={(event) => setBeneficiary(event.target.value)}
          placeholder="0x…"
          required
        />
        <FormField
          label="Valor de face (R$)"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          inputMode="decimal"
          required
        />
        <button
          type="submit"
          disabled={!isAdmin || loading || disabled}
        >
          Criar NFT
        </button>
      </form>
    </Panel>
  );
}
