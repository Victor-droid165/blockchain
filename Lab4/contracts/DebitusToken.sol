// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ControlledToken} from "./ControlledToken.sol";

/**
 * @title DebitusToken
 * @notice Token DBT emitido a partir de um crédito fiscal validado pela instituição emissora.
 */
contract DebitusToken is ControlledToken {
    struct FiscalCredit {
        address holder;
        uint256 faceValue;
        uint256 issuedAt;
        bool issued;
    }

    mapping(bytes32 => FiscalCredit) public fiscalCredits;

    event FiscalCreditIssued(
        bytes32 indexed fiscalCreditIdHash,
        address indexed holder,
        uint256 amount,
        uint256 issuedAt
    );

    error FiscalCreditAlreadyIssued();
    error InvalidIdentifier();

    constructor(address tokenIssuer) ControlledToken("Debitus", "DBT", tokenIssuer) {}

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
