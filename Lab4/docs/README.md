# Documentação — Quitus & Debitus

Esta pasta concentra a documentação da prova de conceito do Projeto 4 — **Tokenização de Precatórios e Créditos Fiscais (Quitus & Debitus)**.

Os documentos descrevem **o sistema efetivamente implementado**. Componentes ainda não implementados são identificados explicitamente como limitações ou possibilidades de evolução, sem aparecer nos diagramas como se já existissem.

## Diagramas obrigatórios

Os dois diagramas exigidos para o projeto estão em [`arquitetura/`](./arquitetura/).

### Diagrama de arquitetura da solução

[`arquitetura/sistema.md`](./arquitetura/sistema.md)

Apresenta:

- os principais componentes da solução;
- como os componentes se comunicam;
- a separação entre componentes **on-chain** e **off-chain**;
- a integração entre frontend, carteira e blockchain;
- os contratos atualmente implementados.

O diagrama é mantido em **Mermaid**, permitindo versionamento e visualização direta no GitHub.

### Diagrama de classes dos contratos inteligentes

[`arquitetura/contratos.md`](./arquitetura/contratos.md)

Apresenta:

- contratos inteligentes;
- interfaces;
- estruturas de dados relevantes;
- atributos;
- funções principais;
- relações de herança, dependência e comunicação entre os contratos.

O diagrama também é mantido em **Mermaid** e deve acompanhar a evolução da implementação.

> Estes diagramas não são artefatos estáticos da primeira entrega. Eles evoluem junto com o projeto e permanecem coerentes com o código.

## Fluxos funcionais

Os diagramas abaixo complementam os dois diagramas obrigatórios e detalham os principais casos de uso da PoC:

- [`fluxos/tokenizacao.md`](./fluxos/tokenizacao.md) — tokenização de precatório e atualização monetária do QTS;
- [`fluxos/compensacao.md`](./fluxos/compensacao.md) — compensação atômica entre QTS e obrigação fiscal, com DBT transitório;
- [`fluxos/mercado-secundario.md`](./fluxos/mercado-secundario.md) — criação, execução e cancelamento de ordens de compra e venda de QTS.

## Operação da PoC

- [`operacao/desenvolvimento.md`](./operacao/desenvolvimento.md) — estrutura do projeto, comandos e fluxo de desenvolvimento local;
- [`operacao/frontend.md`](./operacao/frontend.md) — organização e integração do frontend React;
- [`operacao/deploy.md`](./operacao/deploy.md) — implantação dos contratos e geração dos endereços utilizados pelo frontend;
- [`operacao/testes.md`](./operacao/testes.md) — testes automatizados e cenários cobertos;
- [`operacao/roteiro-demo.md`](./operacao/roteiro-demo.md) — roteiro para demonstração da prova de conceito.

## Modelo da solução

[`modelo-solucao.md`](./modelo-solucao.md)

Consolida:

- modelo de domínio;
- papel de QTS e DBT;
- atualização monetária;
- obrigação fiscal;
- compensação;
- mercado secundário;
- decisões técnicas;
- limitações da prova de conceito.

## Organização

```text
docs/
├── README.md
├── arquitetura/
│   ├── sistema.md
│   └── contratos.md
├── fluxos/
│   ├── tokenizacao.md
│   ├── compensacao.md
│   └── mercado-secundario.md
├── operacao/
│   ├── desenvolvimento.md
│   ├── frontend.md
│   ├── deploy.md
│   ├── testes.md
│   └── roteiro-demo.md
└── modelo-solucao.md
```

## Regra de manutenção

Sempre que uma alteração no código modificar contratos, integrações, responsabilidades ou fluxos observáveis, os documentos afetados devem ser atualizados junto com a implementação.

Em especial:

- `arquitetura/sistema.md` deve continuar representando os componentes realmente existentes e a fronteira on-chain/off-chain;
- `arquitetura/contratos.md` deve acompanhar contratos, atributos, funções e relações presentes no código;
- os diagramas de fluxo devem acompanhar o comportamento efetivo da PoC;
- funcionalidades planejadas não devem ser apresentadas como implementadas.

Dessa forma, a documentação e o histórico do Git registram também a evolução da arquitetura ao longo do projeto.
