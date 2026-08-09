# Fluxo de tokenização de precatório

## Tokenização atualmente implementada

```mermaid
sequenceDiagram
    actor Instituicao as Instituição autorizada
    participant Backend
    participant QTS as QuitusToken
    participant Oracle as MonetaryOracle
    participant Blockchain

    Instituicao->>Backend: Envia dados do precatório
    Backend->>Backend: Valida dados e calcula hash
    Backend->>QTS: tokenizePrecatorio(hash, beneficiario, valor)
    QTS->>QTS: Verifica se já foi tokenizado
    QTS->>QTS: Registra precatório
    QTS->>Oracle: currentIndex()
    Oracle-->>QTS: índice atual
    QTS->>QTS: Inicializa/sincroniza índice do beneficiário
    QTS->>QTS: Emite QTS ao beneficiário
    QTS->>Blockchain: Emite Transfer + PrecatorioTokenized
    QTS-->>Backend: Transação concluída
    Backend-->>Instituicao: Retorna hash da transação
```

`QuitusToken` usa duas casas decimais. Por exemplo, `100000` unidades representam R$ 1.000,00.

## Atualização monetária

Depois da tokenização, o operador autorizado pode publicar um novo índice em `MonetaryOracle`.

```mermaid
sequenceDiagram
    actor Operador as Operador do oráculo
    actor Usuario as Titular de QTS
    participant Oracle as MonetaryOracle
    participant QTS as QuitusToken
    participant Blockchain

    Operador->>Oracle: updateIndex(novoIndice)
    Oracle->>Blockchain: MonetaryIndexUpdated

    Usuario->>QTS: previewBalance(usuario)
    QTS->>Oracle: currentIndex()
    Oracle-->>QTS: novoIndice
    QTS-->>Usuario: saldo corrigido sem alterar estado

    Usuario->>QTS: syncBalance(usuario)
    QTS->>Oracle: currentIndex()
    Oracle-->>QTS: novoIndice
    QTS->>QTS: Calcula correção acumulada
    QTS->>QTS: Materializa diferença como QTS adicional
    QTS->>Blockchain: Transfer(0x0, usuario, diferenca)
    QTS->>Blockchain: MonetaryAdjustmentApplied
```

A sincronização também ocorre automaticamente antes de transferências, mint e burn que alterem o saldo da conta.
