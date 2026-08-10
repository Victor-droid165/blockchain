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
│   └── package.json
├── frontend/
├── docs/
├── package.json
└── .nvmrc
```

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
```

`package-lock.json` deve permanecer versionado.
