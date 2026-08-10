# Modelo da solução

Este documento registra como o protótipo existente será evoluído para a prova de conceito final do **Quitus & Debitus**.

Ele parte diretamente dos contratos existentes em `contracts/`. Funcionalidades descritas como **planejadas** neste documento ainda não devem ser interpretadas como implementadas.

## Protótipo existente

O código atual possui quatro componentes principais:

```mermaid
classDiagram
    class ControlledToken {
        <<abstract>>
        +name
        +symbol
        +decimals
        +totalSupply
        +issuer
        +compensationManager
        +balanceOf(account)
        +allowance(owner, spender)
        +setCompensationManager(manager)
        +transfer(to, amount)
        +approve(spender, amount)
        +transferFrom(from, to, amount)
        +burnForCompensation(account, amount)
    }

    class QuitusToken {
        +precatorios
        +tokenizePrecatorio(idHash, beneficiary, amount)
    }

    class DebitusToken {
        +fiscalDebts
        +registerFiscalDebt(idHash, debtor, amount)
        +settleFiscalDebtForCompensation(idHash, debtor, amount)
    }

    class CompensationManager {
        +compensationReferencesUsed
        +totalCompensatedByAccount
        +compensate(referenceId, fiscalDebtIdHash, amount)
    }

    ControlledToken <|-- QuitusToken
    ControlledToken <|-- DebitusToken
    CompensationManager --> QuitusToken
    CompensationManager --> DebitusToken
```

### QTS no código atual

`QuitusToken` registra:

```solidity
struct Precatorio {
    address beneficiary;
    uint256 faceValue;
    uint256 tokenizedAt;
    bool tokenized;
}
```

A operação central é:

```solidity
tokenizePrecatorio(
    bytes32 precatorioIdHash,
    address beneficiary,
    uint256 amount
)
```

Somente o `issuer` pode executá-la. O mesmo `precatorioIdHash` não pode ser tokenizado novamente.

### DBT e obrigação fiscal no código atual

`DebitusToken` registra:

```solidity
struct FiscalDebt {
    address debtor;
    uint256 originalAmount;
    uint256 remainingAmount;
    uint256 registeredAt;
    bool active;
}
```

A instituição registra a obrigação por `registerFiscalDebt(...)`, sem emitir DBT antecipadamente.

O DBT é materializado somente quando `CompensationManager` chama:

```solidity
settleFiscalDebtForCompensation(
    bytes32 fiscalDebtIdHash,
    address debtor,
    uint256 amount
)
```

Essa operação emite e queima o mesmo valor de DBT e reduz `remainingAmount`.

### Compensação no código atual

A função existente é:

```solidity
compensate(
    bytes32 referenceId,
    bytes32 fiscalDebtIdHash,
    uint256 amount
)
```

O solicitante precisa possuir QTS suficiente e ser o devedor associado à obrigação fiscal. A queima de QTS, a emissão/queima de DBT e a redução de `remainingAmount` pertencem à mesma transação. Se qualquer etapa falhar, toda a operação é revertida.

---

## Evolução funcional

A proposta completa do projeto exige que a prova de conceito represente, além da tokenização, a atualização monetária, a negociação de QTS e a compensação.

O fluxo pretendido para a evolução é:

```mermaid
flowchart TD
    P[Precatório validado fora da blockchain]
    Q[Tokenização e emissão de QTS]
    U[Atualização monetária por oráculo]
    M[Negociação de QTS]
    D[Registro de obrigação fiscal elegível]
    C[Compensação]
    E[Extinção da parcela compensada]

    P --> Q --> U --> M --> C
    D --> C
    C --> E
```

### Princípio importante

A blockchain não decidirá se um precatório ou uma obrigação fiscal é juridicamente válido.

A prova de conceito assume que a validação institucional ocorre **off-chain** e demonstra apenas o registro e a execução técnica das operações autorizadas.

---

## Quitus (QTS)

QTS continuará sendo o token associado ao valor do precatório.

A implementação existente de:

