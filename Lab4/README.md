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
listagem (oferta) / oferta em ETH (demanda) / compra / aceite / cancelamento
        ↓
transferência de propriedade
```

`PrecatorioMarketplace` implementa os dois lados do livro de ofertas do mercado secundário: **oferta** (listagem a preço fixo do vendedor) e **demanda** (lance em ETH de teste de um comprador, escrowado no contrato até aceite ou cancelamento). O histórico de preços é reconstituído no frontend a partir dos eventos de venda de ambos os fluxos.

Os dois contratos usam:

- pausa temporária;
- proxy UUPS para atualização enquanto válidos;
- invalidação permanente e irreversível.

A arquitetura anterior de QTS/DBT, oráculo e compensação foi removida da árvore atual. A decisão e a justificativa da mudança permanecem em [`docs/decisoes/revisao-escopo-nft.md`](./docs/decisoes/revisao-escopo-nft.md). Os ajustes de robustez feitos depois dessa simplificação — livro de ofertas, rede de testes pública, frontend multi-rede e CI — estão em [`docs/decisoes/livro-de-ofertas-e-rede-publica.md`](./docs/decisoes/livro-de-ofertas-e-rede-publica.md).

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
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── blockchain/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/
│   ├── .env.example
│   └── package.json
├── docs/
├── package.json
└── .nvmrc
```

O workflow de integração contínua fica na raiz do repositório, em [`.github/workflows/lab4-ci.yml`](../.github/workflows/lab4-ci.yml), e roda build + testes a cada push/PR que toque esta pasta.

> Não existe um backend HTTP/API separado nesta PoC. O frontend React conversa diretamente com a rede EVM por Viem/JSON-RPC e usa a carteira para assinar transações.

## Stack

### Blockchain

- Solidity `0.8.24`;
- Hardhat 3 (rede local + Sepolia via `hardhat-verify`/`configVariable`);
- Viem;
- OpenZeppelin Contracts/Upgradeable;
- OpenZeppelin Hardhat Upgrades;
- ERC-721;
- UUPS;
- `dotenv` para variáveis de ambiente locais (`.env`, nunca versionado).

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

O workflow de CI executa exatamente essas três etapas a cada push/PR (veja [`.github/workflows/lab4-ci.yml`](../.github/workflows/lab4-ci.yml)).

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

### Alternativa: rede de testes pública (Sepolia)

```bash
npm run chain:deploy:sepolia
```

Requer `blockchain/.env` preenchido a partir de `blockchain/.env.example` (RPC URL, chave privada de conta de teste e, opcionalmente, chave do Etherscan para verificação). Detalhes em [`docs/operacao/deploy.md`](./docs/operacao/deploy.md). O frontend detecta a rede automaticamente pelo `chainId` gravado em `deployment.json` — não é necessário alterar código para trocar de rede local para Sepolia.

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

- **Visão geral** — estatísticas (incluindo ofertas ativas), estado dos contratos e histórico de preços das vendas concluídas;
- **Marketplace** — listar (oferta), enviar/cancelar ofertas (demanda), comprar e cancelar anúncios;
- **Meus precatórios** — visualizar NFTs, aprovar o marketplace e aceitar ofertas recebidas;
- **Emitir NFT** — mint institucional;
- **Administração** — pausar, retomar e invalidar contratos.

## Documentação

Índice completo: [`docs/README.md`](./docs/README.md).

Documentos principais:

- [Arquitetura do sistema](./docs/arquitetura/sistema.md)
- [Diagrama dos contratos](./docs/arquitetura/contratos.md)
- [Modelo da solução](./docs/modelo-solucao.md)
- [Revisão de escopo e referências](./docs/decisoes/revisao-escopo-nft.md)
- [Livro de ofertas, rede pública e CI](./docs/decisoes/livro-de-ofertas-e-rede-publica.md)
- [Tokenização do precatório](./docs/fluxos/tokenizacao-precatorio.md)
- [Mercado secundário](./docs/fluxos/mercado-secundario.md)
- [Deploy](./docs/operacao/deploy.md)
- [Frontend](./docs/operacao/frontend.md)
- [Testes](./docs/operacao/testes.md)
- [Roteiro de demonstração](./docs/operacao/roteiro-demo.md)

## Limitações

- a PoC não valida juridicamente precatórios;
- documentos processuais não são armazenados na blockchain;
- ETH (local ou de testnet pública) é apenas um mecanismo de liquidação de teste;
- não há integração real com TJPB/Fazenda;
- não há identidade/custódia de chaves ou governança de produção;
- não há indexador persistente off-chain; a descoberta da PoC usa eventos consultados diretamente pelo RPC a partir do bloco de deploy;
- listagens e ofertas cobrem sempre o NFT completo, sem execução parcial;
- a implementação não substitui auditoria de segurança.

## Entregas

Os diagramas em `docs/arquitetura/` foram atualizados para refletir a arquitetura vigente. O histórico Git registra a transição do modelo QTS/DBT para ERC-721 e, em seguida, o endurecimento da versão NFT (livro de ofertas, rede pública, CI).

Antes da entrega final, validar build/testes (local e via CI), fluxo completo da interface — incluindo ofertas —, documentação, vídeo e tag exigida pela disciplina.
