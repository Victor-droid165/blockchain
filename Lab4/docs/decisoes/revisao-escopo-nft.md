# Decisão arquitetural — simplificação para NFT e marketplace

## Contexto

A primeira versão da PoC seguia a proposta original de Quitus & Debitus: QTS/DBT fungíveis, atualização monetária, compensação e mercado secundário.

Após conversa de integrantes da equipe com o professor, o escopo foi simplificado. Os dois relatos convergiram para:

- representar precatórios como NFTs;
- concentrar a demonstração na transação desses NFTs;
- criar um marketplace com experiência semelhante, conceitualmente, a mercados de colecionáveis digitais;
- abstrair documentos e entradas jurídicas complexas;
- permitir atualização da lógica do contrato;
- permitir também a invalidação definitiva de um contrato quando necessário.

Esta decisão registra como a equipe traduziu o feedback para a implementação.

## Decisão

A arquitetura vigente usa dois contratos de domínio:

```text
PrecatorioNFT (ERC-721)
        ↓
PrecatorioMarketplace
```

Cada `tokenId` representa um precatório individual.

O ERC-721 foi escolhido porque padroniza propriedade, aprovação e transferência de ativos não fungíveis identificados individualmente [1].

## Entrada mínima

A blockchain armazena apenas:

```text
tokenId
identifier (hash)
faceValue
registeredAt
owner (via ERC-721)
```

Documentos judiciais, CPF/CNPJ, dados bancários e validação jurídica permanecem fora da cadeia.

Essa abstração é deliberada: a PoC demonstra propriedade e transação do ativo, não a digitalização completa do processo judicial.

## Marketplace

Uma venda identifica um NFT completo:

```solidity
list(tokenId, price)
buy(listingId)
cancel(listingId)
```

Não existe quantidade nem execução parcial. O NFT fica com o vendedor até a compra; para permitir a transferência, o vendedor aprova o marketplace pelo mecanismo padrão do ERC-721 [1].

O ETH usado na PoC é apenas uma forma simples de demonstrar atomicamente pagamento de teste e transferência de propriedade. Não representa a liquidação financeira de uma solução institucional real.

## Pausa, upgrade e invalidação são conceitos diferentes

### Pausa

`pause()` é um mecanismo temporário de emergência. Enquanto pausado, operações sensíveis são bloqueadas; `unpause()` permite retomada. Esse uso segue a finalidade do `Pausable` da OpenZeppelin [2].

### Upgrade

Enquanto o contrato estiver válido, a implementação pode ser atualizada mantendo o endereço do proxy e seu estado.

A PoC usa proxy UUPS e OpenZeppelin Upgrades. O padrão UUPS coloca na implementação o mecanismo de autorização do upgrade, e os plugins da OpenZeppelin validam deployments/upgrades compatíveis [3][4].

```text
Proxy X → Implementation V1
upgrade
Proxy X → Implementation V2
```

### Invalidação permanente

`invalidate()` representa o encerramento definitivo daquele proxy.

Depois da invalidação:

- não há `unpause`;
- não há mint, transferência ou aprovação no NFT;
- não há listagem, compra ou cancelamento no marketplace;
- não há novos upgrades;
- o estado e o histórico continuam legíveis na blockchain.

A invalidação não usa `SELFDESTRUCT`. O EIP-6780 alterou o comportamento desse opcode: fora do caso especial de criação e destruição na mesma transação, ele não remove normalmente código e storage de um contrato já existente [5]. Por isso a PoC representa o requisito como um estado terminal explícito.

## Por que manter upgrade e invalidação ao mesmo tempo?

Os requisitos resolvem problemas diferentes:

```text
correção/evolução necessária
→ upgrade enquanto válido

problema temporário
→ pause → correção → unpause

contrato não deve mais ser aceito
→ invalidate → estado terminal
```

Assim, uma implementação pode evoluir durante sua vida útil, mas a decisão de invalidá-la fecha definitivamente aquele proxy.

## Controle administrativo

A PoC usa `OwnableUpgradeable` para manter a administração simples. `transferOwnership` continua permitido enquanto o contrato for válido, mas `renounceOwnership` é deliberadamente desabilitado. Sem owner, a PoC perderia a capacidade de pausar, fazer upgrade ou executar a invalidação terminal exigida pelo escopo.

## Componentes removidos

A arquitetura revisada não usa mais:

- `ControlledToken`;
- `QuitusToken`;
- `DebitusToken`;
- `MonetaryOracle`;
- `CompensationManager`;
- `QuitusMarketplace`;
- interfaces específicas de QTS/DBT.

O histórico dessas implementações permanece no Git; não é mantido na árvore atual para evitar ambiguidade sobre qual arquitetura está vigente.

## Referências técnicas

[1]: https://eips.ethereum.org/EIPS/eip-721 "EIP-721: Non-Fungible Token Standard"
[2]: https://docs.openzeppelin.com/contracts/5.x/api/utils "OpenZeppelin Contracts — Pausable"
[3]: https://docs.openzeppelin.com/contracts/5.x/api/proxy "OpenZeppelin Contracts — Proxy/UUPS"
[4]: https://docs.openzeppelin.com/upgrades-plugins/hardhat-upgrades "OpenZeppelin Upgrades — Hardhat"
[5]: https://eips.ethereum.org/EIPS/eip-6780 "EIP-6780: SELFDESTRUCT only in same transaction"
