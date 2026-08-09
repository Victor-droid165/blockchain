# Fluxo de compensação

Este diagrama representa a **compensação atualmente implementada**. Embora `DebitusToken` já possua `registerFiscalDebt`, o `CompensationManager` ainda não utiliza `FiscalDebt` nesta operação.

```mermaid
sequenceDiagram
    actor Titular
    participant Interface
    participant Manager as CompensationManager
    participant QTS as QuitusToken
    participant Oracle as MonetaryOracle
    participant DBT as DebitusToken
    participant Blockchain

    Titular->>Interface: Solicita compensação de R$ 250,00
    Interface->>Manager: compensate(referencia, 25000)

    Manager->>QTS: syncBalance(titular)
    QTS->>Oracle: currentIndex()
    Oracle-->>QTS: índice atual
    QTS-->>Manager: saldo QTS sincronizado

    Manager->>QTS: balanceOf(titular)
    QTS-->>Manager: saldo QTS
    Manager->>DBT: balanceOf(titular)
    DBT-->>Manager: saldo DBT

    Manager->>QTS: burnForCompensation(titular, 25000)
    QTS-->>Manager: QTS queimado

    Manager->>DBT: burnForCompensation(titular, 25000)
    DBT-->>Manager: DBT queimado

    Manager->>Blockchain: CompensationExecuted
    Manager-->>Interface: Compensação concluída
    Interface-->>Titular: Exibe novos saldos
```

## Atomicidade

As duas chamadas `burnForCompensation` são executadas dentro da mesma transação de `CompensationManager.compensate`.

Se a segunda queima ou qualquer outra etapa reverter, a EVM também desfaz:

- a primeira queima;
- a marcação de `compensationReferencesUsed`;
- a atualização de `totalCompensatedByAccount`;
- qualquer sincronização de QTS realizada dentro da mesma transação.

## Limitação atual

O registro criado por:

```solidity
registerFiscalDebt(bytes32 fiscalDebtIdHash, address debtor, uint256 amount)
```

ainda não participa da compensação. A função atual exige um saldo DBT previamente emitido por `issueFiscalCredit`.

A integração de `FiscalDebt.remainingAmount` e a emissão transitória de DBT serão alterações posteriores.
