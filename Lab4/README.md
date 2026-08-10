# Lab 4 — Projeto 4: Tokenização de Precatórios e Créditos Fiscais

## Equipe

- Douglas Alves de Sousa
- Maria Luiza Galdino Medeiros
- Nívea Calébia Felix dos Santos
- Victor Emanuel Barbosa Rodrigues

## Problema

O projeto propõe representar precatórios por meio do token **Quitus (QTS)** e créditos fiscais por meio do token **Debitus (DBT)**, permitindo uma compensação indivisível entre as duas obrigações.

A proposta completa também prevê atualização monetária por oráculo, mercado secundário e uma interface para acompanhamento das operações.

## Entrega 1

A Entrega 1 estabeleceu a arquitetura preliminar e os primeiros contratos funcionais.

| Item | Arquivo |
|---|---|
| Diagrama de arquitetura | [`docs/arquitetura.md`](./docs/arquitetura.md) |
| Diagrama de classes | [`docs/contratos.md`](./docs/contratos.md) |
| Contratos iniciais | [`contracts/`](./contracts/) |
| Fluxo de tokenização | [`docs/fluxo-tokenizacao.md`](./docs/fluxo-tokenizacao.md) |
| Fluxo de compensação | [`docs/fluxo-compensacao.md`](./docs/fluxo-compensacao.md) |
| Roteiro da demonstração inicial | [`docs/roteiro-demo.md`](./docs/roteiro-demo.md) |

O protótipo inicial contém `ControlledToken`, `QuitusToken`, `DebitusToken` e `CompensationManager`.

## Entrega 2 — em desenvolvimento

A Entrega 2 evolui o protótipo com integrações, testes e interface.

O modelo funcional usado como referência está em [`docs/modelo-solucao.md`](./docs/modelo-solucao.md).

### Funcionalidades já adicionadas

#### Oráculo monetário simulado

[`contracts/MonetaryOracle.sol`](./contracts/MonetaryOracle.sol) mantém um índice monetário cumulativo controlado por um endereço `operator`.

A escala usada é:

```text
1_000_000 = 1,000000
1_010_000 = 1,010000 = +1%
```

Somente o operador pode publicar um novo índice por meio de:

```solidity
updateIndex(uint256 newIndex)
```

#### Integração do QTS com o oráculo

`QuitusToken` agora recebe o endereço do `MonetaryOracle` no construtor e mantém, para cada conta, o último índice aplicado.

A atualização é **lazy**: o contrato não percorre todos os titulares quando o índice muda. Em vez disso, a atualização é materializada quando a conta é sincronizada ou antes de operações que alteram seu saldo.

Funções adicionadas:

```solidity
syncBalance(address account)
previewBalance(address account)
```

`syncBalance` materializa a correção no estado, aumentando o saldo QTS e `totalSupply`. `previewBalance` permite visualizar o saldo corrigido sem alterar o estado.

Transferências, novos mints e queimas sincronizam automaticamente as contas envolvidas antes de alterar os saldos.

`CompensationManager` também sincroniza o saldo QTS do solicitante antes de validar a compensação.

#### Registro da obrigação fiscal

`DebitusToken` agora permite que a instituição emissora registre explicitamente uma obrigação fiscal elegível por:

```solidity
registerFiscalDebt(bytes32 fiscalDebtIdHash, address debtor, uint256 amount)
```

O registro mantém o valor original, o saldo remanescente, o devedor e o estado da obrigação. `registerFiscalDebt` não emite DBT.

#### Compensação integrada à obrigação fiscal

A função `CompensationManager.compensate` agora recebe também o hash da obrigação fiscal:

```solidity
compensate(bytes32 referenceId, bytes32 fiscalDebtIdHash, uint256 amount)
```

O solicitante precisa possuir QTS suficiente e ser o devedor associado à `FiscalDebt`. Durante a mesma transação, QTS é queimado e `DebitusToken` materializa o mesmo valor em DBT, que é imediatamente queimado, reduzindo `remainingAmount`.

A emissão antecipada por `issueFiscalCredit(...)` foi removida: o usuário não precisa manter saldo DBT antes da compensação.

#### Mercado secundário de QTS

