# Roteiro de demonstração presencial

## Cenário atual

Um titular recebe QTS referentes a um precatório de **R$ 1.000,00**, o índice monetário da PoC é atualizado em **1%**, uma obrigação fiscal de **R$ 400,00** é registrada e, para manter compatibilidade com a compensação atualmente implementada, também são emitidos **R$ 400,00 em DBT** para a mesma conta.

Depois, o titular realiza uma compensação de **R$ 250,00**.

Os contratos usam unidades com duas casas decimais:

- R$ 1.000,00 → `100000`;
- R$ 1.010,00 → `101000`;
- R$ 400,00 → `40000`;
- R$ 250,00 → `25000`.

> `FiscalDebt` já existe no código, mas ainda não é consumido por `CompensationManager`. A emissão por `issueFiscalCredit` continua necessária no fluxo atual.

## Preparação no Remix

1. Abrir os arquivos `.sol` em `contracts/` e `contracts/interfaces/`;
2. Compilar com Solidity `0.8.24` ou uma versão `0.8.x` compatível;
3. Em **Deploy & Run**, usar `Remix VM`;
4. Manter a primeira conta como emissor institucional e operador do oráculo;
5. Separar a segunda conta para representar o titular/devedor.

## Deploy

1. Implantar `MonetaryOracle`, passando o endereço da primeira conta como `oracleOperator`;
2. Implantar `QuitusToken`, passando o endereço da primeira conta como `tokenIssuer` e o endereço do `MonetaryOracle`;
3. Implantar `DebitusToken`, passando a primeira conta como `tokenIssuer`;
4. Implantar `CompensationManager`, passando os endereços de QTS e DBT;
5. Nos dois tokens, chamar `setCompensationManager` com o endereço do gerenciador.

## Valores de exemplo

Identificador do precatório:

```text
0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
```

Identificador do crédito fiscal:

```text
0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
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

- transação confirmada;
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

### 3. Registrar a obrigação fiscal

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
- `active = true`.

Esse registro ainda não é alterado pela compensação atual.

### 4. Emitir o DBT usado pela compensação atual

Na conta emissora, chamar em `DebitusToken`:

```text
issueFiscalCredit(
  0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb,
  ENDERECO_DA_SEGUNDA_CONTA,
  40000
)
```

Mostrar:

- evento `FiscalCreditIssued`;
- `balanceOf(SEGUNDA_CONTA) = 40000`;
- registro em `fiscalCredits(idHash)`.

### 5. Executar a compensação

Trocar para a segunda conta e chamar em `CompensationManager`:

```text
compensate(
  0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc,
  25000
)
```

Mostrar o estado final:

- saldo QTS: `76000`, equivalente a R$ 760,00;
- saldo DBT: `15000`, equivalente a R$ 150,00;
- `totalCompensatedByAccount(SEGUNDA_CONTA) = 25000`;
- `compensationReferencesUsed(referenceId) = true`;
- evento `CompensationExecuted`;
- `fiscalDebts(idHash).remainingAmount` continua `40000`, pois essa integração ainda não foi implementada.

## Demonstração da atomicidade

Tentar compensar `20000` com outra referência. O saldo DBT disponível será apenas `15000`, então a operação deverá falhar.

Após a falha, mostrar que:

- saldo QTS continua `76000`;
- saldo DBT continua `15000`;
- a nova referência não ficou marcada como utilizada.

Isso evidencia a atomicidade: as duas queimas estão na mesma transação EVM; se uma etapa falha, nenhuma alteração parcial permanece.
