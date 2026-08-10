# Documentação — Quitus & Debitus

Esta pasta concentra a documentação da prova de conceito do Projeto 4 — **Tokenização de Precatórios e Créditos Fiscais (Quitus & Debitus)**.

Os documentos distinguem **o sistema efetivamente implementado** da **arquitetura revisada após feedback do professor**. Componentes ainda não implementados são identificados explicitamente como arquitetura alvo, sem serem apresentados como código já disponível.

A decisão de migração para ERC-721 está em [`decisoes/revisao-escopo-nft.md`](./decisoes/revisao-escopo-nft.md). O documento também distingue pausa temporária, upgrade de um proxy válido e invalidação permanente.

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

O arquivo mantém o diagrama do estado implementado e, durante a migração, um segundo diagrama da arquitetura revisada. Ambos são Mermaid, permitindo que o histórico do Git registre explicitamente a evolução arquitetural.

### Diagrama de classes dos contratos inteligentes

[`arquitetura/contratos.md`](./arquitetura/contratos.md)

Apresenta:

- contratos inteligentes;
- interfaces;
- estruturas de dados relevantes;
- atributos;
- funções principais;
- relações de herança, dependência e comunicação entre os contratos.

O arquivo contém o diagrama dos contratos existentes e a estrutura ERC-721 proposta. O diagrama revisado só substituirá definitivamente o anterior quando o novo código estiver implementado.

> Estes diagramas não são artefatos estáticos da primeira entrega. Eles evoluem junto com o projeto e permanecem coerentes com o código.

## Decisões de arquitetura

- [`decisoes/revisao-escopo-nft.md`](./decisoes/revisao-escopo-nft.md) — consenso adotado após feedback do professor, simplificação para ERC-721, marketplace e estratégia de evolução.

## Fluxos funcionais

Os fluxos abaixo ainda descrevem o **código atualmente executável**. Eles serão substituídos gradualmente conforme a implementação NFT entrar no repositório:

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
├── decisoes/
│   └── revisao-escopo-nft.md
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
