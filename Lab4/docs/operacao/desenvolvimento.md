# Desenvolvimento

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
│   └── .env.example
├── docs/
├── package.json
└── .nvmrc
```

Na raiz do repositório (fora de `Lab4/`) fica [`.github/workflows/lab4-ci.yml`](../../../.github/workflows/lab4-ci.yml), que roda build e testes desta pasta a cada push/PR.

Não existe um backend HTTP separado. Para esta PoC, a camada `blockchain/` contém o estado e as regras on-chain; o frontend acessa a rede diretamente com Viem.

## Requisitos

- Node.js `>=22.13.0`;
- npm;
- MetaMask ou outra carteira injetada;
- navegador moderno.

```bash
nvm use
npm install
```

O `package.json` raiz usa workspaces para instalar blockchain e frontend em uma única execução.

## Validar

```bash
npm run build
npm test
```

Ou separadamente:

```bash
npm run chain:build
npm run chain:test
npm run frontend:build
```

Essas três etapas são exatamente o que o workflow de CI (`.github/workflows/lab4-ci.yml`, na raiz do repositório) roda a cada push/PR que toque `Lab4/`.

## Desenvolvimento local

Terminal 1:

```bash
npm run chain:node
```

Terminal 2:

```bash
npm run chain:deploy:localhost
```

Terminal 3:

```bash
npm run frontend:dev
```

Para implantar na rede de testes pública (Sepolia) em vez da rede local, veja [`deploy.md`](./deploy.md) — requer preencher `blockchain/.env` a partir de `blockchain/.env.example`.

## Solidity e EVM

Os contratos usam Solidity `0.8.24` e alvo EVM `cancun`.

```ts
solidity: {
  version: "0.8.24",
  settings: {
    evmVersion: "cancun",
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
}
```

OpenZeppelin Contracts 5.6.x utiliza `MCOPY` em utilitários internos; o suporte relacionado ao alvo Cancun foi introduzido na linha Solidity 0.8.24/0.8.25. A configuração explícita evita erro de compilação no `Bytes.sol`.

Referências:

- [Solidity 0.8.24](https://www.soliditylang.org/blog/2024/01/26/solidity-0.8.24-release-announcement/)
- [Solidity 0.8.25 e `MCOPY`](https://www.soliditylang.org/blog/2024/03/14/solidity-0.8.25-release-announcement/)
- [OpenZeppelin Contracts 5.6.1](https://github.com/OpenZeppelin/openzeppelin-contracts/releases/tag/v5.6.1)

## Arquivos gerados

Não devem ser commitados:

```text
node_modules/
blockchain/artifacts/
blockchain/cache/
blockchain/deployments/*.json
frontend/dist/
frontend/public/deployment.json
*.tsbuildinfo
**/.env
```

`package-lock.json` e os arquivos `.env.example` (blockchain e frontend) devem permanecer versionados; são o modelo, não o segredo.

Exceção: se um deploy real em Sepolia for feito, o manifesto gerado pelo OpenZeppelin Upgrades em `blockchain/.openzeppelin/sepolia.json` **deve** ser commitado — ele não contém segredos, só o histórico de proxies/implementações daquele deploy, e é o que evidencia e valida upgrades futuros naquela rede pública. Para a rede Hardhat local (dev instance), o mesmo plugin já grava esse manifesto fora do repositório (diretório temporário do sistema), então não aparece aqui.
