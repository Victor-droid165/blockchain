# Diagrama de classes dos contratos

O diagrama abaixo representa somente os contratos da arquitetura atual, divididos em dois grupos por responsabilidade — **ativo e mercado** (representação e negociação do precatório) e **oráculo e compensação** (correção monetária e quitação de débitos) — para manter cada diagrama legível. Os quatro contratos implementam `pause()`, `unpause()`, `invalidate()` e `_authorizeUpgrade()` de forma independente e idêntica em intenção; para não repetir esses métodos em cada classe, eles ficam documentados uma única vez em [«Estados administrativos»](#estados-administrativos).

## Ativo e mercado

```mermaid
classDiagram
    class ERC721PausableUpgradeable {
        <<OpenZeppelin>>
        +ownerOf(tokenId) address
        +approve(to, tokenId)
        +transferFrom(from, to, tokenId)
        +safeTransferFrom(from, to, tokenId)
    }

    class OwnableUpgradeable {
        <<OpenZeppelin>>
        +owner() address
    }

    class UUPSUpgradeable {
        <<OpenZeppelin>>
    }

    class ReentrancyGuardTransient {
        <<OpenZeppelin>>
    }

    class PrecatorioNFT {
        +uint256 nextTokenId
        +address compensationManager
        +mapping precatorios
        +mapping identifiersUsed
        +initialize(initialOwner)
        +mintPrecatorio(to, identifier, faceValue) uint256
        +setCompensationManager(manager)
        +burnForCompensation(tokenId)
    }

    class Precatorio {
        +bytes32 identifier
        +uint256 faceValue
        +uint256 registeredAt
    }

    class PrecatorioMarketplace {
        +IERC721 precatorioNFT
        +mapping listings
        +mapping offers
        +initialize(initialOwner, nft)
        +list(tokenId, price) uint256
        +buy(listingId)
        +cancel(listingId)
        +makeOffer(tokenId) uint256
        +cancelOffer(offerId)
        +acceptOffer(offerId)
    }

    class Listing {
        +address seller
        +uint256 tokenId
        +uint256 price
        +bool active
    }

    class Offer {
        +address buyer
        +uint256 tokenId
        +uint256 amount
        +bool active
    }

    ERC721PausableUpgradeable <|-- PrecatorioNFT
    OwnableUpgradeable <|-- PrecatorioNFT
    UUPSUpgradeable <|-- PrecatorioNFT

    OwnableUpgradeable <|-- PrecatorioMarketplace
    UUPSUpgradeable <|-- PrecatorioMarketplace
    ReentrancyGuardTransient <|-- PrecatorioMarketplace

    PrecatorioNFT "1" --> "*" Precatorio
    PrecatorioMarketplace "1" --> "*" Listing
    PrecatorioMarketplace "1" --> "*" Offer
    PrecatorioMarketplace --> PrecatorioNFT : safeTransferFrom(tokenId)
```

### `PrecatorioNFT`

Cada `tokenId` identifica um precatório individual.

```solidity
struct Precatorio {
    bytes32 identifier;
    uint256 faceValue;
    uint256 registeredAt;
}
```

`mintPrecatorio` aceita somente dados mínimos para a demonstração. O identificador textual informado no frontend é convertido em `bytes32` antes da transação.

A herança de `ERC721PausableUpgradeable` fornece o comportamento ERC-721 e bloqueio de transferências durante pausa. `OwnableUpgradeable` controla as operações institucionais e `UUPSUpgradeable` permite atualização da implementação.

`burnForCompensation` queima um precatório consumido pela compensação atômica e só pode ser chamado pelo endereço definido em `compensationManager` (via `setCompensationManager`, restrito ao owner). Os dados em `precatorios[tokenId]` permanecem como histórico do ativo extinto. A variável `compensationManager` foi adicionada ao final do layout de storage para preservar a compatibilidade de upgrade do proxy — ver [«Oráculo e compensação»](#oráculo-e-compensação) abaixo para como `CompensationManager` consome essa função.

### `PrecatorioMarketplace`

```solidity
struct Listing {
    address seller;
    uint256 tokenId;
    uint256 price;
    uint256 createdAt;
    bool active;
}
```

A listagem não guarda quantidade porque um ERC-721 é individual. O vendedor mantém o NFT na própria carteira até a compra e precisa aprovar previamente o marketplace.

Na compra:

1. a listagem é validada;
2. o estado é marcado como encerrado;
3. o NFT é transferido para o comprador;
4. o ETH de teste é enviado ao vendedor;
5. o evento de venda é emitido.

Se qualquer chamada reverter, a transação inteira é revertida pela EVM. `buy` também usa `ReentrancyGuardTransient` da OpenZeppelin; como a PoC já compila para Cancun, o guard utiliza armazenamento transitório (EIP-1153) sem adicionar estado persistente ao layout do proxy.

#### Lado da demanda — `Offer`

```solidity
struct Offer {
    address buyer;
    uint256 tokenId;
    uint256 amount;
    uint256 createdAt;
    bool active;
}
```

`makeOffer` não exige listagem prévia: qualquer conta que não seja a proprietária atual do `tokenId` pode escrowar ETH de teste como lance. `acceptOffer` só pode ser chamado pelo proprietário atual (que precisa ter aprovado o marketplace, igual a `buy`) e, na mesma transação, encerra uma listagem a preço fixo eventualmente ativa para o mesmo `tokenId`. Se o comprador tiver recebido o NFT por outro fluxo enquanto a oferta ainda estiver ativa, o autoaceite é bloqueado para não registrar uma venda artificial; ele continua podendo usar `cancelOffer` para recuperar o depósito. `cancelOffer` devolve o depósito ao comprador e, deliberadamente, não usa `whenValid`/`whenNotPaused`: como o ETH fica dentro do contrato, o comprador precisa sempre conseguir recuperá-lo.

## Oráculo e compensação

```mermaid
classDiagram
    class OwnableUpgradeable {
        <<OpenZeppelin>>
        +owner() address
    }

    class UUPSUpgradeable {
        <<OpenZeppelin>>
    }

    class MonetaryOracle {
        +uint256 INDEX_PRECISION
        +uint256 currentIndex
        +uint256 lastUpdateAt
        +uint256 totalUpdates
        +initialize(initialOwner)
        +updateIndex(newIndex)
        +adjustedValue(faceValue) uint256
    }

    class CompensationManager {
        +IPrecatorioNFT precatorioNFT
        +IMonetaryOracle monetaryOracle
        +mapping debts
        +mapping compensations
        +initialize(initialOwner, nft, oracle)
        +registerDebt(identifier, debtor, amount) uint256
        +compensate(tokenId, debtId) uint256
    }

    class FiscalDebt {
        +bytes32 identifier
        +address debtor
        +uint256 originalAmount
        +uint256 outstanding
        +uint256 registeredAt
    }

    class Compensation {
        +uint256 tokenId
        +uint256 debtId
        +address creditor
        +uint256 faceValue
        +uint256 adjustedValue
        +uint256 executedAt
    }

    class PrecatorioNFT {
        <<ver diagrama "Ativo e mercado">>
        +burnForCompensation(tokenId)
    }

    OwnableUpgradeable <|-- MonetaryOracle
    UUPSUpgradeable <|-- MonetaryOracle

    OwnableUpgradeable <|-- CompensationManager
    UUPSUpgradeable <|-- CompensationManager

    CompensationManager "1" --> "*" FiscalDebt
    CompensationManager "1" --> "*" Compensation
    CompensationManager --> PrecatorioNFT : burnForCompensation(tokenId)
    CompensationManager --> MonetaryOracle : adjustedValue(faceValue)
```

### `MonetaryOracle`

Oráculo institucional **mock** de atualização monetária. Publica um índice acumulado de correção com precisão de `1e18` (fator neutro `1,0`):

```text
valorCorrigido = faceValue × currentIndex / 1e18
```

`updateIndex` é restrito ao owner (que faz o papel da fonte institucional na PoC) e rejeita índice menor que o vigente: correção monetária acumulada não regride. `adjustedValue` é `view` e continua consultável mesmo com o contrato pausado.

### `CompensationManager`

Núcleo da proposta Quitus & Debitus: compensação atômica entre o crédito do precatório e um débito fiscal mock.

```solidity
struct FiscalDebt {
    bytes32 identifier;
    address debtor;
    uint256 originalAmount;
    uint256 outstanding;
    uint256 registeredAt;
}
```

`registerDebt` (owner, papel da Fazenda) registra débitos com identificador único. `compensate(tokenId, debtId)` exige que o chamador seja simultaneamente o proprietário do NFT e o devedor do débito e, em **uma única transação indivisível**:

1. calcula o crédito: valor de face corrigido pelo `MonetaryOracle`;
2. abate o crédito do saldo devedor;
3. queima o NFT via `burnForCompensation`;
4. grava o registro permanente em `compensations` (termo de quitação consultável) e emite `CompensationExecuted`.

Se qualquer passo reverter, a EVM desfaz tudo — não existe estado intermediário com débito abatido e precatório vivo, nem o contrário. Como um ERC-721 não admite consumo parcial, o débito precisa comportar o crédito inteiro (`DebtSmallerThanCredit` protege o credor de extinguir valor residual); o débito pode ser maior e permanece com saldo remanescente. Justificativa completa em [`decisoes/oraculo-e-compensacao.md`](../decisoes/oraculo-e-compensacao.md).

## Estados administrativos

Os quatro contratos implementam:

```text
ATIVO
  ├─ pause() ──> PAUSADO
  │                 └─ unpause() ──> ATIVO
  ├─ upgrade ──> nova implementação / mesmo proxy
  └─ invalidate() ──> INVALIDADO
                         └─ terminal
```

Depois da invalidação, `_authorizeUpgrade` também rejeita novas atualizações. `renounceOwnership()` é desabilitado em todos os contratos para preservar a capacidade administrativa necessária a pausa, upgrade e invalidação.

Única exceção deliberada: `cancelOffer` continua funcionando mesmo com `PrecatorioMarketplace` pausado ou invalidado, porque é a única função mutável do contrato que devolve um saldo que já pertence ao chamador (o ETH escrowado do próprio lance), em vez de operar um estado de domínio.

## Organização dos arquivos Solidity

A implementação de produção possui quatro contratos próprios, um por responsabilidade on-chain independente: representar o ativo, negociá-lo, corrigi-lo monetariamente e compensá-lo com débitos fiscais. A árvore deliberadamente evita bibliotecas e contratos-base locais sem reutilização real:

```text
blockchain/contracts/
├── PrecatorioNFT.sol
├── PrecatorioMarketplace.sol
├── MonetaryOracle.sol
├── CompensationManager.sol
└── mocks/
    ├── PrecatorioNFTV2.sol
    └── PrecatorioMarketplaceV2.sol
```

Cada contrato principal ocupa um arquivo com o mesmo nome, alinhado ao Style Guide do Solidity. Comportamentos padronizados (ERC-721, propriedade, pausa, UUPS, `IERC721` e proteção contra reentrância) são importados da OpenZeppelin em vez de reimplementados em arquivos locais. Os contratos `V2` ficam isolados em `mocks/` porque existem apenas para validar a demonstração de upgrade — só `PrecatorioNFT` e `PrecatorioMarketplace` têm uma versão `V2`; `MonetaryOracle`/`CompensationManager` não fazem parte dessa demonstração.

Não há uma pasta `interfaces/` própria: `PrecatorioMarketplace` depende somente da interface padronizada `IERC721`, e as interfaces mínimas `IPrecatorioNFT`/`IMonetaryOracle` vivem no próprio `CompensationManager.sol`, seu único consumidor. Também não há contrato-base comum de ciclo de vida: extrair `pause`/`invalidate` para uma nova hierarquia aumentaria a complexidade de herança e de layout de storage de uma arquitetura upgradeable sem ganho relevante de reutilização. Se novas implementações passarem a compartilhar esse comportamento, essa decisão pode ser revista preservando as regras de compatibilidade de storage.

Referências:

- [Solidity — Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- [Solidity — Structure of a Contract](https://docs.soliditylang.org/en/latest/structure-of-a-contract.html)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/5.x)
- [OpenZeppelin — Writing Upgradeable Contracts](https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable)
- [OpenZeppelin — ReentrancyGuardTransient](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.6.1/contracts/utils/ReentrancyGuardTransient.sol)
