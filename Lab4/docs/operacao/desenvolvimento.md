# Ambiente de desenvolvimento

## Estrutura

O Lab4 usa npm workspaces:

```text
Lab4/
├── blockchain/
└── frontend/
```

A instalação de dependências é feita uma única vez na raiz.

## Preparação

Como este refactor moveu o projeto Hardhat da raiz para `blockchain/` e passou a usar workspaces, faça uma reinstalação limpa **uma vez** ao aplicar a mudança:

```bash
cd Lab4
nvm use
rm -rf node_modules package-lock.json
npm install
```

Depois disso, basta manter o `package-lock.json` gerado na raiz versionado normalmente.

A versão de Node esperada é `>=22.13.0`; `.nvmrc` aponta para Node 22.

## Comandos principais

Validar tudo:

```bash
npm run build
npm test
```

Somente blockchain:

```bash
npm run chain:build
npm run chain:test
```

Rede local:

```bash
npm run chain:node
```

Deploy na rede local persistente:

```bash
npm run chain:deploy:localhost
```

Frontend:

```bash
npm run frontend:dev
```

## Fluxo recomendado

1. executar `npm run build`;
2. executar `npm test`;
3. iniciar `npm run chain:node` em um terminal;
4. executar `npm run chain:deploy:localhost` em outro;
5. iniciar `npm run frontend:dev`;
6. conectar MetaMask à rede local e executar os fluxos pela interface.

## Arquivos gerados

Os seguintes artefatos não devem ser versionados:

```text
node_modules/
blockchain/artifacts/
blockchain/cache/
frontend/dist/
frontend/public/deployment.json
```

`frontend/public/deployment.json` é recriado a cada deploy local e contém endereços válidos apenas para aquela rede em execução.
