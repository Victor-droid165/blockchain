# Testes automatizados

Os testes da camada blockchain usam **Hardhat 3**, `node:test` e Viem.

## Executar

Na raiz de `Lab4/`:

```bash
nvm use
npm install
npm test
```

Ou diretamente no workspace:

```bash
npm run chain:test
```

## Suítes

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
- atomicidade quando a obrigação restante é insuficiente.

### `Marketplace.test.ts`

Valida:

- criação e execução de ordem de venda;
- transferência de QTS;
- encerramento da ordem;
- `totalTrades` e `lastTradePriceWei`;
- escrow de ETH de teste em ordem de compra;
- devolução do escrow no cancelamento.

## Escopo

Esses testes validam regras de contrato em rede simulada. Eles não substituem auditoria de segurança, testes de integração institucional nem validação jurídica do modelo.
