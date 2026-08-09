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
| Diagrama de arquitetura (on-chain / off-chain) | [`docs/arquitetura.md`](./docs/arquitetura.md) |
| Diagrama de classes dos contratos | [`docs/contratos.md`](./docs/contratos.md) |
| Contratos iniciais | [`contracts/Projeto4Entrega1.sol`](./contracts/Projeto4Entrega1.sol) |
| Fluxo de tokenização | [`docs/fluxo-tokenizacao.md`](./docs/fluxo-tokenizacao.md) |
| Fluxo de compensação | [`docs/fluxo-compensacao.md`](./docs/fluxo-compensacao.md) |
| Roteiro da demonstração inicial | [`docs/roteiro-demo.md`](./docs/roteiro-demo.md) |

O protótipo da Entrega 1 contém:

1. **`ControlledToken`** — base fungível mínima compartilhada por QTS e DBT;
2. **`QuitusToken.tokenizePrecatorio`** — registra o hash do precatório e emite QTS ao beneficiário;
3. **`DebitusToken.issueFiscalCredit`** — registra o hash do crédito fiscal e emite DBT ao titular;
4. **`CompensationManager.compensate`** — verifica os saldos e queima o mesmo valor de QTS e DBT em uma única transação.

Os valores são representados com duas casas decimais (`100000` = R$ 1.000,00).

### Fluxo implementado na Entrega 1

```text
Instituição emissora
    ├── tokeniza precatório → QTS
    └── emite crédito fiscal → DBT

Titular possui QTS + DBT
        ↓
CompensationManager.compensate(...)
        ↓
queima QTS + DBT na mesma transação
```

## Entrega 2

A Entrega 2 evolui o protótipo em direção ao fluxo completo do projeto.

O modelo funcional utilizado como referência está em:

- [`docs/modelo-solucao.md`](./docs/modelo-solucao.md)

### Estado atual da implementação

Além dos contratos da Entrega 1, já foi adicionado:

- **`MonetaryOracle`** — mock de oráculo institucional que mantém um índice monetário cumulativo.

Arquivo:

- [`contracts/MonetaryOracle.sol`](./contracts/MonetaryOracle.sol)

O oráculo usa escala de `1_000_000`:

```text
1_000_000 = 1,000000
1_010_000 = 1,010000 = +1%
```

Apenas o endereço definido como `operator` no deploy pode publicar um novo índice.

> Neste ponto, o `MonetaryOracle` ainda é independente. Ele **ainda não altera o saldo de QTS**. A integração com `QuitusToken` será implementada separadamente.

Ainda serão desenvolvidos e integrados:

- atualização monetária do QTS a partir do oráculo;
- representação explícita da obrigação fiscal usada na compensação;
- adequação do fluxo de DBT;
- mercado secundário simplificado de QTS;
- interface para demonstração de ponta a ponta;
- testes automatizados e script de deploy.

## Entrega 3

Na Entrega 3, a versão final da prova de conceito deverá consolidar o código, a demonstração e a documentação.

Antes da versão final:

- os diagramas de arquitetura e de classes serão atualizados para refletir o código efetivamente entregue;
- o fluxo de demonstração será revisado;
- as limitações da PoC serão documentadas;
- a versão final do repositório será marcada com a tag exigida pelo professor.

A documentação final não deverá descrever funcionalidades que não estejam de fato presentes no código.

## Como testar os contratos atuais no Remix

### Contratos da Entrega 1

1. Criar `Projeto4Entrega1.sol` no Remix e colar o conteúdo de [`contracts/Projeto4Entrega1.sol`](./contracts/Projeto4Entrega1.sol);
2. Compilar com Solidity `0.8.24` (ou `0.8.x` compatível);
3. Implantar `QuitusToken` e `DebitusToken` usando a conta institucional como `tokenIssuer`;
4. Implantar `CompensationManager` com os endereços dos dois tokens;
5. Chamar `setCompensationManager` em QTS e DBT;
6. Seguir o cenário em [`docs/roteiro-demo.md`](./docs/roteiro-demo.md).

### MonetaryOracle

1. Criar `MonetaryOracle.sol` no Remix e colar [`contracts/MonetaryOracle.sol`](./contracts/MonetaryOracle.sol);
2. Compilar com Solidity `0.8.24`;
3. Implantar usando a primeira conta do Remix como `oracleOperator`;
4. Consultar `currentIndex` — o resultado inicial deve ser `1000000`;
5. Executar `updateIndex(1010000)` usando a conta operadora;
6. Consultar `currentIndex` novamente — o resultado deve ser `1010000`;
7. Chamar `applyIndex(100000, 1000000)` — o resultado esperado é `101000`;
8. Trocar para outra conta e tentar `updateIndex(...)` — a transação deve reverter com `Unauthorized`.

Esse cenário representa, apenas para fins de demonstração:

```text
R$ 1.000,00
    ↓ índice +1%
R$ 1.010,00
```

A função `applyIndex` somente calcula o valor de referência; ela não modifica `QuitusToken`.

## Decisões de arquitetura já presentes

- **Na blockchain:** hashes dos identificadores, valores, saldos, permissões e eventos;
- **Fora da blockchain:** PDFs, CPF, dados processuais e demais informações sensíveis;
- emissão restrita ao endereço institucional definido no deploy;
- `CompensationManager` separado dos tokens;
- compensação executada em uma única transação EVM;
- prevenção de reutilização da mesma referência de compensação;
- oráculo mock separado da lógica de QTS, permitindo integrar e testar cada responsabilidade de forma isolada.

## Limites atuais

O protótipo atual ainda não implementa:

- aplicação automática da atualização monetária ao saldo de QTS;
- mercado secundário;
- frontend/dashboard;
- integração com sistemas institucionais;
- implantação de uma rede permissionada institucional;
- segurança e governança de produção.

A prova de conceito demonstra mecanismos técnicos. Ela não valida juridicamente precatórios ou créditos fiscais e não substitui procedimentos do TJPB ou da Fazenda Pública.
