# Deploy da prova de conceito

O script [`scripts/deploy.ts`](../scripts/deploy.ts) implanta e configura os contratos que compõem o estado atual da PoC:

1. `MonetaryOracle`;
2. `QuitusToken`;
3. `DebitusToken`;
4. `CompensationManager`;
5. `QuitusMarketplace`.

Depois do deploy, o script também configura `CompensationManager` como gerenciador autorizado em QTS e DBT.

## Versão do Node

O projeto possui `.nvmrc` com Node 22 e também declara em `package.json`:

```json
"engines": {
  "node": ">=22.13.0"
}
```

Com `nvm`:

```bash
nvm install
nvm use
```

## Deploy efêmero no Hardhat

A partir de `Lab4/`:

```bash
npm run deploy
```

Esse comando cria uma rede simulada apenas para a execução do script. Ao finalizar o processo, esse estado não fica disponível para outra aplicação.

O script imprime no terminal:

- rede;
- endereço do emissor/operador;
- endereço de `MonetaryOracle`;
- endereço de `QuitusToken`;
- endereço de `DebitusToken`;
- endereço de `CompensationManager`;
- endereço de `QuitusMarketplace`.

## Deploy em nó local persistente

Para manter a blockchain local ativa e permitir que uma interface se conecte a ela, abra um terminal:

```bash
npm run node
```

Em outro terminal, dentro de `Lab4/`:

```bash
nvm use
npm run deploy:localhost
```

O primeiro processo precisa continuar em execução enquanto contratos e aplicações estiverem usando a rede local.

## Ordem executada

```text
issuer/operator
      │
      ├── deploy MonetaryOracle
      │
      ├── deploy QuitusToken ────────> MonetaryOracle
      │
      ├── deploy DebitusToken
      │
      ├── deploy CompensationManager ─> QTS + DBT
      │
      ├── deploy QuitusMarketplace ───> QTS
      │
      ├── QTS.setCompensationManager(...)
      │
      └── DBT.setCompensationManager(...)
```

## Rede pública

Este commit prepara o fluxo de deploy, mas não inclui credenciais nem configura uma conta real para Sepolia ou outra rede pública.

Quando uma rede pública for adotada para a entrega, os endereços efetivamente implantados deverão ser registrados na documentação final. Não se deve reutilizar chaves privadas de desenvolvimento nem versioná-las no repositório.
