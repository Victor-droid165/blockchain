# Modelo da solução

## Objetivo da PoC

Demonstrar um mercado simples de precatórios tokenizados como NFTs:

```mermaid
flowchart LR
    E[Entrada institucional mínima]
    N[Mint PrecatorioNFT]
    A[Aprovação ERC-721]
    L[Listagem]
    C[Compra]
    T[Transferência de propriedade]

    E --> N --> A --> L --> C --> T
```

A PoC não decide se o precatório é juridicamente válido. Ela assume que a validação institucional aconteceu off-chain e demonstra o registro da propriedade e sua negociação.

## Precatório como NFT

Cada precatório corresponde a um `tokenId` de `PrecatorioNFT`.

Dados específicos armazenados:

```solidity
struct Precatorio {
    bytes32 identifier;
    uint256 faceValue;
    uint256 registeredAt;
}
```

A propriedade é mantida pelo próprio ERC-721.

### Identificador

O frontend recebe um identificador textual, por exemplo:

```text
PREC-2026-001
```

e envia seu `keccak256` ao contrato. A PoC usa o hash apenas como identificador abstrato e para impedir duplicidade; ele não é prova jurídica nem hash de um documento obrigatório.

### Valor de face

`faceValue` usa centavos:

```text
100 = R$ 1,00
100000 = R$ 1.000,00
```

O preço de venda no marketplace é independente do valor de face.

## Marketplace

`PrecatorioMarketplace` registra uma listagem por NFT.

```solidity
struct Listing {
    address seller;
    uint256 tokenId;
    uint256 price;
    uint256 createdAt;
    bool active;
}
```

### Listar

Antes da listagem, o proprietário aprova o marketplace:

```text
PrecatorioNFT.approve(marketplace, tokenId)
```

Depois:

```text
PrecatorioMarketplace.list(tokenId, price)
```

O NFT continua na carteira do vendedor até a compra.

### Comprar

`buy(listingId)` recebe exatamente o preço da listagem em ETH de teste.

Na mesma transação:

1. a listagem é encerrada;
2. o NFT é transferido ao comprador;
3. o pagamento de teste é enviado ao vendedor;
4. a venda é registrada por evento.

### Cancelar listagem

Somente o vendedor pode executar `cancel(listingId)` enquanto o marketplace estiver válido e não pausado.

## Segurança operacional

### Pausa temporária

Os dois contratos têm `pause()` e `unpause()` para interrupção temporária.

### Upgrade UUPS

Os dois contratos são implantados atrás de proxies UUPS. Enquanto válidos, podem receber nova implementação mantendo endereço e estado.

O repositório contém versões `V2` apenas para teste/demonstração do mecanismo de upgrade.

### Invalidação permanente

`invalidate()`:

- marca o contrato como invalidado;
- deixa-o pausado;
- impede retomada;
- impede operações mutáveis de domínio;
- impede transferência de ownership;
- impede novos upgrades.

Além disso, `renounceOwnership()` é desabilitado mesmo enquanto o contrato está válido, para evitar que a PoC perca a única conta capaz de pausar, atualizar ou invalidar o proxy.

A blockchain continua permitindo consultas históricas; “invalidado” significa sem validade operacional, não remoção física do bytecode.

A justificativa técnica e as referências estão em [`decisoes/revisao-escopo-nft.md`](./decisoes/revisao-escopo-nft.md).

## Perfis da PoC

### Administrador institucional

Conta configurada no deploy:

- emite precatórios;
- pausa/retoma contratos;
- autoriza upgrades;
- pode invalidar permanentemente os contratos.

### Titular/vendedor

- possui o NFT;
- aprova o marketplace;
- cria e cancela sua listagem.

### Comprador

- consulta listagens;
- compra um NFT com ETH de teste;
- torna-se novo proprietário on-chain.

## Limitações

- não há validação jurídica real;
- não há documentos processuais na blockchain;
- não há integração com TJPB, Fazenda ou sistemas externos;
- ETH local é apenas mock de liquidação;
- não há identidade institucional de produção ou multisig;
- não há indexador persistente off-chain; o frontend descobre ativos e listagens por eventos desde o bloco de deploy e consulta o estado atual diretamente no RPC;
- uma listagem pode permanecer `active` on-chain após transferência externa ou revogação de aprovação; o frontend detecta esse estado, marca a oferta como indisponível e permite ao vendedor cancelá-la;
- a PoC não substitui auditoria de segurança.
