# Lab 4 — Projeto 4: Quitus & Debitus

Prova de conceito para **tokenização de precatórios (QTS)**, **registro de obrigações fiscais (DBT)**, **compensação atômica** e **mercado secundário**.

## Equipe

- Douglas Alves de Sousa
- Maria Luiza Galdino Medeiros
- Nívea Calébia Felix dos Santos
- Victor Emanuel Barbosa Rodrigues

## Estrutura do projeto

```text
Lab4/
├── blockchain/              # Solidity + Hardhat + testes + deploy
│   ├── contracts/
│   ├── scripts/
│   ├── test/
│   ├── hardhat.config.ts
│   └── package.json
├── frontend/                # React + Vite + TypeScript + Viem
│   ├── public/
│   ├── src/
│   └── package.json
├── docs/                    # documentação do sistema e da demonstração
├── package.json             # workspaces e comandos do projeto
└── .nvmrc                   # Node 22
```

> A PoC **não possui um backend HTTP/API próprio**. O frontend conversa diretamente com a blockchain local por JSON-RPC e assina transações pela carteira. A pasta `blockchain/` concentra o que antes estava espalhado na raiz do Lab4.

## Estado das entregas

### Entrega 1

A Entrega 1 estabeleceu a arquitetura e os contratos iniciais. Os diagramas foram mantidos e evoluídos para refletir o código atual em [`docs/arquitetura/`](./docs/arquitetura/).

### Entrega 2 — em desenvolvimento

Já estão implementados:

- tokenização de precatórios e emissão de QTS;
- atualização monetária com `MonetaryOracle`;
- registro de obrigação fiscal;
- compensação atômica com DBT transitório;
- mercado secundário de QTS;
- testes automatizados com Hardhat;
- script de deploy local;
- frontend React para operar e demonstrar a PoC.

Ainda falta consolidar a execução integrada, revisar a experiência da demonstração e definir se haverá deploy em rede pública/testnet.

### Entrega 3

A Entrega 3 será a consolidação final: documentação revisada, demonstração, vídeo, repositório final e tag da entrega.

## Requisitos

- Node.js `>=22.13.0`;
- npm;
- MetaMask ou outra carteira injetada para usar a interface;
- dois terminais para manter a rede local e a interface em execução.

Com `nvm`:

```bash
nvm install
nvm use
npm install
```

O `npm install` na raiz instala os dois workspaces: `blockchain` e `frontend`.

## Validar o projeto

```bash
npm run build
npm test
```

O build compila primeiro os contratos e depois o frontend. Os testes automatizados ficam em [`blockchain/test/`](./blockchain/test/).

## Executar a PoC local

### Terminal 1 — blockchain local

```bash
npm run chain:node
```

### Terminal 2 — deploy

```bash
npm run chain:deploy:localhost
```

O deploy gera automaticamente:

```text
frontend/public/deployment.json
```

com os endereços dos contratos da rede local.

### Terminal 3 — frontend

```bash
npm run frontend:dev
```

Abra a URL exibida pelo Vite e conecte a carteira à rede Hardhat local (`31337`).

## Documentação

O índice da documentação está em [`docs/README.md`](./docs/README.md).

Principais documentos:

- [Arquitetura do sistema](./docs/arquitetura/sistema.md)
- [Diagrama e responsabilidades dos contratos](./docs/arquitetura/contratos.md)
- [Modelo da solução](./docs/modelo-solucao.md)
- [Fluxo de tokenização](./docs/fluxos/tokenizacao.md)
- [Fluxo de compensação](./docs/fluxos/compensacao.md)
- [Fluxo de mercado secundário](./docs/fluxos/mercado-secundario.md)
- [Deploy](./docs/operacao/deploy.md)
- [Testes](./docs/operacao/testes.md)
- [Roteiro de demonstração](./docs/operacao/roteiro-demo.md)

## Limitações da PoC

- não valida juridicamente precatórios ou obrigações fiscais;
- não integra sistemas reais do TJPB/Fazenda;
- não utiliza fonte oficial para o índice monetário;
- usa ETH de teste como mock de liquidação do mercado;
- não implementa identidade institucional, custódia de chaves ou governança de produção;
- não substitui auditoria de segurança nem implantação permissionada de produção.
