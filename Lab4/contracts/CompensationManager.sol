// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ICompensableToken, IQuitusCompensableToken} from "./interfaces/ICompensableToken.sol";

/**
 * @title CompensationManager
 * @notice Queima QTS e DBT de forma atômica para registrar a compensação.
 * @dev Antes de validar o saldo QTS, sincroniza a conta com o índice monetário.
 *      Se qualquer etapa falhar, toda a transação é revertida pela EVM.
 */
contract CompensationManager {
    IQuitusCompensableToken public immutable quitusToken;
    ICompensableToken public immutable debitusToken;

    mapping(bytes32 => bool) public compensationReferencesUsed;
    mapping(address => uint256) public totalCompensatedByAccount;

    event CompensationExecuted(
        bytes32 indexed referenceId,
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
        debitusToken = ICompensableToken(debitusTokenAddress);
    }

    /**
     * @notice Compensa o mesmo valor de QTS e DBT em uma única transação indivisível.
     * @param referenceId Identificador único da compensação.
     * @param amount Valor em centavos a ser queimado de cada token.
     */
    function compensate(bytes32 referenceId, uint256 amount) external {
        if (referenceId == bytes32(0)) revert InvalidIdentifier();
        if (amount == 0) revert InvalidAmount();
        if (compensationReferencesUsed[referenceId]) revert ReferenceAlreadyUsed();

        quitusToken.syncBalance(msg.sender);

        if (
            quitusToken.balanceOf(msg.sender) < amount ||
            debitusToken.balanceOf(msg.sender) < amount
        ) {
            revert InsufficientTokenBalance();
        }

        compensationReferencesUsed[referenceId] = true;

        quitusToken.burnForCompensation(msg.sender, amount);
        debitusToken.burnForCompensation(msg.sender, amount);

        totalCompensatedByAccount[msg.sender] += amount;

        emit CompensationExecuted(referenceId, msg.sender, amount, block.timestamp);
    }
}
