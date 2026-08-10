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

## 5. Demonstrar pausa

Com o administrador:

1. abrir **Administração**;
2. pausar `PrecatorioMarketplace`;
3. tentar criar/comprar uma listagem;
4. mostrar a falha;
5. executar `unpause`;
6. mostrar que o contrato volta a operar.

Explique: pausa é **temporária**.

## 6. Demonstrar upgrade

No terminal, com os contratos ainda válidos:

```bash
npm run chain:upgrade-demo:localhost
```

Mostrar na saída:

- mesmo endereço de `PrecatorioNFT`;
- mesmo endereço de `PrecatorioMarketplace`;
- `version = 2`.

Explique: upgrade troca a implementação mantendo o proxy e o estado.

## 7. Demonstrar invalidação permanente

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

## Limitações a declarar

- validação jurídica é off-chain;
- documentos reais não são armazenados;
- ETH é apenas liquidação de teste;
- não há integração institucional real;
- não há indexador persistente; a PoC descobre os registros por eventos via RPC;
- contratos não foram auditados para produção.
