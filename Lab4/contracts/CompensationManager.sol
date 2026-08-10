// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {
    IQuitusCompensableToken,
    IDebitusCompensableToken
} from "./interfaces/ICompensableToken.sol";

/**
 * @title CompensationManager
 * @notice Compensa QTS contra uma obrigação fiscal registrada.
 * @dev Antes de validar o saldo QTS, sincroniza a conta com o índice monetário.
 *      O DBT é emitido e queimado durante a operação fiscal. Se qualquer etapa
 *      falhar, toda a transação é revertida pela EVM.
 */
contract CompensationManager {
    IQuitusCompensableToken public immutable quitusToken;
    IDebitusCompensableToken public immutable debitusToken;

    mapping(bytes32 => bool) public compensationReferencesUsed;
    mapping(address => uint256) public totalCompensatedByAccount;

    event CompensationExecuted(
        bytes32 indexed referenceId,
        bytes32 indexed fiscalDebtIdHash,
        address indexed account,
        uint256 amount,
        uint256 executedAt
    );

    error InvalidAddress();
    error InvalidIdentifier();
    error InvalidAmount();
    error ReferenceAlreadyUsed();
    error InsufficientTokenBalance();

    constructor(address quitusTokenAddress, address debitusTokenAddress) {
        if (quitusTokenAddress == address(0) || debitusTokenAddress == address(0)) {
            revert InvalidAddress();
        }

        quitusToken = IQuitusCompensableToken(quitusTokenAddress);
        debitusToken = IDebitusCompensableToken(debitusTokenAddress);
    }

    /**
     * @notice Compensa QTS contra uma obrigação fiscal em uma transação indivisível.
     * @param referenceId Identificador único da compensação.
     * @param fiscalDebtIdHash Hash da obrigação fiscal registrada.
     * @param amount Valor em centavos a ser compensado.
     */
    function compensate(
        bytes32 referenceId,
        bytes32 fiscalDebtIdHash,
        uint256 amount
    ) external {
        if (referenceId == bytes32(0) || fiscalDebtIdHash == bytes32(0)) {
            revert InvalidIdentifier();
        }
        if (amount == 0) revert InvalidAmount();
        if (compensationReferencesUsed[referenceId]) revert ReferenceAlreadyUsed();

        quitusToken.syncBalance(msg.sender);

        if (quitusToken.balanceOf(msg.sender) < amount) {
            revert InsufficientTokenBalance();
        }

        compensationReferencesUsed[referenceId] = true;

        quitusToken.burnForCompensation(msg.sender, amount);
        debitusToken.settleFiscalDebtForCompensation(
            fiscalDebtIdHash,
            msg.sender,
            amount
        );

        totalCompensatedByAccount[msg.sender] += amount;

        emit CompensationExecuted(
            referenceId,
            fiscalDebtIdHash,
            msg.sender,
            amount,
            block.timestamp
        );
    }
}
