# Fluxo de compensação

Este diagrama representa a compensação atualmente implementada.

```mermaid
sequenceDiagram
    actor Devedor
    participant Interface
    participant Manager as CompensationManager
    participant QTS as QuitusToken
    participant Oracle as MonetaryOracle
    participant DBT as DebitusToken
    participant Blockchain

    Devedor->>Interface: Solicita compensação
    Interface->>Manager: compensate(referencia, fiscalDebtIdHash, valor)

    Manager->>QTS: syncBalance(devedor)
    QTS->>Oracle: currentIndex()
    Oracle-->>QTS: índice atual
    QTS-->>Manager: saldo QTS sincronizado

    Manager->>QTS: balanceOf(devedor)
    QTS-->>Manager: saldo QTS

    Manager->>QTS: burnForCompensation(devedor, valor)
    QTS-->>Manager: QTS queimado

    Manager->>DBT: settleFiscalDebtForCompensation(fiscalDebtIdHash, devedor, valor)
    DBT->>DBT: Valida obrigação, devedor e remainingAmount
    DBT->>DBT: Emite DBT da parcela
    DBT->>DBT: Queima o mesmo DBT
    DBT->>DBT: Reduz remainingAmount
    DBT->>Blockchain: FiscalDebtCompensated

    Manager->>Blockchain: CompensationExecuted
    Manager-->>Interface: Compensação concluída
    Interface-->>Devedor: Exibe novos saldos
```

## DBT transitório

O devedor não precisa possuir DBT antes da operação.

Para uma compensação de `25000` unidades:

```text
saldo DBT antes:  0
mint durante:     25000
burn durante:     25000
saldo DBT depois: 0
```

Os eventos `Transfer` registram a emissão e a queima, enquanto `FiscalDebtCompensated` registra a redução da obrigação fiscal.

## Atomicidade

Todas as operações são executadas dentro da mesma transação iniciada por `CompensationManager.compensate`.

Por exemplo, o manager queima QTS antes de chamar `settleFiscalDebtForCompensation`. Se `DebitusToken` detectar que `remainingAmount` é insuficiente e reverter, a EVM também desfaz:

- a queima de QTS;
- a marcação de `compensationReferencesUsed`;
- a sincronização monetária de QTS feita na transação;
- qualquer outra alteração anterior daquela compensação.

Assim, não existe estado persistido com apenas uma parte da compensação executada.
