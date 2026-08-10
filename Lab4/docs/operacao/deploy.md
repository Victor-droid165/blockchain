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

## Rede de testes pública (Sepolia)

A PoC também pode ser implantada na Sepolia, satisfazendo o entregável de contrato em rede de testes pública com endereço verificável fora da máquina de quem apresenta.

1. Copie `blockchain/.env.example` para `blockchain/.env` e preencha:

   ```text
   SEPOLIA_RPC_URL=...       # Alchemy, Infura, publicnode.com etc.
   SEPOLIA_PRIVATE_KEY=...   # conta de TESTE, sem fundos reais
   ETHERSCAN_API_KEY=...     # opcional, só para verificação de código-fonte
   ```

   `blockchain/.env` nunca é versionado (`.gitignore` na raiz cobre `**/.env`); só `.env.example` fica no repositório.

2. Garanta saldo de Sepolia ETH na conta de teste (faucets como o da própria Alchemy/Infura).

3. Rode o deploy:

   ```bash
   npm run chain:deploy:sepolia
   ```

   O script grava `blockchain/deployments/sepolia.json` e também atualiza `frontend/public/deployment.json`, com o mesmo formato do deploy local — só muda `network`/`chainId`.

4. (Opcional) Verifique o código-fonte no Etherscan. Os contratos são implantados atrás de proxy UUPS; o endereço a verificar é o da **implementação**, que fica registrado em `blockchain/.openzeppelin/sepolia.json`:

   ```bash
   npx hardhat verify --network sepolia <endereco_da_implementacao>
   ```

5. Para rodar o frontend contra a Sepolia, basta que `frontend/public/deployment.json` aponte para ela (passo 3 já faz isso) e que a carteira injetada esteja na rede Sepolia — o frontend detecta o `chainId` do deployment e usa a chain/RPC certos automaticamente (`frontend/src/blockchain/client.ts`). Se quiser um RPC próprio em vez do público padrão do viem, defina `VITE_RPC_URL` em `frontend/.env` (veja `frontend/.env.example`).

A rede Hardhat local continua sendo o ambiente padrão de desenvolvimento e da demonstração principal; a Sepolia é um caminho adicional para evidenciar o deploy em rede pública.

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
