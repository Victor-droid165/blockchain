# Lab 4 — Projeto 4: Quitus & Debitus

Prova de conceito do Projeto 4 da disciplina **Aplicações e Tecnologias de Registro Distribuído**.

Após simplificação de escopo discutida com o professor, a implementação atual representa **cada precatório como um NFT ERC-721** e permite negociá-lo em um marketplace on-chain.

## Equipe

- Douglas Alves de Sousa
- Maria Luiza Galdino Medeiros
- Nívea Calébia Felix dos Santos
- Victor Emanuel Barbosa Rodrigues

## Escopo atual

```text
Entrada institucional mínima
        ↓
PrecatorioNFT (ERC-721)
        ↓
aprovação
        ↓
PrecatorioMarketplace
        ↓
listagem / compra / cancelamento
        ↓
transferência de propriedade
```

Os dois contratos usam:

- pausa temporária;
- proxy UUPS para atualização enquanto válidos;
- invalidação permanente e irreversível.

A arquitetura anterior de QTS/DBT, oráculo e compensação foi removida da árvore atual. A decisão e a justificativa da mudança permanecem em [`docs/decisoes/revisao-escopo-nft.md`](./docs/decisoes/revisao-escopo-nft.md).

## Estrutura

```text
Lab4/
├── blockchain/
│   ├── contracts/
│   │   ├── PrecatorioNFT.sol
│   │   ├── PrecatorioMarketplace.sol
│   │   └── mocks/
│   │       ├── PrecatorioNFTV2.sol
│   │       └── PrecatorioMarketplaceV2.sol
│   ├── scripts/
│   │   ├── deploy.ts
│   │   └── upgrade-demo.ts
│   ├── test/
│   │   ├── PrecatorioNFT.test.ts
│   │   └── PrecatorioMarketplace.test.ts
│   ├── hardhat.config.ts
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── blockchain/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/
│   └── package.json
├── docs/
├── package.json
└── .nvmrc
```

> Não existe um backend HTTP/API separado nesta PoC. O frontend React conversa diretamente com a rede EVM por Viem/JSON-RPC e usa a carteira para assinar transações.

## Stack

### Blockchain

- Solidity `0.8.24`;
- Hardhat 3;
- Viem;
- OpenZeppelin Contracts/Upgradeable;
- OpenZeppelin Hardhat Upgrades;
- ERC-721;
- UUPS.

### Frontend

- React;
- Vite;
- TypeScript;
- Viem;
- MetaMask/carteira injetada.

## Instalação

Na raiz de `Lab4/`:

```bash
nvm use
npm install
```

A versão esperada de Node está em `.nvmrc`.

## Build e testes

```bash
npm run build
npm test
```

Ou:

```bash
npm run chain:build
npm run chain:test
npm run frontend:build
```

## Executar localmente

### Terminal 1 — rede

```bash
npm run chain:node
```

### Terminal 2 — deploy

```bash
npm run chain:deploy:localhost
```

O deploy cria os proxies de:

```text
PrecatorioNFT
PrecatorioMarketplace
```

e gera:

```text
blockchain/deployments/localhost.json
frontend/public/deployment.json
```

### Terminal 3 — frontend

```bash
npm run frontend:dev
```

Depois, conecte o MetaMask à rede Hardhat local (`31337`).

## Upgrade de demonstração

Com a rede local e os contratos válidos:

```bash
npm run chain:upgrade-demo:localhost
```

O script atualiza os dois proxies para implementações V2 de demonstração mantendo os mesmos endereços.

## Pausa, upgrade e invalidação

São três mecanismos diferentes:

```text
pause / unpause
→ interrupção temporária

upgrade UUPS
→ nova implementação, mesmo proxy e estado preservado

invalidate
→ encerramento permanente daquele proxy
→ sem retomada e sem novos upgrades
```

A invalidação é lógica, e não baseada em `SELFDESTRUCT`. A justificativa técnica está na documentação de decisão.

## Frontend

A interface possui:

- **Visão geral** — estatísticas e estado dos contratos;
- **Marketplace** — listar, comprar e cancelar anúncios;
- **Meus precatórios** — visualizar NFTs e aprovar o marketplace;
- **Emitir NFT** — mint institucional;
- **Administração** — pausar, retomar e invalidar contratos.

## Documentação

Índice completo: [`docs/README.md`](./docs/README.md).

Documentos principais:

- [Arquitetura do sistema](./docs/arquitetura/sistema.md)
- [Diagrama dos contratos](./docs/arquitetura/contratos.md)
- [Modelo da solução](./docs/modelo-solucao.md)
- [Revisão de escopo e referências](./docs/decisoes/revisao-escopo-nft.md)
- [Tokenização do precatório](./docs/fluxos/tokenizacao-precatorio.md)
- [Mercado secundário](./docs/fluxos/mercado-secundario.md)
- [Deploy](./docs/operacao/deploy.md)
- [Frontend](./docs/operacao/frontend.md)
- [Testes](./docs/operacao/testes.md)
- [Roteiro de demonstração](./docs/operacao/roteiro-demo.md)

## Limitações

- a PoC não valida juridicamente precatórios;
- documentos processuais não são armazenados na blockchain;
- ETH local é apenas um mecanismo de liquidação de teste;
- não há integração real com TJPB/Fazenda;
- não há identidade/custódia de chaves ou governança de produção;
- não há indexador persistente off-chain; a descoberta da PoC usa eventos consultados diretamente pelo RPC a partir do bloco de deploy;
- a implementação não substitui auditoria de segurança.

## Entregas

Os diagramas em `docs/arquitetura/` foram atualizados para refletir a arquitetura vigente. O histórico Git registra a transição do modelo QTS/DBT para ERC-721.

Antes da entrega final, validar build/testes, fluxo completo da interface, documentação, vídeo e tag exigida pela disciplina.