[`contracts/QuitusMarketplace.sol`](./contracts/QuitusMarketplace.sol) implementa um livro de ordens simplificado com:

- ofertas de venda (`Sell`);
- ofertas de compra (`Buy`);
- execução parcial ou total;
- cancelamento;
- histórico de negociações por eventos `OrderFilled`.

As ordens de compra mantêm ETH de teste em escrow. Nas ordens de venda, os QTS permanecem com o vendedor até a execução; por isso, o vendedor precisa aprovar o marketplace com `approve(...)` e manter saldo/allowance suficientes.

O preço é expresso em **wei por unidade interna de QTS**. Como QTS possui duas casas decimais, uma unidade interna representa `0,01 QTS`.

O uso de ETH é apenas um mock técnico da liquidação financeira da PoC e não representa a forma de pagamento de uma implantação institucional.

### Exemplo

Estado inicial:

```text
saldo QTS = 100000
índice aplicado = 1000000
```

Após o operador executar:

```text
updateIndex(1010000)
```

a consulta:

```text
previewBalance(conta)
```

deve indicar:

```text
101000
```

Depois de:

```text
syncBalance(conta)
```

o saldo persistido passa a `101000`.

Na convenção do projeto:

```text
R$ 1.000,00 → R$ 1.010,00
```

### Ainda não implementado

- frontend/dashboard;
- testes automatizados;
- script de deploy;
- integração com uma rede institucional real.

## Entrega 3

Na Entrega 3, a versão final da prova de conceito consolidará o código, a demonstração e a documentação.

Os diagramas de arquitetura e de classes serão revisados para refletir exatamente o sistema efetivamente entregue.

## Como testar o estado atual no Remix

### Deploy do oráculo

1. Compile [`MonetaryOracle.sol`](./contracts/MonetaryOracle.sol) com Solidity `0.8.24`;
2. implante `MonetaryOracle` usando a Conta 0 como `oracleOperator`;
3. confirme que `currentIndex()` retorna `1000000`.

### Deploy dos contratos principais

Compile os contratos em [`contracts/`](./contracts/):

1. implante `QuitusToken` passando:
   - `tokenIssuer`: Conta 0;
   - `monetaryOracleAddress`: endereço do `MonetaryOracle`;
2. implante `DebitusToken` usando Conta 0 como `tokenIssuer`;
3. implante `CompensationManager` com os endereços de QTS e DBT;
4. em QTS e DBT, execute `setCompensationManager` com o endereço do manager.

### Demonstração da atualização

Com a Conta 0:

```text
tokenizePrecatorio(hash, CONTA_1, 100000)
```

Confirme:

```text
balanceOf(CONTA_1) = 100000
lastAppliedIndex(CONTA_1) = 1000000
```

No `MonetaryOracle`, usando a conta operadora:

```text
updateIndex(1010000)
```

No `QuitusToken`:

```text
previewBalance(CONTA_1) = 101000
```

Execute:

```text
syncBalance(CONTA_1)
```

Depois:

```text
balanceOf(CONTA_1) = 101000
lastAppliedIndex(CONTA_1) = 1010000
```

O evento `MonetaryAdjustmentApplied` deve registrar a correção aplicada.

## Decisões de arquitetura atuais

- documentos, CPF e informações processuais continuam off-chain;
- hashes, saldos, permissões e eventos ficam on-chain;
- o oráculo é separado do token;
- o índice é cumulativo;
- a atualização de QTS é lazy para evitar iterar por todos os titulares;
- a correção monetária é materializada como mint adicional de QTS;
- a compensação consome `FiscalDebt.remainingAmount` e materializa/queima DBT na mesma transação;
- a compensação permanece atômica: falhas no processamento fiscal revertem também a queima de QTS;
- o mercado secundário registra ordens e negociações on-chain, usando ETH de teste apenas como liquidação simulada.

## Limites atuais

O índice utilizado é um mock acadêmico. O sistema não:

- consulta índice oficial;
- aplica regras jurídicas reais de atualização;
- valida juridicamente precatórios ou créditos fiscais;
- integra TJPB ou Fazenda Pública;
- representa uma implantação de produção.

A prova de conceito demonstra o mecanismo técnico de atualização monetária e execução em contratos inteligentes.
