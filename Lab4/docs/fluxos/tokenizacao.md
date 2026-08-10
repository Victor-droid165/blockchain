# Fluxo de tokenização de precatório

## Tokenização

```mermaid
sequenceDiagram
    actor Instituicao as Instituição autorizada
    participant FE as Frontend React
    participant Wallet as Carteira
    participant QTS as QuitusToken
    participant Oracle as MonetaryOracle

    Instituicao->>FE: Informa identificador, beneficiário e valor
    FE->>FE: Calcula hash do identificador
    FE->>Wallet: Solicita assinatura da transação
    Wallet->>QTS: tokenizePrecatorio(hash, beneficiario, valor)
    QTS->>QTS: Valida identificador e duplicidade
    QTS->>Oracle: currentIndex()
    Oracle-->>QTS: índice atual
    QTS->>QTS: Registra precatório e emite QTS
    QTS-->>FE: Recibo / eventos
    FE-->>Instituicao: Atualiza o estado exibido
```

A interface não valida juridicamente o precatório. Ela apenas transforma o identificador informado em `bytes32` e envia a operação autorizada ao contrato.

`QuitusToken` usa duas casas decimais: `100000` unidades internas representam R$ 1.000,00.

## Atualização monetária

```mermaid
sequenceDiagram
    actor Operador as Operador do oráculo
    actor Titular
    participant FE as Frontend React
    participant Oracle as MonetaryOracle
    participant QTS as QuitusToken

    Operador->>FE: Informa novo índice
    FE->>Oracle: updateIndex(novoIndice)
    Oracle-->>FE: MonetaryIndexUpdated

    Titular->>FE: Abre visão geral
    FE->>QTS: previewBalance(titular)
    QTS->>Oracle: currentIndex()
    Oracle-->>QTS: índice atual
    QTS-->>FE: saldo corrigido

    Titular->>FE: Sincroniza QTS
    FE->>QTS: syncBalance(titular)
    QTS->>QTS: Materializa correção como QTS adicional
    QTS-->>FE: MonetaryAdjustmentApplied
```

A sincronização também ocorre automaticamente antes de transferências, mints e queimas que alterem o saldo.
