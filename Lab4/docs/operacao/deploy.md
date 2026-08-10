# Deploy

O deploy oficial da PoC implanta **dois proxies UUPS**:

```text
PrecatorioNFT
PrecatorioMarketplace
```

O antigo conjunto QTS/DBT não faz mais parte do script.

## Rede local

Terminal 1:

```bash
npm run chain:node
```

Terminal 2:

```bash
npm run chain:deploy:localhost
```

O script:

1. obtém a primeira conta da rede como administrador;
2. implanta o proxy UUPS de `PrecatorioNFT`;
3. implanta o proxy UUPS de `PrecatorioMarketplace`, apontando para o NFT;
4. grava os endereços.

Exemplo do resultado:

```json
{
  "network": "localhost",
  "chainId": 31337,
  "admin": "0x...",
  "contracts": {
    "precatorioNFT": "0x...",
    "precatorioMarketplace": "0x..."
  }
}
```

São gerados:

```text
blockchain/deployments/localhost.json
frontend/public/deployment.json
```

Esses arquivos são locais e ficam ignorados pelo Git. O arquivo versionado para documentar o formato é:

```text
frontend/public/deployment.example.json
```

## Upgrade de demonstração

O repositório inclui duas implementações de teste:

```text
contracts/mocks/PrecatorioNFTV2.sol
contracts/mocks/PrecatorioMarketplaceV2.sol
```

Depois do deploy local:

```bash
npm run chain:upgrade-demo:localhost
```

O script lê os endereços em `blockchain/deployments/localhost.json` e executa `upgradeProxy` para as versões V2.

O objetivo é demonstrar:

```text
mesmo endereço do proxy
+
estado preservado
+
nova implementação
```

As versões V2 existem apenas para teste/demonstração e adicionam `version() -> 2`.

## Invalidação

Invalidação não é um deploy ou upgrade. Ela é uma transação administrativa terminal executada no proxy atual.

Depois de `invalidate()`:

- o endereço continua existindo;
- histórico e estado continuam consultáveis;
- operações mutáveis ficam bloqueadas;
- o próprio `_authorizeUpgrade` impede novos upgrades.

Se a aplicação precisasse continuar após a invalidação, seria necessário implantar **outro proxy**, com outro endereço.
