// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ControlledToken} from "./ControlledToken.sol";

/**
 * @title DebitusToken
 * @notice Registra obrigações fiscais e materializa DBT durante a compensação.
 */
contract DebitusToken is ControlledToken {
    struct FiscalDebt {
        address debtor;
        uint256 originalAmount;
        uint256 remainingAmount;
        uint256 registeredAt;
        bool active;
    }

    mapping(bytes32 => FiscalDebt) public fiscalDebts;

    event FiscalDebtRegistered(
        bytes32 indexed fiscalDebtIdHash,
        address indexed debtor,
        uint256 amount,
        uint256 registeredAt
    );

    event FiscalDebtCompensated(
        bytes32 indexed fiscalDebtIdHash,
        address indexed debtor,
        uint256 amount,
        uint256 remainingAmount,
        uint256 compensatedAt
    );

    error FiscalDebtAlreadyRegistered();
    error FiscalDebtNotFound();
    error FiscalDebtInactive();
    error UnauthorizedDebtor();
    error InsufficientFiscalDebtBalance();
    error InvalidIdentifier();

    constructor(address tokenIssuer) ControlledToken("Debitus", "DBT", tokenIssuer) {}

    /**
     * @notice Registra uma obrigação fiscal elegível para compensação.
     * @dev O registro não emite DBT. O DBT é materializado somente quando
     *      uma parcela desta obrigação é compensada.
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
     * @notice Liquida uma parcela da obrigação fiscal durante a compensação.
     * @dev Somente o CompensationManager autorizado pode chamar esta função.
     *      O DBT é emitido e queimado na mesma transação, enquanto o saldo
     *      remanescente da obrigação é reduzido.
     * @param fiscalDebtIdHash Hash da obrigação fiscal registrada.
     * @param debtor Endereço do devedor que está solicitando a compensação.
     * @param amount Valor em centavos a ser compensado.
     */
    function settleFiscalDebtForCompensation(
        bytes32 fiscalDebtIdHash,
        address debtor,
        uint256 amount
    ) external onlyCompensationManager {
        if (fiscalDebtIdHash == bytes32(0)) revert InvalidIdentifier();
        if (debtor == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        FiscalDebt storage fiscalDebt = fiscalDebts[fiscalDebtIdHash];

        if (fiscalDebt.originalAmount == 0) revert FiscalDebtNotFound();
        if (!fiscalDebt.active) revert FiscalDebtInactive();
        if (fiscalDebt.debtor != debtor) revert UnauthorizedDebtor();
        if (fiscalDebt.remainingAmount < amount) {
            revert InsufficientFiscalDebtBalance();
        }

        _mint(debtor, amount);
        _burn(debtor, amount);

        fiscalDebt.remainingAmount -= amount;
        if (fiscalDebt.remainingAmount == 0) {
            fiscalDebt.active = false;
        }

        emit FiscalDebtCompensated(
            fiscalDebtIdHash,
            debtor,
            amount,
            fiscalDebt.remainingAmount,
            block.timestamp
        );
    }

}
