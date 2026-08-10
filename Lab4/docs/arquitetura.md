# Diagrama de arquitetura

## Visão geral

```mermaid
flowchart LR
    C[Credor / contribuinte]
    O[Órgão institucional<br/>TJPB / Fazenda Pública]
    A[Administrador institucional]
    OP[Operador do oráculo]

    subgraph OFF["Fora da blockchain — off-chain"]
        FE[Aplicação web<br/>planejada]
        API[Backend / API<br/>planejado]
        DB[(Banco de dados operacional<br/>planejado)]
        DOC[(Documentos e dados sigilosos)]
        IDX[Indexador de eventos<br/>planejado]
        MKTUI[Interface do mercado<br/>planejada]
    end

    subgraph ON["Blockchain — on-chain"]
        ORA[MonetaryOracle]
        QTS[QuitusToken<br/>QTS]
        DBT[DebitusToken<br/>DBT + obrigações fiscais]
        CMP[CompensationManager]
        MKT[QuitusMarketplace]
    end

    C -. futura interface .-> FE
    A -. futura interface .-> FE
    O -. futura integração .-> API
    FE -. futura integração .-> API
    API -.-> DB
    API -.-> DOC
    API -. transações futuras .-> QTS
    API -. transações futuras .-> DBT

    O -->|tokeniza precatório| QTS
    O -->|registra obrigação fiscal| DBT
    OP -->|updateIndex| ORA
    ORA -->|currentIndex| QTS
    C -->|carteira / transação| CMP

    QTS --> CMP
    DBT --> CMP

    QTS -. eventos .-> IDX
    DBT -. eventos .-> IDX
    CMP -. eventos .-> IDX
    ORA -. eventos .-> IDX
    IDX -.-> API
    API -.-> FE

    FE -. futura interface .-> MKTUI
    MKTUI -. transações .-> MKT
    C -->|cria/preenche ordens| MKT
    MKT -->|transferFrom / transfer| QTS
```

## O que fica on-chain

- Hash do identificador institucional do precatório, do crédito fiscal e da obrigação fiscal;
- Endereço do titular, beneficiário ou devedor associado ao registro;
- Valor tokenizado e valores da obrigação fiscal em unidades inteiras de centavo;
- Saldos e oferta total de QTS e DBT;
- Índice monetário atual publicado pelo `MonetaryOracle`;
- Último índice aplicado a cada conta QTS;
- Registro único das compensações executadas;
- Eventos de emissão, atualização monetária, transferência, queima, registro fiscal e compensação;
- Ordens de compra e venda do mercado secundário, valores remanescentes e eventos de negociação.

## O que fica off-chain

- PDFs e documentos judiciais completos;
- CPF, dados bancários e demais dados pessoais;
- Informações processuais sigilosas;
- Evidências e documentos usados pela instituição para autorizar a emissão;
- Banco operacional, autenticação, interface e indexação dos eventos;
- Fonte institucional real do índice monetário;
- Interface de usuário e indexação amigável do histórico de mercado.

## Justificativas preliminares

1. **Privacidade:** a blockchain armazena hashes e valores mínimos, e não documentos nem dados pessoais completos.
2. **Auditabilidade:** emissões, transferências, queimas e compensações ficam registradas como transações e eventos.
3. **Atomicidade:** a compensação queima QTS, materializa e queima DBT e reduz a obrigação fiscal na mesma transação. Se uma etapa falhar, nenhuma alteração permanece.
4. **Atualização monetária:** `MonetaryOracle` publica um índice cumulativo e `QuitusToken` o utiliza para materializar correções de forma lazy.
5. **Integração institucional:** backend, autenticação e integrações reais com TJPB/Fazenda ainda são componentes planejados.
6. **Mercado secundário:** `QuitusMarketplace` mantém ofertas on-chain e usa ETH de teste apenas como mecanismo técnico de liquidação.
7. **Evolução:** indexador, backend e aplicação web continuam planejados e só devem ser considerados implementados quando existirem no código.

## Estado atual

Já existem on-chain `MonetaryOracle`, `QuitusToken`, `DebitusToken` e `CompensationManager`.

`CompensationManager.compensate(referenceId, fiscalDebtIdHash, amount)` já consome `FiscalDebt.remainingAmount`. O solicitante não mantém DBT previamente: `DebitusToken` emite e queima o DBT correspondente dentro da própria compensação.

`QuitusMarketplace` já implementa ordens de compra e venda, execução parcial/total e cancelamento. Indexador, backend e aplicação web ainda não estão implementados.
