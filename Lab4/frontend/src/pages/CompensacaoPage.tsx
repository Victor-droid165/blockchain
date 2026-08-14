import { useMemo, useState } from "react";
import type { Address } from "viem";

import type {
  CompensationRecord,
  FiscalDebt,
  OracleInfo,
  PrecatorioAsset,
} from "../blockchain/types";
import {
  applyIndex,
  formatTimestamp,
  fromCents,
  fromIndex,
  shortAddress,
} from "../blockchain/utils";
import { FormField } from "../components/FormField";
import { Panel } from "../components/Panel";

export function CompensacaoPage({
  account,
  isAdmin,
  available,
  disabled,
  oracleInfo,
  ownedPrecatorios,
  myDebts,
  compensations,
  loading,
  onUpdateIndex,
  onRegisterDebt,
  onCompensate,
}: {
  account?: Address;
  isAdmin: boolean;
  available: boolean;
  disabled: boolean;
  oracleInfo: OracleInfo;
  ownedPrecatorios: PrecatorioAsset[];
  myDebts: FiscalDebt[];
  compensations: CompensationRecord[];
  loading: boolean;
  onUpdateIndex: (newIndex: string) => Promise<unknown>;
  onRegisterDebt: (
    identifier: string,
    debtor: Address,
    amountReais: string,
  ) => Promise<unknown>;
  onCompensate: (tokenId: bigint, debtId: bigint) => Promise<unknown>;
}) {
  const [newIndex, setNewIndex] = useState("1.05");

  const [debtIdentifier, setDebtIdentifier] = useState("CDA-2026-001");
  const [debtDebtor, setDebtDebtor] = useState(account ?? "");
  const [debtAmount, setDebtAmount] = useState("1000.00");

  const [tokenId, setTokenId] = useState("");
  const [debtId, setDebtId] = useState("");

  const selectedAsset = useMemo(
    () => ownedPrecatorios.find((asset) => asset.tokenId.toString() === tokenId),
    [ownedPrecatorios, tokenId],
  );
  const selectedDebt = useMemo(
    () => myDebts.find((debt) => debt.id.toString() === debtId),
    [myDebts, debtId],
  );

  const preview =
    selectedAsset && oracleInfo
      ? applyIndex(selectedAsset.faceValue, oracleInfo.currentIndex)
      : undefined;
  const debtTooSmall =
    preview !== undefined && selectedDebt !== undefined && selectedDebt.outstanding < preview;

  if (!available) {
    return (
      <Panel
        title="Oráculo e compensação"
        description="MonetaryOracle e CompensationManager não fazem parte deste deployment."
      >
        <div className="notice">
          O deployment carregado não inclui `monetaryOracle` e
          `compensationManager`. Rode um novo deploy (local ou Sepolia) com o
          script atual para expor este fluxo.
        </div>
      </Panel>
    );
  }

  return (
    <div className="page-stack">
      <div className="two-column">
        <Panel
          title="Índice de correção monetária"
          description="MonetaryOracle publica um fator acumulado; o valor corrigido de um precatório é faceValue × índice."
        >
          <div className="result-card">
            <span>
              Índice vigente
              <strong>{fromIndex(oracleInfo.currentIndex)}</strong>
            </span>
            <span>
              Última publicação
              <strong>{formatTimestamp(oracleInfo.lastUpdateAt)}</strong>
            </span>
            <span>
              Publicações totais
              <strong>{oracleInfo.totalUpdates.toString()}</strong>
            </span>
          </div>

          {!isAdmin ? (
            <div className="notice">
              Somente a conta administradora pode publicar um novo índice.
            </div>
          ) : (
            <form
              className="inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                void onUpdateIndex(newIndex);
              }}
            >
              <FormField
                label="Novo índice (ex.: 1.05 = correção de 5%)"
                value={newIndex}
                onChange={(event) => setNewIndex(event.target.value)}
                inputMode="decimal"
                required
              />
              <button type="submit" disabled={loading || disabled}>
                Publicar índice
              </button>
            </form>
          )}
        </Panel>

        <Panel
          title="Registrar débito fiscal (mock)"
          description="Papel da Fazenda na PoC: registra um débito que poderá ser abatido por um precatório do mesmo devedor."
        >
          {!isAdmin ? (
            <div className="notice">
              Somente a conta administradora registra débitos fiscais.
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void onRegisterDebt(debtIdentifier, debtDebtor as Address, debtAmount);
              }}
            >
              <FormField
                label="Identificador do débito (ex.: CDA)"
                value={debtIdentifier}
                onChange={(event) => setDebtIdentifier(event.target.value)}
                required
              />
              <FormField
                label="Devedor"
                value={debtDebtor}
                onChange={(event) => setDebtDebtor(event.target.value)}
                placeholder="0x…"
                required
              />
              <FormField
                label="Valor do débito (R$)"
                value={debtAmount}
                onChange={(event) => setDebtAmount(event.target.value)}
                inputMode="decimal"
                required
              />
              <button type="submit" disabled={loading || disabled}>
                Registrar débito
              </button>
            </form>
          )}
        </Panel>
      </div>

      <Panel
        title="Compensar um precatório"
        description="Queima o NFT e abate o débito pelo valor corrigido, em uma única transação. Exige ser dono do NFT e devedor do débito selecionado."
      >
        {!account ? (
          <div className="notice">Conecte a carteira para compensar um precatório.</div>
        ) : myDebts.length === 0 ? (
          <div className="empty-inline">
            Nenhum débito fiscal em aberto para esta conta.
          </div>
        ) : ownedPrecatorios.length === 0 ? (
          <div className="empty-inline">
            Esta conta não possui precatórios para compensar.
          </div>
        ) : (
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              void onCompensate(BigInt(tokenId), BigInt(debtId));
            }}
          >
            <label className="field">
              <span>Precatório</span>
              <select
                value={tokenId}
                onChange={(event) => setTokenId(event.target.value)}
                required
              >
                <option value="">Selecione um NFT</option>
                {ownedPrecatorios.map((asset) => (
                  <option key={asset.tokenId.toString()} value={asset.tokenId.toString()}>
                    #{asset.tokenId.toString()} · {fromCents(asset.faceValue)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Débito fiscal</span>
              <select
                value={debtId}
                onChange={(event) => setDebtId(event.target.value)}
                required
              >
                <option value="">Selecione um débito</option>
                {myDebts.map((debt) => (
                  <option key={debt.id.toString()} value={debt.id.toString()}>
                    #{debt.id.toString()} · saldo {fromCents(debt.outstanding)}
                  </option>
                ))}
              </select>
            </label>

            {preview !== undefined && (
              <div className="result-card form-span">
                <span>
                  Crédito corrigido (a abater)
                  <strong>{fromCents(preview)}</strong>
                </span>
                {selectedDebt && (
                  <span>
                    Saldo restante após compensar
                    <strong>
                      {debtTooSmall
                        ? "Débito insuficiente"
                        : fromCents(selectedDebt.outstanding - preview)}
                    </strong>
                  </span>
                )}
              </div>
            )}

            {debtTooSmall && (
              <div className="market-warning form-span">
                O débito selecionado não comporta o crédito corrigido deste
                precatório; a compensação seria revertida on-chain.
              </div>
            )}

            <button
              type="submit"
              disabled={loading || disabled || !tokenId || !debtId || debtTooSmall}
            >
              Compensar (queimar NFT e abater débito)
            </button>
          </form>
        )}
      </Panel>

      <Panel
        title="Termos de quitação"
        description="Registro permanente de cada compensação executada, consultável on-chain."
      >
        {compensations.length === 0 ? (
          <div className="empty-inline">Nenhuma compensação executada ainda.</div>
        ) : (
          <table className="sales-table">
            <thead>
              <tr>
                <th>Precatório</th>
                <th>Débito</th>
                <th>Credor</th>
                <th>Valor de face</th>
                <th>Valor corrigido</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {compensations.map((record) => (
                <tr key={record.id.toString()}>
                  <td>#{record.tokenId.toString()}</td>
                  <td>#{record.debtId.toString()}</td>
                  <td title={record.creditor}>{shortAddress(record.creditor)}</td>
                  <td>{fromCents(record.faceValue)}</td>
                  <td>{fromCents(record.adjustedValue)}</td>
                  <td>{formatTimestamp(record.executedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