```solidity
tokenizePrecatorio(...)
```

será preservada conceitualmente.

A evolução deverá acrescentar a atualização monetária sem quebrar as regras já existentes:

- somente instituição autorizada emite;
- identificador não pode ser vazio;
- precatório não pode ser tokenizado duas vezes;
- beneficiário deve ser válido;
- valor deve ser maior que zero.

### Convenção monetária

O código existente utiliza:

```solidity
uint8 public constant decimals = 2;
```

Assim:

```text
100 unidades internas = R$ 1,00
100000 unidades internas = R$ 1.000,00
```

Essa convenção será mantida, salvo necessidade técnica devidamente documentada.

---

## Atualização monetária por oráculo

A atualização monetária já possui uma primeira integração funcional entre `MonetaryOracle` e `QuitusToken`.

### `MonetaryOracle`

O contrato mantém:

- `operator`: endereço autorizado a atualizar o índice;
- `currentIndex`: índice monetário cumulativo;
- `lastUpdatedAt`: instante da última atualização.

A escala usada é `1_000_000`.

Exemplo:

```text
1_000_000 = 1,000000
1_010_000 = 1,010000
```

Somente o operador pode executar:

```solidity
updateIndex(uint256 newIndex)
```

O índice não pode ser zero nem diminuir.

### Integração com `QuitusToken`

`QuitusToken` recebe o endereço do oráculo no construtor:

```solidity
QuitusToken(
    address tokenIssuer,
    address monetaryOracleAddress
)
```

Cada conta possui:

```solidity
lastAppliedIndex[address]
```

A atualização utiliza estratégia **lazy**. A publicação de um novo índice não percorre todas as contas e não modifica imediatamente todos os saldos.

O titular pode consultar o valor que teria após a atualização por:

```solidity
previewBalance(address account)
```

e materializar a atualização no estado por:

```solidity
syncBalance(address account)
```

Antes de transferências, mints e queimas, as contas envolvidas também são sincronizadas automaticamente.

A diferença é materializada como emissão adicional de QTS, seguindo a ideia da proposta de atualizar o valor do token por mint adicional.

Exemplo:

```text
saldo persistido:      100000
último índice:          1000000
índice atual:           1010000
saldo após sync:        101000
QTS adicional emitido:  1000
```

O `CompensationManager` sincroniza o saldo QTS do usuário antes de validar se há quantidade suficiente para a compensação.

### Limite da implementação

O índice é simulado e não representa integração com uma fonte oficial. A PoC também não pretende reproduzir todas as regras jurídicas de correção monetária de precatórios.

## Crédito ou obrigação fiscal e papel do DBT

O `DebitusToken` agora possui um registro explícito da obrigação fiscal elegível:

```solidity
struct FiscalDebt {
    address debtor;
    uint256 originalAmount;
    uint256 remainingAmount;
    uint256 registeredAt;
    bool active;
}
```

A instituição emissora registra a obrigação por:

```solidity
registerFiscalDebt(
    bytes32 fiscalDebtIdHash,
    address debtor,
    uint256 amount
)
```

O registro não emite DBT. Ele associa o identificador da obrigação ao devedor e mantém `originalAmount` e `remainingAmount`.

O DBT é transitório: durante a compensação, `settleFiscalDebtForCompensation` materializa o valor da parcela em DBT, que é queimado na mesma transação, e reduz `remainingAmount`. Quando o saldo remanescente chega a zero, a obrigação é marcada como inativa.

### Terminologia

Os documentos fornecidos para o projeto utilizam expressões como **créditos fiscais**, **dívida ativa** e **devedor fiscal**.

A implementação deve evitar atribuir uma interpretação jurídica mais específica do que a validada pelo projeto. O contrato representa tecnicamente uma obrigação fiscal elegível para a demonstração.

---

## Compensação implementada

O devedor não precisa manter um saldo DBT antecipadamente para executar a compensação.

O fluxo implementado é:

