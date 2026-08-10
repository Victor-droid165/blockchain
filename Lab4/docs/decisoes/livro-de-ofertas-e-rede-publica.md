# Decisão arquitetural — livro de ofertas, rede pública e endurecimento operacional

## Contexto

Depois da simplificação registrada em [`revisao-escopo-nft.md`](./revisao-escopo-nft.md), uma revisão de qualidade identificou lacunas frente aos requisitos mínimos do Projeto 4 mesmo dentro do escopo NFT confirmado pelo professor:

- o marketplace só tinha o lado da oferta (listagem a preço fixo do vendedor), sem lado de demanda;
- não havia histórico de preços consolidado, só o último preço;
- a implantação só existia em rede Hardhat local, sem caminho documentado para uma rede de testes pública;
- o client do frontend estava hardcoded para a chain Hardhat (`31337`), sem suportar outra rede;
- não havia verificação automatizada (CI) do build e dos testes a cada alteração.

Esta decisão registra os ajustes de robustez feitos para tratar essas lacunas sem reabrir a discussão sobre manter o escopo NFT — essa está encerrada, conforme instrução do professor.

## Decisão

### 1. Livro de ofertas real no `PrecatorioMarketplace`

Adicionado o lado de demanda: qualquer conta pode propor um lance (`makeOffer`) por um `tokenId`, com o ETH de teste escrowado no próprio contrato, independentemente de existir uma listagem ativa. O proprietário atual do NFT pode:

- aceitar (`acceptOffer`): transfere o NFT e recebe o ETH escrowado, encerrando também uma eventual listagem a preço fixo do mesmo `tokenId`;
- ignorar, deixando o comprador cancelar (`cancelOffer`) e recuperar o próprio depósito quando quiser.

`cancelOffer` funciona mesmo com o marketplace pausado ou invalidado — decisão deliberada para nunca travar fundos de terceiros dentro do contrato, já documentada no próprio código-fonte.

Combinado com a listagem a preço fixo já existente, isso forma o "livro de ofertas com oferta e demanda" exigido nos requisitos mínimos do projeto. O histórico de preços é reconstituído no frontend a partir dos eventos `PrecatorioSold` (venda por listagem) e `OfferAccepted` (venda por oferta aceita), unificados por ordem cronológica.

### 2. Rede de testes pública (Sepolia)

`hardhat.config.ts` passa a declarar a rede `sepolia`, usando `configVariable` do Hardhat 3 para ler `SEPOLIA_RPC_URL` e `SEPOLIA_PRIVATE_KEY` de `blockchain/.env` (nunca hardcoded, nunca versionado — ver `.env.example`). O plugin `@nomicfoundation/hardhat-verify` (já incluído no toolbox) é configurado para publicar o código-fonte verificado no Etherscan via `ETHERSCAN_API_KEY`.

A Hardhat local continua sendo a rede padrão de desenvolvimento e demonstração; a Sepolia é o caminho documentado para satisfazer o entregável "smart contract deployado em rede de testes... com endereço documentado" com prova verificável fora da máquina de quem apresenta.

### 3. Frontend multi-rede

`frontend/src/blockchain/client.ts` deixou de fixar a chain Hardhat: `configureNetwork(deployment)` escolhe a chain e o RPC certos a partir do `chainId` gravado em `deployment.json`, com `VITE_RPC_URL` como sobrescrita opcional. A troca/adição de rede na carteira (`wallet_switchEthereumChain` / `wallet_addEthereumChain`) também passou a usar os metadados da rede ativa, em vez de assumir sempre Hardhat local.

### 4. Integração contínua

Workflow `.github/workflows/lab4-ci.yml` compila os contratos, roda a suíte de testes Hardhat e builda o frontend a cada push/PR que toque `Lab4/`. O objetivo é dar evidência automatizada e reprodutível de que o repositório permanece em estado funcional, complementando (não substituindo) a suíte de testes.

## Não mudou

- o escopo continua sendo `PrecatorioNFT` + `PrecatorioMarketplace` (ERC-721, sem QTS/DBT/oráculo/compensação), conforme confirmado pelo professor;
- pausa, upgrade UUPS e invalidação permanente continuam com as mesmas regras;
- a Hardhat local continua sendo a rede padrão de desenvolvimento; Sepolia é um caminho adicional, não uma substituição.

## Referências técnicas

- [Hardhat — Configuration Variables](https://hardhat.org/docs/guides/configuration-variables)
- [Hardhat — Verifying a contract](https://hardhat.org/docs/tutorial/verifying)
- [Viem — Chains](https://viem.sh/docs/clients/chains)
- [Viem — `getContractEvents`](https://viem.sh/docs/contract/getContractEvents)
