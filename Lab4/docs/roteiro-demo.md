# Roteiro de demonstração presencial

## Cenário atual

Um titular recebe QTS referentes a um precatório de **R$ 1.000,00**, o índice monetário da PoC é atualizado em **1%** e uma obrigação fiscal de **R$ 400,00** é registrada para a mesma conta.

Depois, o titular realiza uma compensação de **R$ 250,00** usando seus QTS.

Os contratos usam unidades com duas casas decimais:

- R$ 1.000,00 → `100000`;
- R$ 1.010,00 → `101000`;
- R$ 400,00 → `40000`;
- R$ 250,00 → `25000`.

O DBT não precisa ser emitido antecipadamente. Durante a compensação, `DebitusToken` emite e queima `25000` DBT na mesma transação.

## Preparação no Remix

1. Abrir os arquivos `.sol` em `contracts/` e `contracts/interfaces/`;
2. Compilar com Solidity `0.8.24` ou uma versão `0.8.x` compatível;
3. Em **Deploy & Run**, usar `Remix VM`;
4. Manter a primeira conta como emissor institucional e operador do oráculo;
5. Separar a segunda conta para representar o titular/devedor.

## Deploy

1. Implantar `MonetaryOracle`, passando o endereço da primeira conta como `oracleOperator`;
2. Implantar `QuitusToken`, passando a primeira conta como `tokenIssuer` e o endereço do `MonetaryOracle`;
3. Implantar `DebitusToken`, passando a primeira conta como `tokenIssuer`;
4. Implantar `CompensationManager`, passando os endereços de QTS e DBT;
5. Nos dois tokens, chamar `setCompensationManager` com o endereço do gerenciador;
6. Implantar `QuitusMarketplace` passando o endereço de `QuitusToken`.

## Valores de exemplo

Identificador do precatório:

```text
0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

Identificador da obrigação fiscal:

```text
0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
```

Referência da compensação:

```text
0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc
```

## Operações

### 1. Tokenizar o precatório

Na conta emissora, chamar em `QuitusToken`:

```text
tokenizePrecatorio(
  0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,
  ENDERECO_DA_SEGUNDA_CONTA,
  100000
)
```

Mostrar:

- evento `PrecatorioTokenized`;
- `balanceOf(SEGUNDA_CONTA) = 100000`;
- registro em `precatorios(idHash)`;
- `lastAppliedIndex(SEGUNDA_CONTA) = 1000000`.

### 2. Atualizar o índice monetário

Na conta operadora, chamar em `MonetaryOracle`:

```text
updateIndex(1010000)
```

Mostrar:

- evento `MonetaryIndexUpdated`;
- `currentIndex = 1010000`.

Em `QuitusToken`, chamar:

```text
previewBalance(ENDERECO_DA_SEGUNDA_CONTA)
```

Resultado esperado:

```text
101000
```

Depois chamar:

```text
syncBalance(ENDERECO_DA_SEGUNDA_CONTA)
```

Mostrar:

- `balanceOf(SEGUNDA_CONTA) = 101000`;
- aumento de `1000` unidades de QTS;
- evento `MonetaryAdjustmentApplied`.

### 3. Demonstrar o mercado secundário

Usando a segunda conta, aprovar o marketplace para movimentar `10000` unidades:

```text
approve(ENDERECO_DO_MARKETPLACE, 10000)
```

Criar uma ordem de venda em `QuitusMarketplace`:

```text
createSellOrder(10000, PRECO_EM_WEI_POR_UNIDADE)
```

Mostrar:

- evento `OrderCreated`;
- `orders(orderId).remaining = 10000`;
- lado `Sell`;
- preço configurado.

Com uma terceira conta, preencher a ordem enviando exatamente:

```text
10000 * PRECO_EM_WEI_POR_UNIDADE
```

em ETH de teste para:

```text
fillSellOrder(orderId, 10000)
```

Mostrar:

- evento `OrderFilled`;
- `orders(orderId).active = false`;
- `totalTrades = 1`;
- `lastTradePriceWei` igual ao preço da ordem;
- transferência de `10000` QTS da segunda para a terceira conta.

> Para continuar a demonstração de compensação usando a segunda conta, tokenize inicialmente `110000` em vez de `100000`, ou recrie o cenário em uma nova execução. O objetivo desta seção é demonstrar o mecanismo do mercado de forma isolada.

### 4. Registrar a obrigação fiscal

Na conta emissora, chamar em `DebitusToken`:

```text
registerFiscalDebt(
  0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd,
  ENDERECO_DA_SEGUNDA_CONTA,
  40000
)
```

Mostrar:

- evento `FiscalDebtRegistered`;
- `originalAmount = 40000`;
- `remainingAmount = 40000`;
- `active = true`;
- `balanceOf(SEGUNDA_CONTA) = 0` em DBT antes da compensação.

### 5. Executar a compensação

Trocar para a segunda conta e chamar em `CompensationManager`:

```text
compensate(
  0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc,
  0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd,
  25000
)
```

Mostrar o estado final:

- saldo QTS: `76000`, equivalente a R$ 760,00;
- saldo DBT: `0`;
- `fiscalDebts(idHash).remainingAmount = 15000`;
- `fiscalDebts(idHash).active = true`;
- `totalCompensatedByAccount(SEGUNDA_CONTA) = 25000`;
- `compensationReferencesUsed(referenceId) = true`;
- eventos `Transfer` de mint/burn de DBT;
- evento `FiscalDebtCompensated`;
- evento `CompensationExecuted`.

## Demonstração da atomicidade

Tentar compensar `20000` usando a mesma obrigação fiscal, mas com uma nova referência.

Nesse momento:

```text
QTS disponível = 76000
obrigação fiscal restante = 15000
```

O manager consegue iniciar a operação e queimar QTS, mas `DebitusToken` rejeita a parcela porque `20000 > 15000`. O revert desfaz toda a transação.

Após a falha, mostrar que:

- saldo QTS continua `76000`;
- `remainingAmount` continua `15000`;
- `totalCompensatedByAccount` continua `25000`;
- a nova referência não ficou marcada como utilizada.

Esse cenário evidencia a atomicidade: uma falha no processamento da obrigação fiscal também reverte a queima de QTS executada anteriormente na mesma transação.
