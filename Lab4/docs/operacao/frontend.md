# Frontend

O frontend é uma aplicação **React + Vite + TypeScript** com Viem para comunicação Ethereum.

## Estrutura

```text
frontend/src/
├── blockchain/
│   ├── abis.ts
│   ├── client.ts
│   ├── types.ts
│   └── utils.ts
├── components/
├── hooks/
├── pages/
├── App.tsx
├── main.tsx
└── styles.css
```

### `blockchain/`

Concentra detalhes de integração com a rede: ABIs, `PublicClient`, carteira injetada, tipos e conversões de valores/identificadores.

### `hooks/`

- `useDeployment` carrega os endereços gerados pelo deploy;
- `useWallet` gerencia a carteira injetada;
- `useProtocol` concentra leituras, transações e atualização do estado da PoC.

### `pages/`

A interface é dividida por domínio:

- visão geral;
- precatórios;
- obrigações fiscais;
- compensação;
- mercado secundário.

## Configuração da rede

A PoC local espera:

```text
RPC:      http://127.0.0.1:8545
chainId:  31337
```

Ao conectar, a interface solicita à carteira a troca/adição da rede Hardhat local.

## Deployment

`npm run chain:deploy:localhost` cria `frontend/public/deployment.json`. Esse arquivo não é versionado porque os endereços mudam a cada nova rede local.

## Segurança da PoC

O frontend não contém chaves privadas nem credenciais institucionais. Permissões críticas permanecem nos contratos. Em produção, ainda seriam necessários mecanismos de identidade, custódia e autorização adequados ao contexto institucional.
