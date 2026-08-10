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
2. escolhe a chain e o RPC certos a partir do `chainId` do deployment (Hardhat local, Sepolia ou outra rede conhecida da Viem — ver `blockchain/client.ts`);
3. consulta essa rede por JSON-RPC;
4. solicita assinatura da carteira, garantindo antes que ela esteja na mesma rede do deployment;
5. envia transações diretamente aos proxies.

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
├── styles.css
└── vite-env.d.ts
```

Os nomes refletem o domínio atual; páginas e hooks de QTS, DBT, oráculo e compensação foram removidos.

## Páginas

### Visão geral

Exibe:

- total de NFTs emitidos;
- listagens ativas e ofertas ativas;
- vendas e último preço;
- histórico de preços (últimas vendas, por listagem ou por oferta aceita);
- estado do `PrecatorioNFT`;
- estado do marketplace;
- endereços dos proxies.

### Marketplace

Permite:

- selecionar um NFT próprio, definir preço em ETH de teste e criar listagem (oferta);
- selecionar qualquer NFT que não seja seu e enviar um lance em ETH de teste, com ou sem listagem ativa (demanda);
- visualizar cards de NFTs disponíveis e comprar;
- cancelar listagem própria;
- acompanhar e retirar as próprias ofertas enviadas.

### Meus precatórios

Lista os NFTs da carteira conectada, permite aprovar o marketplace antes da venda e mostra as ofertas recebidas em cada NFT, com botão de aceite quando o marketplace já estiver aprovado.

### Emitir NFT

Fluxo institucional de mint. Só a conta administradora configurada no deploy consegue concluir a transação.

### Administração

Expõe:

- `pause`;
- `unpause`;
- `invalidate`.

O upgrade não aparece como botão, pois exige uma nova implementação compilada/validada; a demonstração usa `npm run chain:upgrade-demo:localhost`.

## Consulta e descoberta por eventos

O frontend não percorre sequencialmente todos os `tokenId`s, `listingId`s e `offerId`s. O deploy registra `deploymentBlock` e `eventIndex.ts` consulta, a partir desse bloco, os eventos `PrecatorioMinted`, `PrecatorioListed`, `PrecatorioSold`, `ListingCancelled`, `OfferMade`, `OfferCancelled` e `OfferAccepted` com `getContractEvents` do Viem.

Os eventos descobrem quais ativos, listagens e ofertas existem; leituras pontuais (`ownerOf`, `getApproved` e `isApprovedForAll`) confirmam o estado atual necessário à interface. Isso reduz chamadas inúteis para identificadores inexistentes e mantém a PoC sem backend próprio.

Uma listagem ainda marcada como ativa on-chain também é validada contra a propriedade e a aprovação atuais. Se o vendedor transferiu o NFT por fora ou revogou a aprovação, a interface mostra a listagem como **indisponível**, impede a compra e ainda permite ao vendedor cancelá-la. A mesma verificação de aprovação é feita para cada oferta ativa contra o proprietário atual do `tokenId`: sem aprovação, a interface mostra "aguardando aprovação" e desabilita o aceite, mas continua permitindo ao comprador cancelar e recuperar o próprio depósito.

`PrecatorioSold` e `OfferAccepted` são combinados e ordenados por timestamp para formar o histórico de preços exibido na Visão geral — a venda pode ter vindo de uma listagem a preço fixo ou de uma oferta aceita.

Esta estratégia continua sendo uma consulta direta ao RPC, não um indexador persistente. Em escala de produção, um serviço dedicado poderia consumir eventos, manter banco de consulta e oferecer paginação/cache sem alterar os contratos.

Referência: [Viem — `getContractEvents`](https://viem.sh/docs/contract/getContractEvents).
