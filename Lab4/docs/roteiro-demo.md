# Roteiro de demonstração presencial

## Cenário

Um credor possui um precatório tokenizado de **R$ 1.000,00** e um crédito fiscal tokenizado de **R$ 400,00**. Ele realiza uma compensação de **R$ 250,00**.

Os contratos usam unidades de centavo:

- R$ 1.000,00 → `100000`;
- R$ 400,00 → `40000`;
- R$ 250,00 → `25000`.

## Preparação no Remix

1. Abrir os arquivos `.sol` em `contracts/` e `contracts/interfaces/`;
2. Compilar com Solidity `0.8.24` ou uma versão `0.8.x` compatível;
3. Em **Deploy & Run**, usar `Remix VM`;
4. Manter a primeira conta como emissor institucional e operador do oráculo;
5. Separar a segunda conta para representar o credor.

## Deploy

1. Implantar `MonetaryOracle`, passando o endereço da primeira conta como `oracleOperator`;
2. Implantar `QuitusToken`, passando o endereço da primeira conta como `tokenIssuer` e o endereço do `MonetaryOracle`;
3. Implantar `DebitusToken`, passando o mesmo endereço como `tokenIssuer`;
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

- Transação confirmada;
- Evento `PrecatorioTokenized`;
- `balanceOf(SEGUNDA_CONTA) = 100000`;
- Registro em `precatorios(idHash)`.

### 2. Emitir o crédito fiscal

Na conta emissora, chamar em `DebitusToken`:

```text
issueFiscalCredit(
  0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb,
  ENDERECO_DA_SEGUNDA_CONTA,
  40000
)
```

Mostrar:

- Evento `FiscalCreditIssued`;
- `balanceOf(SEGUNDA_CONTA) = 40000`;
- Registro em `fiscalCredits(idHash)`.

### 3. Executar a compensação

Trocar para a segunda conta e chamar em `CompensationManager`:

```text
compensate(
  0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc,
  25000
)
```

Mostrar o estado final:

- Saldo QTS: `75000`, equivalente a R$ 750,00;
- Saldo DBT: `15000`, equivalente a R$ 150,00;
- `totalCompensatedByAccount(SEGUNDA_CONTA) = 25000`;
- `compensationReferencesUsed(referenceId) = true`;
- Evento `CompensationExecuted`.

## Demonstração da atomicidade

Tentar compensar `20000` com outra referência. O saldo DBT disponível será apenas `15000`, então a operação deverá falhar. Após a falha, mostrar que o saldo QTS também continua `75000`: nenhuma queima parcial permaneceu.

Isso evidencia a atomicidade: as duas queimas estão na mesma transação da EVM; se uma falha, nenhuma alteração permanece.
