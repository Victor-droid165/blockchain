// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ControlledToken} from "./ControlledToken.sol";

/**
 * @title DebitusToken
 * @notice Token DBT emitido a partir de um crédito fiscal validado pela instituição emissora.
 */
contract DebitusToken is ControlledToken {
    struct FiscalDebt {
        address debtor;
        uint256 originalAmount;
        uint256 remainingAmount;
        uint256 registeredAt;
        bool active;
    }

    struct FiscalCredit {
        address holder;
        uint256 faceValue;
        uint256 issuedAt;
        bool issued;
    }

    mapping(bytes32 => FiscalDebt) public fiscalDebts;
    mapping(bytes32 => FiscalCredit) public fiscalCredits;

    event FiscalDebtRegistered(
        bytes32 indexed fiscalDebtIdHash,
        address indexed debtor,
        uint256 amount,
        uint256 registeredAt
    );

    event FiscalCreditIssued(
        bytes32 indexed fiscalCreditIdHash,
        address indexed holder,
        uint256 amount,
        uint256 issuedAt
    );

    error FiscalDebtAlreadyRegistered();
    error FiscalCreditAlreadyIssued();
    error InvalidIdentifier();

    constructor(address tokenIssuer) ControlledToken("Debitus", "DBT", tokenIssuer) {}

    /**
     * @notice Registra uma obrigação fiscal elegível para compensação.
     * @dev Nesta etapa, o registro não emite DBT. A emissão transitória de DBT
     *      será integrada ao fluxo de compensação em alteração posterior.
     * @param fiscalDebtIdHash Hash do identificador institucional da obrigação fiscal.
     * @param debtor Endereço do devedor associado à obrigação.
     * @param amount Valor em centavos. Ex.: 40000 = R$ 400,00.
     */
    function registerFiscalDebt(
        bytes32 fiscalDebtIdHash,
        address debtor,
        uint256 amount
    ) external onlyIssuer {
        if (fiscalDebtIdHash == bytes32(0)) revert InvalidIdentifier();
        if (debtor == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (fiscalDebts[fiscalDebtIdHash].originalAmount != 0) {
            revert FiscalDebtAlreadyRegistered();
        }

        fiscalDebts[fiscalDebtIdHash] = FiscalDebt({
            debtor: debtor,
            originalAmount: amount,
            remainingAmount: amount,
            registeredAt: block.timestamp,
            active: true
        });

        emit FiscalDebtRegistered(
            fiscalDebtIdHash,
            debtor,
            amount,
            block.timestamp
        );
    }

    /**
     * @notice Registra o hash de um crédito fiscal e emite DBT ao titular.
     * @param fiscalCreditIdHash Hash do identificador institucional do crédito fiscal.
     * @param holder Endereço que receberá os DBT.
     * @param amount Valor em centavos. Ex.: 40000 = R$ 400,00.
     */
    function issueFiscalCredit(
        bytes32 fiscalCreditIdHash,
        address holder,
        uint256 amount
    ) external onlyIssuer {
        if (fiscalCreditIdHash == bytes32(0)) revert InvalidIdentifier();
        if (fiscalCredits[fiscalCreditIdHash].issued) revert FiscalCreditAlreadyIssued();

        fiscalCredits[fiscalCreditIdHash] = FiscalCredit({
            holder: holder,
            faceValue: amount,
            issuedAt: block.timestamp,
            issued: true
        });

        _mint(holder, amount);

        emit FiscalCreditIssued(
            fiscalCreditIdHash,
            holder,
            amount,
            block.timestamp
        );
    }
}
