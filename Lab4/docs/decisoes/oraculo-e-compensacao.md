# Decisão arquitetural — oráculo de atualização monetária e compensação atômica

## Contexto

A revisão de escopo registrada em [`revisao-escopo-nft.md`](./revisao-escopo-nft.md) removeu da árvore o conjunto QTS/DBT original, incluindo oráculo e compensação. Entretanto, o documento oficial da disciplina mantém, entre os requisitos mínimos do Projeto 4:

- **atualização monetária via oráculo institucional**;
- **compensação atômica** entre o crédito do precatório e o débito fiscal, em transação indivisível;

e lista o oráculo (Chainlink ou mock implementado pelo grupo) como critério explícito de nota máxima para os Projetos 3 e 4.

Esta decisão reintroduz os dois requisitos **adaptados ao modelo NFT vigente**, sem retornar aos tokens fungíveis QTS/DBT.

## Decisão

Dois novos contratos de domínio, com o mesmo ciclo de vida dos existentes (proxy UUPS, pausa temporária, invalidação permanente, `renounceOwnership` desabilitado):

```text
MonetaryOracle
        ↑ consulta índice
CompensationManager ──(burnForCompensation)──> PrecatorioNFT
        └── registro mock de débitos fiscais
```

### `MonetaryOracle`

Publica um **índice acumulado de correção** com precisão fixa de `1e18` (fator neutro `1,0`). O valor corrigido de um precatório é:

```text
valorCorrigido = faceValue × currentIndex / 1e18
```

Escolhas deliberadas:

- **mock institucional**: o owner faz o papel da fonte oficial (SELIC/IPCA-E). Na solução real, a publicação viria de integração institucional ou de uma rede de oráculos como Chainlink;
- **índice monotônico**: correção monetária acumulada não regride; `updateIndex` rejeita valores menores que o vigente;
- **consulta sempre disponível**: `adjustedValue` é `view` e funciona mesmo com o contrato pausado — a pausa bloqueia apenas novas publicações.

### `CompensationManager`

Mantém um registro **mock** de débitos fiscais (papel da Fazenda, exercido pelo owner na PoC) e executa a compensação:

```solidity
registerDebt(identifier, debtor, amount)  // owner (Fazenda mock)
compensate(tokenId, debtId)               // credor-devedor
```

`compensate` exige que o chamador seja, ao mesmo tempo, o proprietário atual do NFT e o devedor do débito, e executa em **uma única transação**:

1. calcula o crédito: valor de face corrigido pelo `MonetaryOracle` no momento da execução;
2. abate o crédito do saldo devedor (`outstanding`);
3. queima o NFT via `burnForCompensation`;
4. grava um registro permanente em `compensations` (papel de termo de quitação consultável) e emite `CompensationExecuted`.

Se qualquer passo reverter, a EVM desfaz a transação inteira — é isso que torna a compensação **atômica**: não existe estado intermediário em que o débito foi abatido mas o precatório continua existindo, nem o contrário.

## Por que o débito precisa comportar o crédito inteiro

Um ERC-721 não admite consumo parcial. Se o crédito corrigido fosse maior que o saldo devedor, o excedente do credor seria extinto junto com o NFT. A PoC rejeita esse caso (`DebtSmallerThanCredit`) para proteger o credor; o débito, por outro lado, pode ser maior que o crédito e permanece com saldo residual após a compensação.

Na arquitetura fungível original, esse problema não existia (queimava-se exatamente a quantidade compensada de QTS e DBT). É uma limitação conhecida da adaptação ao modelo NFT, registrada também nas limitações do README.

## Queima autorizada no `PrecatorioNFT`

O NFT ganhou:

- `compensationManager` — único endereço autorizado a queimar, definido pelo owner via `setCompensationManager`;
- `burnForCompensation(tokenId)` — chamado somente pelo módulo de compensação, dentro da transação de `compensate`.

A variável nova foi adicionada **ao final do layout de storage**, preservando a compatibilidade de upgrade do proxy existente. Os dados em `precatorios[tokenId]` não são apagados na queima: permanecem como histórico consultável do ativo extinto, coerente com o princípio da PoC de que a invalidação/extinção bloqueia operações sem apagar o passado.

## Impacto no restante da PoC

- **Marketplace**: inalterado. Uma listagem ou oferta sobre um NFT queimado deixa de ser executável (o `ownerOf` deixa de existir); o comprador de uma oferta segue podendo `cancelOffer` e recuperar o ETH escrowado.
- **Frontend**: o índice de eventos tolera NFTs queimados (o token compensado sai da lista de ativos vigentes; o histórico permanece nos eventos). A página **Oráculo & Compensação** expõe o fluxo completo — publicação de índice e registro de débito (admin), compensação (credor-devedor) e histórico de termos de quitação — reconstituído a partir de `FiscalDebtRegistered`/`CompensationExecuted`; ver [`operacao/frontend.md`](../operacao/frontend.md#oráculo--compensação).
- **Deploy**: o script implanta os quatro proxies e autoriza o `CompensationManager` no NFT na mesma execução.

## Referências técnicas

- [EIP-721 — Non-Fungible Token Standard](https://eips.ethereum.org/EIPS/eip-721)
- [OpenZeppelin Contracts — Proxy/UUPS](https://docs.openzeppelin.com/contracts/5.x/api/proxy)
- [OpenZeppelin — Writing Upgradeable Contracts](https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable) (regras de layout de storage)
- [Chainlink Data Feeds](https://docs.chain.link/data-feeds) (caminho real para o papel do oráculo mock)
