# Fluxo do mercado secundário

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

## Estados administrativos

```text
pause()
→ bloqueio temporário das operações

upgrade
→ troca de implementação enquanto o proxy for válido

invalidate()
→ bloqueio permanente
→ sem unpause
→ sem novas operações
→ sem novos upgrades
```
