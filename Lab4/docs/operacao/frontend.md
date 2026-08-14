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
│   ├── useCompensationProtocol.ts
│   ├── useDeployment.ts
│   ├── usePrecatorioProtocol.ts
│   └── useWallet.ts
├── pages/
│   ├── AdminPage.tsx
│   ├── CompensacaoPage.tsx
│   ├── DashboardPage.tsx
│   ├── MarketplacePage.tsx
│   ├── MintPrecatorioPage.tsx
│   └── MyPrecatoriosPage.tsx
├── App.tsx
├── main.tsx
├── styles.css
└── vite-env.d.ts
```

Os nomes refletem o domínio atual. `usePrecatorioProtocol` cobre `PrecatorioNFT`/`PrecatorioMarketplace`; `useCompensationProtocol` cobre `MonetaryOracle`/`CompensationManager` isoladamente, já que os dois últimos são opcionais no `deployment.json` (deploys anteriores à reintrodução do oráculo não os possuem).

A barra superior conecta a carteira injetada, permite **Trocar conta** (reabre o seletor do MetaMask) e **Sair** (limpa só a sessão da PoC — a extensão continua desbloqueada).

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
- selecionar um NFT de **outra conta** (listado ou não) e enviar um lance em ETH de teste (demanda); o formulário não lista os seus próprios tokens, porque o contrato rejeita oferta sobre NFT próprio;
- nos cards de listagem de terceiros, comprar pelo preço fixo ou preencher o formulário de oferta com **Fazer oferta**;
- cancelar listagem própria;
- acompanhar e retirar as próprias ofertas enviadas.

### Meus precatórios

Lista os NFTs da carteira conectada, permite aprovar o marketplace antes da venda (o botão passa a **Marketplace aprovado** e fica desabilitado depois da transação) e mostra as ofertas recebidas em cada NFT, com botão de aceite quando o marketplace já estiver aprovado.

### Emitir NFT

Fluxo institucional de mint. Só a conta administradora configurada no deploy consegue concluir a transação.

### Oráculo & Compensação

Só aparece funcional quando o `deployment.json` carregado inclui `monetaryOracle` e `compensationManager`; caso contrário, a página mostra um aviso em vez dos formulários. Quando disponível, expõe:

- índice de correção vigente, data da última publicação e total de publicações (`MonetaryOracle`);
- publicação de um novo índice, restrita à conta administradora (`updateIndex`);
- registro de débito fiscal mock, restrito à conta administradora (`registerDebt`);
- para qualquer conta conectada: seleção de um NFT próprio e de um débito do qual ela é devedora, com prévia do valor corrigido (calculada no cliente com o mesmo índice on-chain) antes de enviar `compensate`;
- histórico de termos de quitação (`CompensationExecuted`), com precatório, débito, credor, valor de face, valor corrigido e data.

O formulário de compensação recusa localmente combinações em que o débito não comporta o crédito corrigido, evitando uma reversão on-chain previsível (`DebtSmallerThanCredit`). Sequência completa em [`fluxos/compensacao-atomica.md`](../fluxos/compensacao-atomica.md).

### Administração

Expõe `pause`/`unpause`/`invalidate` para `PrecatorioNFT` e `PrecatorioMarketplace`, e — quando o deployment os inclui — para `MonetaryOracle` e `CompensationManager` também.

O upgrade não aparece como botão, pois exige uma nova implementação compilada/validada; a demonstração usa `npm run chain:upgrade-demo:localhost`.

## Consulta e descoberta por eventos

O frontend não percorre sequencialmente todos os `tokenId`s, `listingId`s, `offerId`s ou `debtId`s. O deploy registra `deploymentBlock` e `eventIndex.ts` consulta, a partir desse bloco, os eventos `PrecatorioMinted`, `PrecatorioListed`, `PrecatorioSold`, `ListingCancelled`, `OfferMade`, `OfferCancelled` e `OfferAccepted` com `getContractEvents` do Viem. `FiscalDebtRegistered` e `CompensationExecuted` reconstituem, da mesma forma, os débitos fiscais e os termos de quitação do `CompensationManager` — para cada débito descoberto por evento, o saldo `outstanding` é relido on-chain, já que `compensate` o reduz depois do registro inicial.

Os eventos descobrem quais ativos, listagens e ofertas existem; leituras pontuais (`ownerOf`, `getApproved` e `isApprovedForAll`) confirmam o estado atual necessário à interface. Isso reduz chamadas inúteis para identificadores inexistentes e mantém a PoC sem backend próprio.

Uma listagem ainda marcada como ativa on-chain também é validada contra a propriedade e a aprovação atuais. Se o vendedor transferiu o NFT por fora ou revogou a aprovação, a interface mostra a listagem como **indisponível**, impede a compra e ainda permite ao vendedor cancelá-la. A mesma verificação de aprovação é feita para cada oferta ativa contra o proprietário atual do `tokenId`: sem aprovação, a interface mostra "aguardando aprovação" e desabilita o aceite, mas continua permitindo ao comprador cancelar e recuperar o próprio depósito.

`PrecatorioSold` e `OfferAccepted` são combinados e ordenados por timestamp para formar o histórico de preços exibido na Visão geral — a venda pode ter vindo de uma listagem a preço fixo ou de uma oferta aceita.

Esta estratégia continua sendo uma consulta direta ao RPC, não um indexador persistente. Em escala de produção, um serviço dedicado poderia consumir eventos, manter banco de consulta e oferecer paginação/cache sem alterar os contratos.

Referência: [Viem — `getContractEvents`](https://viem.sh/docs/contract/getContractEvents).
