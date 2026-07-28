# Diagrama preliminar de arquitetura

## Visão geral

```mermaid
flowchart LR
    C[Credor / contribuinte]
    O[Órgão institucional<br/>TJPB / Fazenda Pública]
    A[Administrador institucional]

    subgraph OFF["Fora da blockchain — off-chain"]
        FE[Aplicação web]
        API[Backend / API]
        DB[(Banco de dados operacional)]
        DOC[(Documentos e dados sigilosos)]
        IDX[Indexador de eventos]
        ORA[Oráculo institucional<br/>índice de atualização]
        MKT[Livro de ofertas<br/>planejado]
    end

    subgraph ON["Blockchain — on-chain"]
        QTS[QuitusToken<br/>QTS]
        DBT[DebitusToken<br/>DBT]
        CMP[CompensationManager]
        FUT[Marketplace / Settlement<br/>planejado]
    end

    C --> FE
    A --> FE
    O --> API
    FE --> API
    API --> DB
    API --> DOC
    API -->|transações assinadas| QTS
    API -->|transações assinadas| DBT
    FE -->|carteira / provider| CMP
    ORA -. atualização monetária futura .-> QTS
    QTS --> CMP
    DBT --> CMP
    QTS --> IDX
    DBT --> IDX
    CMP --> IDX
    IDX --> API
    API --> FE
    FE --> MKT
    MKT -. liquidação futura .-> FUT
```

## O que fica on-chain

- Hash do identificador institucional do precatório e do crédito fiscal;
- Endereço do titular ou beneficiário;
- Valor tokenizado em unidades inteiras de centavo;
- Saldos e oferta total de QTS e DBT;
- Registro único das compensações;
- Eventos de emissão, transferência, queima e compensação;
- Futuramente, índice de atualização utilizado e liquidação das operações de mercado.

## O que fica off-chain

- PDFs e documentos judiciais completos;
- CPF, dados bancários e demais dados pessoais;
- Informações processuais sigilosas;
- Evidências e documentos usados pela instituição para autorizar a emissão;
- Banco operacional, autenticação, interface e indexação dos eventos;
- Livro de ofertas do mercado secundário, mantendo apenas a liquidação final na blockchain.

## Justificativas preliminares

1. **Privacidade:** a blockchain armazena hashes e valores mínimos, e não documentos nem dados pessoais completos.
2. **Auditabilidade:** emissões, transferências, queimas e compensações ficam registradas como transações e eventos.
3. **Atomicidade:** a compensação queima QTS e DBT na mesma transação. Se uma etapa falhar, nenhuma alteração permanece.
4. **Integração institucional:** o backend representa a camada de integração com sistemas do TJPB e da Fazenda Pública.
5. **Evolução:** oráculo de atualização monetária e mercado secundário aparecem como componentes planejados para as próximas entregas.

## Escopo desta entrega vs. diagrama completo

O diagrama mostra a solução **planejada**. Nesta entrega, o que já existe on-chain é só `QuitusToken`, `DebitusToken` e `CompensationManager` (emissão + compensação). Oráculo, marketplace, indexador e aplicação web aparecem como componentes futuros — e devem evoluir nas próximas entregas.
