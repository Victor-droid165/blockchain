# Frontend

## Stack

```text
React
Vite
TypeScript
Viem
MetaMask / carteira injetada
```

Não há API HTTP intermediária. O frontend:

1. lê `public/deployment.json`;
2. consulta a rede Hardhat local por JSON-RPC;
3. solicita assinatura da carteira;
4. envia transações diretamente aos proxies.

## Estrutura

```text
frontend/src/
├── blockchain/
│   ├── abis.ts
│   ├── client.ts
│   ├── eventIndex.ts
│   ├── types.ts
│   └── utils.ts
├── components/
│   ├── FormField.tsx
│   ├── Panel.tsx
│   ├── StatCard.tsx
│   ├── StatusBanner.tsx
│   └── WalletButton.tsx
├── hooks/
│   ├── useDeployment.ts
│   ├── usePrecatorioProtocol.ts
│   └── useWallet.ts
├── pages/
│   ├── AdminPage.tsx
│   ├── DashboardPage.tsx
│   ├── MarketplacePage.tsx
│   ├── MintPrecatorioPage.tsx
│   └── MyPrecatoriosPage.tsx
├── App.tsx
├── main.tsx
└── styles.css
```

Os nomes refletem o domínio atual; páginas e hooks de QTS, DBT, oráculo e compensação foram removidos.

## Páginas

### Visão geral

Exibe:

- total de NFTs emitidos;
- listagens ativas;
- vendas;
- último preço;
- estado do `PrecatorioNFT`;
- estado do marketplace;
- endereços dos proxies.

### Marketplace

Permite:

- selecionar um NFT próprio;
- definir preço em ETH de teste;
- criar listagem;
- visualizar cards de NFTs disponíveis;
- comprar;
- cancelar listagem própria.

### Meus precatórios

Lista os NFTs da carteira conectada e permite aprovar o marketplace antes da venda.

### Emitir NFT

Fluxo institucional de mint. Só a conta administradora configurada no deploy consegue concluir a transação.

### Administração

Expõe:

- `pause`;
- `unpause`;
- `invalidate`.

O upgrade não aparece como botão, pois exige uma nova implementação compilada/validada; a demonstração usa `npm run chain:upgrade-demo:localhost`.

## Consulta e descoberta por eventos

O frontend não percorre sequencialmente todos os `tokenId`s e `listingId`s. O deploy registra `deploymentBlock` e `eventIndex.ts` consulta, a partir desse bloco, os eventos `PrecatorioMinted`, `PrecatorioListed`, `PrecatorioSold` e `ListingCancelled` com `getContractEvents` do Viem.

Os eventos descobrem quais ativos e listagens existem; leituras pontuais (`ownerOf`, `getApproved` e `isApprovedForAll`) confirmam o estado atual necessário à interface. Isso reduz chamadas inúteis para identificadores inexistentes e mantém a PoC sem backend próprio.

Uma listagem ainda marcada como ativa on-chain também é validada contra a propriedade e a aprovação atuais. Se o vendedor transferiu o NFT por fora ou revogou a aprovação, a interface mostra a oferta como **indisponível**, impede a compra e ainda permite ao vendedor cancelá-la.

Esta estratégia continua sendo uma consulta direta ao RPC, não um indexador persistente. Em escala de produção, um serviço dedicado poderia consumir eventos, manter banco de consulta e oferecer paginação/cache sem alterar os contratos.

Referência: [Viem — `getContractEvents`](https://viem.sh/docs/contract/getContractEvents).
