# Documentação — Quitus & Debitus

Esta pasta documenta a versão atual da PoC do Projeto 4: **precatórios representados como NFTs ERC-721 e negociados em um marketplace on-chain**.

A arquitetura original baseada em QTS/DBT foi substituída após feedback do professor. O motivo da mudança e as referências técnicas permanecem registrados em [`decisoes/revisao-escopo-nft.md`](./decisoes/revisao-escopo-nft.md), sem manter o domínio antigo misturado aos diagramas atuais.

## Diagramas obrigatórios

Os dois diagramas principais exigidos pelo projeto estão em:

- [`arquitetura/sistema.md`](./arquitetura/sistema.md) — componentes, comunicação e fronteira on-chain/off-chain;
- [`arquitetura/contratos.md`](./arquitetura/contratos.md) — contratos, estruturas, funções e relações.

Ambos usam Mermaid e representam **somente a implementação vigente**.

## Modelo e decisão arquitetural

- [`modelo-solucao.md`](./modelo-solucao.md) — domínio, regras, segurança, limitações e decisões técnicas atuais;
- [`decisoes/revisao-escopo-nft.md`](./decisoes/revisao-escopo-nft.md) — histórico da simplificação para ERC-721, marketplace, UUPS e invalidação permanente;
- [`decisoes/livro-de-ofertas-e-rede-publica.md`](./decisoes/livro-de-ofertas-e-rede-publica.md) — ofertas (lado de demanda), rede Sepolia, frontend multi-rede e CI, dentro do escopo NFT já confirmado.

## Fluxos

- [`fluxos/tokenizacao-precatorio.md`](./fluxos/tokenizacao-precatorio.md) — entrada mínima e emissão do `PrecatorioNFT`;
- [`fluxos/mercado-secundario.md`](./fluxos/mercado-secundario.md) — aprovação, listagem, compra, cancelamento, ofertas e aceite de ofertas.

## Operação

- [`operacao/desenvolvimento.md`](./operacao/desenvolvimento.md) — estrutura, dependências e comandos;
- [`operacao/deploy.md`](./operacao/deploy.md) — deploy dos proxies UUPS, arquivos de deployment e endereços atuais na Sepolia;
- [`operacao/frontend.md`](./operacao/frontend.md) — páginas, integração Viem e responsabilidades;
- [`operacao/testes.md`](./operacao/testes.md) — suítes e cenários cobertos;
- [`operacao/roteiro-demo.md`](./operacao/roteiro-demo.md) — sequência recomendada para demonstrar a PoC.

## Organização

```text
docs/
├── README.md
├── arquitetura/
│   ├── sistema.md
│   └── contratos.md
├── decisoes/
│   ├── revisao-escopo-nft.md
│   └── livro-de-ofertas-e-rede-publica.md
├── fluxos/
│   ├── tokenizacao-precatorio.md
│   └── mercado-secundario.md
├── operacao/
│   ├── desenvolvimento.md
│   ├── deploy.md
│   ├── frontend.md
│   ├── testes.md
│   └── roteiro-demo.md
└── modelo-solucao.md
```

## Regra de manutenção

Documentação e código devem evoluir no mesmo commit quando uma alteração mudar contratos, integrações ou fluxos observáveis. Funcionalidades planejadas não devem aparecer nos diagramas como se já estivessem implementadas.
