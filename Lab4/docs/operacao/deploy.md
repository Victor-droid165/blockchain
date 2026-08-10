# Deploy da prova de conceito

O deploy é executado pelo workspace `blockchain` e implanta:

1. `MonetaryOracle`;
2. `QuitusToken`;
3. `DebitusToken`;
4. `CompensationManager`;
5. `QuitusMarketplace`.

Depois, o script configura `CompensationManager` como gerenciador autorizado de QTS e DBT.

## Deploy efêmero

Na raiz de `Lab4/`:

```bash
npm run chain:deploy
```

Esse modo é útil para validar o script, mas a rede simulada termina junto com o processo.

## Deploy local persistente

Terminal 1:

```bash
npm run chain:node
```

Terminal 2:

```bash
npm run chain:deploy:localhost
```

O segundo comando grava automaticamente:

```text
frontend/public/deployment.json
```

O arquivo contém `chainId`, conta emissora/operator e endereços dos cinco contratos.

## Integração com o frontend

O frontend lê `deployment.json` no carregamento. Se o arquivo não existir, a interface informa os comandos necessários para iniciar a rede e realizar o deploy.

## Rede pública ou permissionada

A PoC ainda não inclui credenciais nem configuração final de Sepolia, Besu ou outra rede institucional.

Caso uma rede externa seja utilizada na entrega final:

- as chaves privadas não devem ser versionadas;
- os endereços reais devem ser registrados na documentação final;
- o `deployment.json` deverá refletir a rede escolhida;
- as limitações do mock de oráculo e do pagamento em ETH de teste devem continuar explícitas.