```text
devedor possui QTS
        +
obrigação fiscal registrada
        ↓
solicita compensação
        ↓
DBT representa a parcela fiscal da operação
        ↓
QTS e DBT são extintos
        ↓
saldo remanescente da obrigação é reduzido
```

Tudo deve ocorrer na mesma transação EVM.

A interface implementada é:

```solidity
compensate(
    bytes32 referenceId,
    bytes32 fiscalDebtIdHash,
    uint256 amount
)
```

### Regras aplicadas

- referência válida e ainda não utilizada;
- valor maior que zero;
- obrigação existente e ativa;
- solicitante corresponde ao devedor;
- QTS suficiente;
- valor não excede a obrigação remanescente;
- nenhuma alteração parcial persiste se a operação falhar.

---

## Mercado secundário de QTS

A prova de conceito implementa negociação simples de QTS por `QuitusMarketplace`.

O objetivo é demonstrar o caminho entre:

```text
credor original → QTS → comprador/devedor fiscal
```

O contrato suporta:

- criar oferta de venda;
- criar oferta de compra;
- consultar ordens pelo identificador;
- preencher total ou parcialmente uma ordem;
- cancelar uma ordem;
- registrar o histórico de negociações por eventos.

O marketplace não cria QTS. Ele utiliza `transferFrom` para movimentar tokens já existentes.

### Liquidação na prova de conceito

A liquidação financeira usa **ETH de teste** como mock técnico.

Ordens de compra depositam o valor total em escrow no marketplace. Ordens de venda recebem o pagamento no momento do preenchimento.

Isso não significa que uma implantação institucional utilizaria ETH como moeda de liquidação.

---

## Cenário de demonstração pretendido

O cenário final deverá conseguir representar, de ponta a ponta:

```text
1. instituição tokeniza precatório de R$ 1.000,00
2. credor recebe 1.000,00 QTS
3. oráculo publica uma atualização simulada
4. saldo QTS é atualizado
5. credor oferta parte dos QTS
6. devedor fiscal adquire QTS
7. autoridade fiscal registra obrigação elegível
8. devedor solicita compensação
9. parcela correspondente é extinta atomicamente
10. saldos e eventos são consultados
```

Os valores concretos poderão ser ajustados durante os testes.

---

## On-chain e off-chain

### On-chain

A evolução pode registrar:

- hash do precatório;
- QTS e saldos;
- índice monetário utilizado;
- hash/referência da obrigação fiscal;
- saldo remanescente da obrigação;
- referências de compensação;
- ofertas do mercado secundário;
- eventos das operações.

### Off-chain

Continuam fora da blockchain:

- PDFs;
- peças processuais;
- CPF/CNPJ;
- dados bancários;
- documentos comprobatórios;
- autenticação institucional real;
- análise de elegibilidade;
- integração real com TJPB e Fazenda Pública;
- fonte oficial do índice monetário;
- identidade civil associada às wallets.

---

## Limites

Mesmo após a evolução, a prova de conceito não deverá ser apresentada como sistema jurídico ou financeiro completo.

Ela não garante, por si só:

- validade jurídica de um precatório;
- validade ou exigibilidade da obrigação fiscal;
- autorização legal definitiva para compensação;
- identidade real do usuário por trás de um endereço;
- integração real com órgãos públicos;
- cálculo oficial de correção monetária;
- liquidação financeira em moeda fiduciária;
- custódia institucional de chaves;
- segurança equivalente à de contratos auditados;
- governança de uma rede institucional;
- implantação efetiva em infraestrutura permissionada.

---

## Relação com os diagramas existentes

Os arquivos `docs/arquitetura.md`, `docs/contratos.md`, `docs/fluxo-tokenizacao.md`, `docs/fluxo-compensacao.md` e `docs/roteiro-demo.md` foram produzidos para o protótipo inicial.

Eles não serão atualizados antecipadamente para descrever código ainda inexistente.

Depois que os contratos e a interface forem evoluídos, esses documentos deverão ser revisados para corresponder ao comportamento realmente implementado e testado.
