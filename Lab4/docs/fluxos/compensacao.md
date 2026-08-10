# Fluxo de compensação

```mermaid
sequenceDiagram
    actor Devedor
    participant FE as Frontend React
    participant Wallet as Carteira
    participant Manager as CompensationManager
    participant QTS as QuitusToken
    participant Oracle as MonetaryOracle
    participant DBT as DebitusToken

    Devedor->>FE: Informa referência, obrigação e valor
    FE->>FE: Calcula hashes dos identificadores
    FE->>Wallet: Solicita assinatura
    Wallet->>Manager: compensate(referencia, fiscalDebtIdHash, valor)

    Manager->>QTS: syncBalance(devedor)
    QTS->>Oracle: currentIndex()
    Oracle-->>QTS: índice atual
    Manager->>QTS: balanceOf(devedor)
    QTS-->>Manager: saldo QTS

    Manager->>QTS: burnForCompensation(devedor, valor)
    Manager->>DBT: settleFiscalDebtForCompensation(...)
    DBT->>DBT: Valida obrigação/devedor/remainingAmount
    DBT->>DBT: Mint DBT da parcela
    DBT->>DBT: Burn do mesmo DBT
    DBT->>DBT: Reduz remainingAmount
    DBT-->>Manager: FiscalDebtCompensated
    Manager-->>FE: CompensationExecuted
```

## DBT transitório

O devedor não precisa possuir DBT previamente. Em uma compensação de `25000` unidades:

```text
saldo DBT antes:  0
mint durante:     25000
burn durante:     25000
saldo DBT depois: 0
```

O DBT registra tecnicamente a parcela fiscal processada sem criar saldo persistente para o usuário.

## Atomicidade

Todas as alterações pertencem à mesma transação EVM. Se `DebitusToken` rejeitar a obrigação — por exemplo, porque `remainingAmount` é insuficiente — também são revertidos a queima de QTS, a marcação da referência e qualquer sincronização feita naquela transação.
