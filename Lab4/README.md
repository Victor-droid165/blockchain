# Lab 4 — Projeto 4: Tokenização de Precatórios e Créditos Fiscais

## Equipe

- Douglas Alves de Sousa
- Maria Luiza Galdino Medeiros
- Nívea Calébia Felix dos Santos
- Victor Emanuel Barbosa Rodrigues

## Problema

O projeto propõe representar precatórios por meio do token **Quitus (QTS)** e créditos fiscais por meio do token **Debitus (DBT)**, permitindo uma compensação indivisível entre as duas obrigações.

## Entrega 1

O que o enunciado pede nesta macroentrega:

| Item | Arquivo |
|---|---|
| Diagrama de arquitetura (on-chain / off-chain) | [`docs/arquitetura.md`](./docs/arquitetura.md) |
| Diagrama de classes dos contratos | [`docs/contratos.md`](./docs/contratos.md) |
| Contratos com funções centrais funcionando | [`contracts/Projeto4Entrega1.sol`](./contracts/Projeto4Entrega1.sol) |
| Roteiro de demonstração no Remix | [`docs/roteiro-demo.md`](./docs/roteiro-demo.md) |

Ainda não fazem parte desta entrega: frontend, mercado secundário, oráculo de atualização monetária e segurança completa.

## Contratos

Três contratos no mesmo arquivo (conveniente para Remix):

1. **`QuitusToken.tokenizePrecatorio`** — registra o hash do precatório e emite QTS
2. **`DebitusToken.issueFiscalCredit`** — registra o hash do crédito fiscal e emite DBT
3. **`CompensationManager.compensate`** — queima o mesmo valor de QTS e DBT na mesma transação

Valores em centavos (`100000` = R$ 1.000,00).

## Como demonstrar no Remix

1. Criar `Projeto4Entrega1.sol` no Remix e colar o conteúdo de `contracts/Projeto4Entrega1.sol`
2. Compilar com Solidity `0.8.24` (ou `0.8.x` compatível)
3. Deploy de `QuitusToken` e `DebitusToken` com o endereço da conta emissora
4. Deploy de `CompensationManager` com os endereços dos dois tokens
5. Chamar `setCompensationManager` nos dois tokens
6. Seguir o cenário em [`docs/roteiro-demo.md`](./docs/roteiro-demo.md)

## Decisões de arquitetura

- **Na blockchain:** hashes dos identificadores, valores, saldos, eventos de emissão e compensação
- **Fora da blockchain:** PDFs, CPF, dados processuais e demais informações sensíveis
- Emissão restrita ao endereço institucional definido no deploy
- Compensação em contrato separado para que as duas queimas ocorram de forma atômica
- Token fungível implementado de forma mínima nesta entrega; a versão final deve migrar para OpenZeppelin (papéis, pausa, testes)

## Próximas entregas

- Oráculo de atualização monetária
- Interface e dashboard do credor
- Mercado secundário (livro de ofertas)
- Integração com sistemas institucionais (mock ou real)
- Testes e endurecimento de segurança
