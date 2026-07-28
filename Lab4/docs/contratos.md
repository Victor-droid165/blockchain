# Diagrama preliminar de classes dos contratos

```mermaid
classDiagram
    class ControlledToken {
        <<abstract>>
        +string name
        +string symbol
        +uint8 decimals
        +uint256 totalSupply
        +address issuer
        +address compensationManager
        -mapping balances
        -mapping allowances
        +balanceOf(account) uint256
        +allowance(owner, spender) uint256
        +setCompensationManager(manager)
        +transfer(to, amount) bool
        +approve(spender, amount) bool
        +transferFrom(from, to, amount) bool
        +burnForCompensation(account, amount)
        #_mint(account, amount)
        #_burn(account, amount)
    }

    class QuitusToken {
        +mapping precatorios
        +tokenizePrecatorio(idHash, beneficiary, amount)
        +PrecatorioTokenized(idHash, beneficiary, amount, timestamp)
    }

    class Precatorio {
        +address beneficiary
        +uint256 faceValue
        +uint256 tokenizedAt
        +bool tokenized
    }

    class DebitusToken {
        +mapping fiscalCredits
        +issueFiscalCredit(idHash, holder, amount)
        +FiscalCreditIssued(idHash, holder, amount, timestamp)
    }

    class FiscalCredit {
        +address holder
        +uint256 faceValue
        +uint256 issuedAt
        +bool issued
    }

    class CompensationManager {
        +ICompensableToken quitusToken
        +ICompensableToken debitusToken
        +mapping compensationReferencesUsed
        +mapping totalCompensatedByAccount
        +compensate(referenceId, amount)
        +CompensationExecuted(referenceId, account, amount, timestamp)
    }

    class ICompensableToken {
        <<interface>>
        +balanceOf(account) uint256
        +burnForCompensation(account, amount)
    }

    ControlledToken <|-- QuitusToken
    ControlledToken <|-- DebitusToken
    QuitusToken "1" --> "*" Precatorio
    DebitusToken "1" --> "*" FiscalCredit
    CompensationManager --> ICompensableToken
    ICompensableToken <|.. QuitusToken
    ICompensableToken <|.. DebitusToken
```

## Responsabilidades

### `QuitusToken`

Registra um precatório pelo hash de seu identificador institucional e emite QTS para o beneficiário. O mesmo identificador não pode ser tokenizado duas vezes.

### `DebitusToken`

Registra um crédito fiscal pelo hash de seu identificador institucional e emite DBT para o titular. O mesmo identificador não pode gerar duas emissões.

### `CompensationManager`

Coordena a compensação. O titular precisa possuir o mesmo valor em QTS e DBT. As duas queimas acontecem na mesma transação, produzindo um registro único de compensação.

### `ControlledToken`

Fornece as operações fungíveis mínimas compartilhadas pelos tokens. Nesta versão preliminar, somente o emissor configurado no deploy pode criar QTS ou DBT, e somente o `CompensationManager` autorizado pode queimá-los para compensação.

## Evoluções esperadas

- Substituição da implementação fungível mínima por contratos OpenZeppelin;
- Controle de acesso por papéis institucionais;
- Pausa emergencial e governança;
- Oráculo institucional para atualização monetária;
- Estados adicionais do precatório e do crédito fiscal;
- Contrato ou módulo de liquidação do mercado secundário;
- Testes de segurança, invariantes e casos de borda.
