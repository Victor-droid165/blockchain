# Testes automatizados

A camada blockchain usa Hardhat 3, `node:test`, Viem e OpenZeppelin Upgrades.

## Executar

Na raiz de `Lab4/`:

```bash
nvm use
npm install
npm test
```

## `PrecatorioNFT.test.ts`

Cobre:

- mint institucional;
- identificador único;
- propriedade ERC-721;
- bloqueio de mint por conta não autorizada;
- renúncia de ownership desabilitada;
- pausa e retomada;
- bloqueio de transferência durante pausa;
- upgrade UUPS preservando endereço e estado;
- invalidação permanente;
- bloqueio de mint, aprovação, transferência, `unpause` e upgrade após invalidação.

## `PrecatorioMarketplace.test.ts`

Cobre o lado da oferta (listagem):

- listagem de um NFT completo;
- exigência de propriedade;
- exigência de aprovação;
- rejeição de auto-compra e pagamento incorreto;
- renúncia de ownership desabilitada;
- prevenção de duas listagens ativas para o mesmo `tokenId`;
- compra e transferência do NFT;
- cancelamento pelo vendedor;
- pausa e retomada;
- upgrade UUPS preservando endereço e listagens;
- invalidação permanente;
- bloqueio de compra, cancelamento, `unpause` e upgrade após invalidação.

E o lado da demanda (oferta/lance):

- criação, cancelamento e reembolso de uma oferta sem listagem prévia;
- prevenção de oferta duplicada do mesmo comprador no mesmo `tokenId` e de oferta do proprietário sobre o próprio NFT;
- aceite de oferta com transferência do NFT e do ETH escrowado;
- encerramento automático da listagem a preço fixo ao aceitar uma oferta concorrente pelo mesmo NFT;
- aceite de oferta pelo **novo** proprietário depois de uma venda por listagem (a oferta sobrevive à troca de proprietário);
- `cancelOffer` continuando disponível mesmo com o marketplace pausado ou permanentemente invalidado;
- bloqueio de `makeOffer`/`acceptOffer` durante pausa e depois de invalidação.

## Integração contínua

O workflow [`.github/workflows/lab4-ci.yml`](../../../.github/workflows/lab4-ci.yml), na raiz do repositório, roda `npm ci`, compila os contratos, executa `npm test` e builda o frontend a cada push/PR que toque a pasta `Lab4/`. Serve como evidência automatizada e reprodutível de que o repositório permanece funcional, complementando a suíte de testes.

## Comparação de endereços

Viem pode retornar endereços em formato checksum enquanto contas de teste podem aparecer em lowercase. Os testes comparam endereços de forma case-insensitive porque a capitalização não altera o endereço Ethereum.

## Limite dos testes

Os testes exercitam o comportamento da PoC em rede simulada. Eles não substituem auditoria de segurança, revisão jurídica, testes de integração institucional ou testes de carga.
