# Revisão de escopo — NFT e marketplace

## Contexto

Após feedback do professor, a direção da PoC foi simplificada, convergindo nos seguintes pontos:

- substituir a tokenização fungível atual por ativos **ERC-721 (NFTs)**;
- representar cada precatório como um ativo individual;
- reduzir a dependência de documentos e dados jurídicos na entrada da PoC;
- colocar o **marketplace de ativos** no centro da demonstração;
- permitir compra, venda e transferência de propriedade pela blockchain;
- oferecer uma interface semelhante conceitualmente a marketplaces de NFT;
- prever uma pausa temporária de emergência;
- permitir **invalidação permanente** do contrato quando ele não puder mais ser considerado válido;
- permitir evolução da lógica dos contratos válidos sem depender de trocar toda a aplicação.

## Consenso adotado

Para evitar acrescentar complexidade não confirmada, esta documentação adota como próxima arquitetura:

```text
Precatório
    ↓
PrecatorioNFT (ERC-721)
    ↓
Marketplace
    ↓
listagem / compra / cancelamento / transferência
```

Cada `tokenId` representa **um precatório individual**.

Nesta etapa de revisão, não será criado um segundo tipo de NFT para obrigação fiscal. Os relatos deixam claro que precatórios devem ser negociados como NFTs, mas não são suficientemente precisos para justificar dois contratos ERC-721 distintos antes da implementação.

Se uma orientação posterior exigir que outro tipo de crédito também seja tokenizado individualmente, o modelo poderá ser estendido.

## Simplificação da entrada

A PoC não precisa receber documentos judiciais completos.

O mint deve trabalhar apenas com os dados mínimos necessários para demonstrar identidade do ativo e negociação, por exemplo:

```text
tokenId
valor de face
identificador de demonstração
data de registro
status
proprietário
```

A validação jurídica real permanece fora do escopo.

A blockchain não precisa armazenar PDF, ordem judicial, CPF, dados bancários ou cópias de documentos.

## Mudança em relação ao modelo atual

### Modelo atualmente implementado

```text
Precatório
    ↓
QTS fungível
    ↓
atualização monetária
    ↓
mercado de quantidades de QTS

Obrigação fiscal
    ↓
DBT transitório
    ↓
compensação atômica
```

### Modelo revisado

```text
Precatório individual
    ↓
ERC-721
    ↓
NFT
    ↓
Marketplace
    ↓
novo proprietário
```

Com isso, deixam de ser centrais na próxima versão:

- `ControlledToken`;
- `QuitusToken` fungível;
- `DebitusToken` fungível/transitório;
- `MonetaryOracle`;
- `CompensationManager`;
- marketplace baseado em quantidade de QTS.

Esses componentes **ainda existem no código neste commit**. A remoção ocorrerá somente depois que a substituição ERC-721 estiver implementada e testada.

## Marketplace revisado

O marketplace deixa de negociar quantidades fungíveis.

Uma listagem passa a identificar um NFT específico:

```solidity
list(
    uint256 tokenId,
    uint256 price
)
```

Fluxo esperado:

```text
Titular possui NFT #42
        ↓
aprova Marketplace
        ↓
lista NFT #42
        ↓
comprador executa compra
        ↓
pagamento → vendedor
NFT #42 → comprador
```

Escopo mínimo:

- listar NFT;
- consultar listagens;
- comprar;
- cancelar listagem;
- transferir propriedade;
- emitir eventos das operações.

Não é necessário implementar order book de quantidades ou execução parcial, porque um ERC-721 é indivisível.

## Segurança, invalidação e evolução

O feedback exige três capacidades distintas, que não devem ser tratadas como sinônimos.

### Pausa de emergência

`pause()` representa uma interrupção **temporária**. Enquanto pausado, operações sensíveis ficam bloqueadas, mas o administrador pode executar `unpause()` e retomar o contrato.

### Upgradeabilidade

Enquanto o contrato permanecer válido, um proxy UUPS mantém o endereço estável e permite trocar a implementação. Isso permite corrigir ou evoluir a lógica sem migrar a aplicação para outro endereço.

```text
Proxy válido → Implementation V1 → upgrade → Implementation V2
```

### Invalidação permanente

`invalidate()` representa uma decisão **terminal e irreversível**. Após a invalidação:

- o contrato fica pausado;
- não pode ser retomado por `unpause()`;
- não pode emitir novos NFTs;
- não permite novas aprovações;
- não permite transferências;
- não permite novos upgrades.

Consultas ao estado e ao histórico continuam possíveis porque a invalidação não tenta apagar a blockchain. Para continuar a solução depois de uma invalidação definitiva, será necessário implantar um novo contrato/proxy.

```text
ATIVO ── pause ──> PAUSADO ── unpause ──> ATIVO
  │
  ├── upgrade ──> nova implementação, mesmo proxy
  │
  └── invalidate ──> INVALIDADO (estado terminal)
```

`selfdestruct` não será usado para representar a invalidação. O requisito será modelado explicitamente no estado do contrato.

## Fronteira on-chain / off-chain revisada

### On-chain

Pretende-se manter:

- propriedade de cada NFT;
- dados mínimos do ativo necessários à PoC;
- aprovações e transferências;
- listagens;
- preço;
- estado da listagem;
- eventos de criação, venda e cancelamento;
- estado de pausa e invalidação;
- mecanismo de upgrade enquanto o contrato permanecer válido.

### Off-chain

Continuam fora da blockchain:

- documentos processuais;
- validação jurídica;
- identidade civil real;
- dados pessoais e bancários;
- pagamento regulado de produção;
- integrações institucionais.

## Impacto no frontend

O frontend atual será reaproveitado estruturalmente — React, Vite, TypeScript, Viem e conexão com carteira continuam válidos.

As páginas serão ajustadas para um fluxo de marketplace de NFT:

```text
Explorar precatórios
Detalhe do precatório
Meus ativos
Criar precatório (perfil institucional)
Listar para venda
Comprar
Cancelar anúncio
Administração / pausa
```

As páginas específicas de QTS, DBT, atualização monetária e compensação serão removidas ou substituídas quando a nova implementação estiver pronta.

## Estratégia de migração

A migração será feita em commits pequenos:

1. registrar a revisão de escopo e atualizar diagramas;
2. implementar `PrecatorioNFT`;
3. adaptar o marketplace para ERC-721;
4. consolidar pausa, upgradeabilidade e invalidação permanente no marketplace;
5. reescrever testes e deploy;
6. adaptar o frontend ao marketplace de NFT;
7. remover contratos e telas do modelo antigo;
8. consolidar os diagramas e a documentação final.

Até a conclusão dos passos de código, a documentação distingue explicitamente **estado implementado** de **arquitetura revisada**.
