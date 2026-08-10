# Roteiro de demonstração

A demonstração principal deve usar o frontend React. Remix fica como ferramenta de inspeção/debug, não como fluxo principal da apresentação.

## Preparação

Na raiz de `Lab4/`:

### Terminal 1

```bash
npm run chain:node
```

### Terminal 2

```bash
npm run chain:deploy:localhost
```

### Terminal 3

```bash
npm run frontend:dev
```

Abra a URL do Vite e conecte MetaMask à rede Hardhat local.

> Para operações institucionais (`tokenizePrecatorio`, `registerFiscalDebt` e `updateIndex`), use a conta que foi utilizada como `issuer/operator` no deploy. Para a compensação, use a conta registrada como devedor.

## Cenário recomendado

### 1. Tokenização

- identificador: `PREC-2026-001`;
- valor: R$ 1.000,00;
- beneficiário: conta do credor/devedor usada na demonstração.

Resultado esperado:

```text
QTS = 100000 unidades internas = R$ 1.000,00
```

### 2. Atualização monetária

Atualizar o índice:

```text
1000000 → 1010000
```

A visão geral deve mostrar preview de R$ 1.010,00. Depois, executar “Sincronizar minha conta” para materializar a correção.

### 3. Mercado secundário

Para não interferir no saldo que será usado na compensação, a demonstração do mercado pode ser feita em uma execução separada ou com QTS adicional.

Fluxo mínimo:

1. aprovar QTS para o marketplace;
2. criar uma oferta de venda;
3. trocar para outra conta;
4. selecionar e executar a ordem;
5. mostrar `totalTrades` e a ordem encerrada.

O ETH usado é de teste e deve ser apresentado explicitamente como mock de liquidação.

### 4. Registrar obrigação fiscal

- identificador: `DIVIDA-2026-001`;
- devedor: conta que possui os QTS;
- valor: R$ 400,00.

Consultar a obrigação pela interface e mostrar:

```text
originalAmount  = R$ 400,00
remainingAmount = R$ 400,00
active          = true
```

### 5. Compensar R$ 250,00

- referência: `COMP-2026-001`;
- obrigação: `DIVIDA-2026-001`;
- valor: R$ 250,00.

Se o saldo QTS antes da compensação for R$ 1.010,00, o resultado esperado é:

```text
QTS restante            = R$ 760,00
FiscalDebt remaining    = R$ 150,00
saldo DBT persistente   = R$ 0,00
totalCompensated        = R$ 250,00
```

Explique que o DBT é emitido e queimado dentro da própria transação.

## Demonstração de atomicidade

Tentar uma nova compensação de R$ 200,00 na mesma obrigação, usando nova referência.

Como restam apenas R$ 150,00 de obrigação, a transação deve reverter. Depois da falha, mostrar que:

- o saldo QTS não diminuiu;
- `remainingAmount` continua R$ 150,00;
- a nova referência não foi persistida como utilizada.

Esse é o ponto principal para explicar a atomicidade da EVM.

## Encerramento

Finalizar mostrando as limitações:

- validação jurídica é off-chain;
- oráculo é mock;
- ETH é liquidação simulada;
- não há integração real com órgãos públicos;
- não há identidade/custódia/governança de produção.
