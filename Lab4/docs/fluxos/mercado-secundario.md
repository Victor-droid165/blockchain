# Fluxo do mercado secundário

O mercado secundário tem dois lados independentes: a listagem a preço fixo (oferta do vendedor) e o lance escrowado (demanda do comprador). Os dois alimentam o mesmo histórico de preços.

## Listagem

```mermaid
sequenceDiagram
    actor Vendedor
    participant NFT as PrecatorioNFT
    participant MKT as PrecatorioMarketplace

    Vendedor->>NFT: approve(marketplace, tokenId)
    Vendedor->>MKT: list(tokenId, price)
    MKT->>NFT: ownerOf(tokenId)
    MKT->>NFT: getApproved(tokenId)
    MKT->>MKT: cria Listing
    MKT-->>Vendedor: PrecatorioListed
```

O NFT não fica em custódia do marketplace durante a espera por comprador.

## Compra

```mermaid
sequenceDiagram
    actor Comprador
    participant MKT as PrecatorioMarketplace
    participant NFT as PrecatorioNFT
    actor Vendedor

    Comprador->>MKT: buy(listingId) + price
    MKT->>MKT: valida listagem e pagamento
    MKT->>NFT: ownerOf(tokenId)
    MKT->>NFT: verifica aprovação
    MKT->>MKT: active = false
    MKT->>NFT: safeTransferFrom(vendedor, comprador, tokenId)
    MKT->>Vendedor: envia ETH de teste
    MKT-->>Comprador: PrecatorioSold
```

A alteração de estado ocorre antes das chamadas externas e existe proteção contra reentrada no fluxo de compra.

Se a transferência do NFT ou o pagamento falhar, a transação é revertida integralmente.

## Cancelamento

```mermaid
sequenceDiagram
    actor Vendedor
    participant MKT as PrecatorioMarketplace

    Vendedor->>MKT: cancel(listingId)
    MKT->>MKT: verifica seller
    MKT->>MKT: active = false
    MKT-->>Vendedor: ListingCancelled
```

## Oferta (lance sem listagem prévia)

```mermaid
sequenceDiagram
    actor Comprador
    participant MKT as PrecatorioMarketplace
    participant NFT as PrecatorioNFT

    Comprador->>MKT: makeOffer(tokenId) + lance em ETH
    MKT->>NFT: ownerOf(tokenId)
    MKT->>MKT: valida que o comprador não é o proprietário
    MKT->>MKT: valida ausência de oferta ativa do mesmo comprador nesse tokenId
    MKT->>MKT: escrowa o ETH e cria Offer
    MKT-->>Comprador: OfferMade
```

O ETH do lance fica retido no próprio contrato — não há transferência de NFT nesta etapa.

## Aceite de oferta

```mermaid
sequenceDiagram
    actor Proprietário
    participant MKT as PrecatorioMarketplace
    participant NFT as PrecatorioNFT
    actor Comprador

    Proprietário->>MKT: acceptOffer(offerId)
    MKT->>NFT: ownerOf(tokenId)
    MKT->>MKT: bloqueia se proprietário atual = comprador da oferta
    MKT->>NFT: verifica aprovação
    MKT->>MKT: encerra listagem ativa do mesmo tokenId, se houver
    MKT->>MKT: active = false
    MKT->>NFT: safeTransferFrom(proprietário, comprador, tokenId)
    MKT->>Proprietário: envia ETH escrowado do lance
    MKT-->>Comprador: OfferAccepted
```

Quem aceita é sempre o proprietário **atual** do `tokenId`, não necessariamente quem era proprietário quando o lance foi feito: uma oferta sobrevive a uma venda por listagem do mesmo NFT, entrando para o novo proprietário decidir. A exceção é quando o proprietário atual é o próprio comprador da oferta — por exemplo, após uma transferência direta fora do marketplace. Nesse caso, o autoaceite é rejeitado e o comprador deve cancelar a oferta para recuperar o ETH escrowado.

## Cancelamento de oferta

```mermaid
sequenceDiagram
    actor Comprador
    participant MKT as PrecatorioMarketplace

    Comprador->>MKT: cancelOffer(offerId)
    MKT->>MKT: verifica buyer
    MKT->>MKT: active = false
    MKT->>Comprador: devolve o ETH escrowado
    MKT-->>Comprador: OfferCancelled
```

`cancelOffer` funciona mesmo com o marketplace pausado ou invalidado — é a única função mutável do contrato sem essa restrição, para que o depósito do comprador nunca fique preso.

## Histórico de preços

O frontend não lê um histórico on-chain dedicado: ele agrega os eventos `PrecatorioSold` (venda por listagem) e `OfferAccepted` (venda por oferta aceita), ordena por timestamp e apresenta como histórico de preços do mercado secundário.

## Estados administrativos

```text
pause()
→ bloqueio temporário das operações
→ cancelOffer continua funcionando (devolução de saldo do próprio comprador)

upgrade
→ troca de implementação enquanto o proxy for válido

invalidate()
→ bloqueio permanente
→ sem unpause
→ sem novas listagens, ofertas ou aceites
→ sem novos upgrades
→ cancelOffer continua funcionando
```
