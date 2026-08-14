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

MonetaryOracle (índice de correção)
        ↓
CompensationManager
        ↓
compensa: queima o NFT + abate o débito fiscal na mesma transação
```

`PrecatorioMarketplace` implementa os dois lados do livro de ofertas do mercado secundário: **oferta** (listagem a preço fixo do vendedor) e **demanda** (lance em ETH de teste de um comprador, escrowado no contrato até aceite ou cancelamento). O histórico de preços é reconstituído no frontend a partir dos eventos de venda de ambos os fluxos.

`MonetaryOracle` é o oráculo institucional (mock) de **atualização monetária**: publica um índice acumulado de correção e o valor corrigido do precatório é `faceValue × índice`. `CompensationManager` executa a **compensação atômica** da proposta Quitus & Debitus: mantém um registro mock de débitos fiscais e, em uma única transação indivisível, queima o NFT do precatório e abate o débito pelo valor corrigido, gravando um termo de quitação consultável on-chain.

Os quatro contratos usam:

- pausa temporária;
- proxy UUPS para atualização enquanto válidos;
- invalidação permanente e irreversível.

A arquitetura anterior de QTS/DBT fungíveis foi removida da árvore atual; a decisão e a justificativa permanecem em [`docs/decisoes/revisao-escopo-nft.md`](./docs/decisoes/revisao-escopo-nft.md). Os ajustes de robustez feitos depois dessa simplificação — livro de ofertas, rede de testes pública, frontend multi-rede e CI — estão em [`docs/decisoes/livro-de-ofertas-e-rede-publica.md`](./docs/decisoes/livro-de-ofertas-e-rede-publica.md). O oráculo de atualização monetária e a compensação atômica, requisitos mínimos do enunciado do Projeto 4, foram reintroduzidos adaptados ao modelo NFT — ver [`docs/decisoes/oraculo-e-compensacao.md`](./docs/decisoes/oraculo-e-compensacao.md).

## Estrutura

```text
Lab4/
├── blockchain/
│   ├── contracts/
│   │   ├── PrecatorioNFT.sol
│   │   ├── PrecatorioMarketplace.sol
│   │   ├── MonetaryOracle.sol
│   │   ├── CompensationManager.sol
│   │   └── mocks/
│   │       ├── PrecatorioNFTV2.sol
│   │       └── PrecatorioMarketplaceV2.sol
│   ├── scripts/
│   │   ├── deploy.ts
│   │   └── upgrade-demo.ts
│   ├── test/
│   │   ├── PrecatorioNFT.test.ts
│   │   ├── PrecatorioMarketplace.test.ts
│   │   ├── MonetaryOracle.test.ts
│   │   └── CompensationManager.test.ts
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
MonetaryOracle
CompensationManager
```

e já autoriza o `CompensationManager` a queimar precatórios compensados.

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

Deploy atual (proxies dos quatro contratos, código verificado no Etherscan):

- `PrecatorioNFT`: [`0x4D59c2b2d3A96019B3FC4B14CaFF2143f1EC74C8`](https://sepolia.etherscan.io/address/0x4D59c2b2d3A96019B3FC4B14CaFF2143f1EC74C8)
- `PrecatorioMarketplace`: [`0x79D17Cd563A472dDe76d41C63e22dbDc97c6d087`](https://sepolia.etherscan.io/address/0x79D17Cd563A472dDe76d41C63e22dbDc97c6d087)
- `MonetaryOracle`: [`0x9A53278A32AF3e2dd5cA58AB3E8dBA63feB37dA1`](https://sepolia.etherscan.io/address/0x9A53278A32AF3e2dd5cA58AB3E8dBA63feB37dA1)
- `CompensationManager`: [`0xab1D387a99d1140AD954dfA27965C77aEE59Cf21`](https://sepolia.etherscan.io/address/0xab1D387a99d1140AD954dfA27965C77aEE59Cf21)

Tabela completa (implementações + links `#code`) em [`docs/operacao/deploy.md`](./docs/operacao/deploy.md#deploy-atual-na-sepolia).

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
- **Oráculo & Compensação** — acompanhar o índice de correção monetária, publicar um novo índice (admin), registrar débitos fiscais mock (admin) e compensar um precatório próprio contra um débito próprio, com o termo de quitação resultante;
- **Administração** — pausar, retomar e invalidar todos os quatro contratos.

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
- a compensação também consome o NFT inteiro: o débito precisa comportar o crédito corrigido, e não há compensação parcial do precatório;
- o oráculo de atualização monetária é um mock institucional operado pelo admin, não uma fonte externa real;
- a implementação não substitui auditoria de segurança.

## Agradecimentos

Este projeto foi proposto pelo Tribunal de Justiça da Paraíba (TJPB). Agradecemos a **José Gutemberg Gomes Lacerda** pela autorização para o uso acadêmico no contexto da disciplina.

As opiniões e a implementação desta prova de conceito são da equipe do projeto e **não representam posição oficial** do TJPB.

## Entregas

Os diagramas em `docs/arquitetura/` foram atualizados para refletir a arquitetura vigente. O histórico Git registra a transição do modelo QTS/DBT para ERC-721 e, em seguida, o aprimoramento da versão NFT (livro de ofertas, rede pública, CI).