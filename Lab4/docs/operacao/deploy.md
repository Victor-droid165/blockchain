# Deploy

O deploy oficial da PoC implanta **quatro proxies UUPS**:

```text
PrecatorioNFT
PrecatorioMarketplace
MonetaryOracle
CompensationManager
```

O antigo conjunto QTS/DBT fungível não faz mais parte do script; oráculo e compensação foram reintroduzidos adaptados ao modelo NFT (ver [`decisoes/oraculo-e-compensacao.md`](../decisoes/oraculo-e-compensacao.md)).

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
4. implanta o proxy UUPS de `MonetaryOracle` (índice inicial neutro `1,0`);
5. implanta o proxy UUPS de `CompensationManager`, apontando para NFT e oráculo;
6. autoriza o `CompensationManager` a queimar precatórios (`setCompensationManager`);
7. grava os endereços.

Exemplo do resultado:

```json
{
  "network": "localhost",
  "chainId": 31337,
  "admin": "0x...",
  "contracts": {
    "precatorioNFT": "0x...",
    "precatorioMarketplace": "0x...",
    "monetaryOracle": "0x...",
    "compensationManager": "0x..."
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

Os quatro proxies estão ativos: `PrecatorioNFT` e `PrecatorioMarketplace` foram implantados primeiro e depois tiveram a implementação **atualizada in-place** (mesmo endereço de proxy) para incorporar `burnForCompensation`/`setCompensationManager` e a correção que impede autoaceite de ofertas; `MonetaryOracle` e `CompensationManager` foram implantados na sequência — ver [«Estendendo um deploy existente»](#estendendo-um-deploy-existente-upgrade--novos-proxies) abaixo.

**Proxies** (endereços usados pelo frontend / interação):

| Contrato | Proxy | Etherscan |
| --- | --- | --- |
| `PrecatorioNFT` | `0x4D59c2b2d3A96019B3FC4B14CaFF2143f1EC74C8` | [abrir](https://sepolia.etherscan.io/address/0x4D59c2b2d3A96019B3FC4B14CaFF2143f1EC74C8) |
| `PrecatorioMarketplace` | `0x79D17Cd563A472dDe76d41C63e22dbDc97c6d087` | [abrir](https://sepolia.etherscan.io/address/0x79D17Cd563A472dDe76d41C63e22dbDc97c6d087) |
| `MonetaryOracle` | `0x9A53278A32AF3e2dd5cA58AB3E8dBA63feB37dA1` | [abrir](https://sepolia.etherscan.io/address/0x9A53278A32AF3e2dd5cA58AB3E8dBA63feB37dA1) |
| `CompensationManager` | `0xab1D387a99d1140AD954dfA27965C77aEE59Cf21` | [abrir](https://sepolia.etherscan.io/address/0xab1D387a99d1140AD954dfA27965C77aEE59Cf21) |

**Implementações atuais** (código-fonte verificado no Etherscan):

| Contrato | Implementação | Código verificado |
| --- | --- | --- |
| `PrecatorioNFT` | `0x9f2a7801676fc9f1CeeBd21be0382A3ed6Fb66aB` | [abrir](https://sepolia.etherscan.io/address/0x9f2a7801676fc9f1CeeBd21be0382A3ed6Fb66aB#code) |
| `PrecatorioMarketplace` | `0x49A54D0cE6c477A85fB244E5C81D670309eea9A8` | [abrir](https://sepolia.etherscan.io/address/0x49A54D0cE6c477A85fB244E5C81D670309eea9A8#code) |
| `MonetaryOracle` | `0xbe2A62257a4AB4481e1C1BA7614EdC3C057F810c` | [abrir](https://sepolia.etherscan.io/address/0xbe2A62257a4AB4481e1C1BA7614EdC3C057F810c#code) |
| `CompensationManager` | `0x35Cc04eCd9ABAE185E0906542Ec61dE214Ec727B` | [abrir](https://sepolia.etherscan.io/address/0x35Cc04eCd9ABAE185E0906542Ec61dE214Ec727B#code) |

As implementações originais de `PrecatorioNFT` (`0x971B0fdFA3658813449F144c38B7c1c7Ed4346cB`) e `PrecatorioMarketplace` (`0x20EC3b95B1Fb7A3a4e4e85d83Bb0C2c41E3b9e4c`) continuam verificadas no Etherscan como histórico do proxy, mas não são mais a implementação ativa.

O histórico UUPS desse deploy fica em `blockchain/.openzeppelin/sepolia.json` e deve permanecer versionado. Os arquivos locais `blockchain/deployments/sepolia.json` e `frontend/public/deployment.json` continuam ignorados pelo Git.

### Estendendo um deploy existente (upgrade + novos proxies)

Quando um deploy já em produção (como o da Sepolia acima) precisa incorporar contratos novos que dependem de proxies já publicados — foi o caso de `MonetaryOracle`/`CompensationManager` chegando depois de `PrecatorioNFT`/`PrecatorioMarketplace` já estarem no ar —, um novo `deploy.ts` completo não serve: ele criaria proxies novos para os quatro contratos, invalidando os endereços de `PrecatorioNFT`/`PrecatorioMarketplace` já divulgados/verificados.

Para esse cenário existe `scripts/extend-with-compensation.ts`:

```bash
npm run chain:extend-with-compensation:sepolia
```

O script:

1. lê o `deployments/<network>.json` existente (precisa já ter `precatorioNFT`/`precatorioMarketplace`);
2. confere que a conta configurada é o `admin` registrado no deployment (upgrade e `setCompensationManager` exigem a conta owner);
3. faz `upgradeProxy` de `PrecatorioNFT` e `PrecatorioMarketplace` para as implementações atuais do repositório — **mesmo endereço de proxy**, `deploymentBlock` preservado (o índice de eventos do frontend continua cobrindo o histórico anterior);
4. implanta proxies novos para `MonetaryOracle` e `CompensationManager`;
5. autoriza o novo `CompensationManager` a queimar precatórios (`setCompensationManager`);
6. regrava `deployments/<network>.json` e `frontend/public/deployment.json` com os quatro endereços.

Essa é uma operação pontual — outros contratos, no futuro, provavelmente vão precisar de um script equivalente sob medida, não deste mesmo arquivo.

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
