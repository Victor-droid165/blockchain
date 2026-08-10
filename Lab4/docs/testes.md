# Testes automatizados

Os testes automatizados usam **Hardhat 3**, `node:test` e Viem.

## Preparação

A partir de `Lab4/`:

```bash
nvm use
npm install
npm run build
npm test
```

O projeto possui `.nvmrc` com Node 22 e declara Node `>=22.13.0` em `package.json`.

## Cobertura funcional atual

### `MonetaryOracle.test.ts`

Valida:

- emissão inicial de QTS;
- atualização do índice monetário;
- `previewBalance`;
- `syncBalance`;
- atualização de `totalSupply`;
- restrição de `updateIndex` ao operador autorizado.

### `Compensation.test.ts`

Valida:

- registro de `FiscalDebt`;
- compensação de QTS;
- redução de `remainingAmount`;
- DBT transitório com saldo final zero;
- atualização de `totalCompensatedByAccount`;
- bloqueio de referência reutilizada pelo estado registrado;
- atomicidade quando a dívida fiscal remanescente é insuficiente.

O teste de atomicidade verifica que uma falha no processamento da obrigação fiscal não deixa a queima anterior de QTS persistir.

### `Marketplace.test.ts`

Valida:

- criação e execução de ordem de venda;
- transferência de QTS entre vendedor e comprador;
- encerramento da ordem preenchida;
- atualização de `totalTrades` e `lastTradePriceWei`;
- depósito de ETH de teste em uma ordem de compra;
- devolução do escrow remanescente no cancelamento.

## Observação

Os testes executam sobre uma rede local simulada pelo Hardhat. Eles não substituem testes em uma rede de teste pública nem auditoria de segurança.
