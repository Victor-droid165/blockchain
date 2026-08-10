# Roteiro de demonstração

Objetivo: mostrar em poucos minutos o ciclo completo da PoC e os mecanismos administrativos pedidos no feedback.

## Preparação

Terminal 1:

```bash
npm run chain:node
```

Terminal 2:

```bash
npm run chain:deploy:localhost
```

Terminal 3:

```bash
npm run frontend:dev
```

Conecte o MetaMask à rede Hardhat local (`31337`). A primeira conta do Hardhat é o administrador dos contratos.

## 1. Explicar o problema

Em uma frase:

> A PoC representa cada precatório como um NFT individual e permite sua negociação em um marketplace transparente, mantendo propriedade e transferências registradas on-chain.

Explique também que documentos e validação jurídica foram abstraídos para concentrar a demonstração na transação dos ativos.

## 2. Emitir um NFT

Na página **Emitir NFT**, usando a conta administradora:

```text
Identificador: PREC-2026-001
Proprietário: conta do vendedor
Valor de face: R$ 1.000,00
```

Mostrar que:

- o NFT #1 foi criado;
- `ownerOf(1)` corresponde ao vendedor;
- o ativo aparece em **Meus precatórios** quando essa conta está conectada.

## 3. Aprovar e listar

Com a conta do vendedor:

1. abrir **Meus precatórios**;
2. aprovar o marketplace para NFT #1;
3. abrir **Marketplace**;
4. listar o NFT por, por exemplo, `0.10 ETH`.

Mostrar o card com:

- tokenId;
- valor de face;
- preço;
- vendedor.

## 4. Comprar

Trocar para outra conta do Hardhat e comprar a listagem.

Resultado esperado:

```text
NFT #1 → comprador
ETH de teste → vendedor
listing.active → false
totalSales → +1
```

Voltar a **Meus precatórios** na conta compradora e mostrar o NFT.

## 5. Demonstrar oferta (lado da demanda) e aceite

Emitir um segundo NFT (#2) para uma terceira conta, sem listar.

Com uma quarta conta (comprador interessado):

1. abrir **Marketplace**;
2. no formulário "Fazer uma oferta", selecionar o NFT #2 e propor um lance, por exemplo `0.05 ETH`;
3. mostrar que o ETH saiu da carteira do comprador e ficou retido no contrato (`OfferMade`).

Com a terceira conta (proprietária do NFT #2):

4. abrir **Meus precatórios**;
5. aprovar o marketplace para o NFT #2, se ainda não tiver feito;
6. na seção "Ofertas recebidas" do card do NFT #2, clicar em **Aceitar**.

Resultado esperado:

```text
NFT #2 → comprador que fez a oferta
ETH escrowado → proprietário que aceitou
offer.active → false
totalSales → +1
```

Volte ao **Marketplace** e mostre que a oferta desapareceu de "Suas ofertas enviadas" e que a **Visão geral** agora lista essa venda no histórico de preços com origem "Oferta aceita".

Opcional: repita o passo 2 e, antes do aceite, cancele a oferta pela conta compradora para mostrar a devolução do ETH escrowado (`cancelOffer`).

## 6. Demonstrar pausa

Com o administrador:

1. abrir **Administração**;
2. pausar `PrecatorioMarketplace`;
3. tentar criar/comprar uma listagem;
4. mostrar a falha;
5. executar `unpause`;
6. mostrar que o contrato volta a operar.

Explique: pausa é **temporária**. Se quiser, mostre também que `cancelOffer` continua funcionando mesmo com o marketplace pausado — o comprador de uma oferta ainda ativa consegue recuperar o depósito.

## 7. Demonstrar upgrade

No terminal, com os contratos ainda válidos:

```bash
npm run chain:upgrade-demo:localhost
```

Mostrar na saída:

- mesmo endereço de `PrecatorioNFT`;
- mesmo endereço de `PrecatorioMarketplace`;
- `version = 2`.

Explique: upgrade troca a implementação mantendo o proxy e o estado.

## 8. Demonstrar invalidação permanente

Faça este passo **por último**, pois não existe retorno.

No frontend, como administrador:

1. clicar em **Invalidar permanentemente**;
2. confirmar;
3. mostrar estado `INVALIDADO`;
4. tentar `unpause`/operação e mostrar que não funciona.

Se quiser demonstrar tecnicamente também o bloqueio de upgrade, execute novamente:

```bash
npm run chain:upgrade-demo:localhost
```

O upgrade do contrato invalidado deve falhar.

Explique: invalidação encerra a validade operacional daquele proxy. O histórico continua consultável na blockchain.

## Variante opcional: rede de testes pública

Se o deploy em Sepolia (ver [`deploy.md`](./deploy.md)) já tiver sido feito antes da apresentação, é possível abrir o link do endereço no Etherscan para mostrar que os contratos existem fora da máquina de quem apresenta, com código-fonte verificado. Essa variante não substitui a demonstração local — só reforça a evidência de deploy em rede pública.

## Limitações a declarar

- validação jurídica é off-chain;
- documentos reais não são armazenados;
- ETH é apenas liquidação de teste;
- não há integração institucional real;
- não há indexador persistente; a PoC descobre os registros por eventos via RPC;
- listagens e ofertas cobrem sempre o NFT completo, sem execução parcial;
- contratos não foram auditados para produção.
