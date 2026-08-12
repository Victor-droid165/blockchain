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

   Diferente da rede Hardhat local — onde o OpenZeppelin Upgrades grava esse manifesto fora do repositório, num diretório temporário do sistema, porque detecta uma rede de desenvolvimento efêmera —, para a Sepolia ele é gravado dentro do projeto e **deve ser commitado**: não contém segredos, só o histórico de proxies/implementações necessário para validar upgrades futuros naquele deploy real.

5. Para rodar o frontend contra a Sepolia, basta que `frontend/public/deployment.json` aponte para ela (passo 3 já faz isso) e que a carteira injetada esteja na rede Sepolia — o frontend detecta o `chainId` do deployment e usa a chain/RPC certos automaticamente (`frontend/src/blockchain/client.ts`). Se quiser um RPC próprio em vez do público padrão do viem, defina `VITE_RPC_URL` em `frontend/.env` (veja `frontend/.env.example`).

A rede Hardhat local continua sendo o ambiente padrão de desenvolvimento e da demonstração principal; a Sepolia é um caminho adicional para evidenciar o deploy em rede pública.

### Deploy atual na Sepolia

Implantação realizada na chain `11155111` (bloco `11470403`). Admin do deploy: `0x42c15620b4adac4ef8ae3953f5526b18b4cebe12`.

**Proxies** (endereços usados pelo frontend / interação):

| Contrato | Proxy | Etherscan |
| --- | --- | --- |
| `PrecatorioNFT` | `0x4D59c2b2d3A96019B3FC4B14CaFF2143f1EC74C8` | [abrir](https://sepolia.etherscan.io/address/0x4D59c2b2d3A96019B3FC4B14CaFF2143f1EC74C8) |
| `PrecatorioMarketplace` | `0x79D17Cd563A472dDe76d41C63e22dbDc97c6d087` | [abrir](https://sepolia.etherscan.io/address/0x79D17Cd563A472dDe76d41C63e22dbDc97c6d087) |

**Implementações** (código-fonte verificado no Etherscan):

| Contrato | Implementação | Código verificado |
| --- | --- | --- |
| `PrecatorioNFT` | `0x971B0fdFA3658813449F144c38B7c1c7Ed4346cB` | [abrir](https://sepolia.etherscan.io/address/0x971B0fdFA3658813449F144c38B7c1c7Ed4346cB#code) |
| `PrecatorioMarketplace` | `0x20EC3b95B1Fb7A3a4e4e85d83Bb0C2c41E3b9e4c` | [abrir](https://sepolia.etherscan.io/address/0x20EC3b95B1Fb7A3a4e4e85d83Bb0C2c41E3b9e4c#code) |

O histórico UUPS desse deploy fica em `blockchain/.openzeppelin/sepolia.json` e deve permanecer versionado. Os arquivos locais `blockchain/deployments/sepolia.json` e `frontend/public/deployment.json` continuam ignorados pelo Git.

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
