// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ControlledToken} from "./ControlledToken.sol";
import {IMonetaryOracle} from "./interfaces/IMonetaryOracle.sol";

/**
 * @title QuitusToken
 * @notice Token QTS emitido a partir de um precatório validado pela instituição emissora.
 * @dev Integra um oráculo monetário e materializa a atualização de forma lazy:
 *      cada conta é sincronizada antes de operações que alteram seu saldo.
 */
contract QuitusToken is ControlledToken {
    struct Precatorio {
        address beneficiary;
        uint256 faceValue;
        uint256 tokenizedAt;
        bool tokenized;
    }

    IMonetaryOracle public immutable monetaryOracle;

    mapping(bytes32 => Precatorio) public precatorios;
    mapping(address => uint256) public lastAppliedIndex;

    event PrecatorioTokenized(
        bytes32 indexed precatorioIdHash,
        address indexed beneficiary,
        uint256 amount,
        uint256 tokenizedAt
    );

    event MonetaryAdjustmentApplied(
        address indexed account,
        uint256 previousIndex,
        uint256 currentIndex,
        uint256 previousBalance,
        uint256 adjustedBalance,
        uint256 mintedAdjustment
    );

    error PrecatorioAlreadyTokenized();
    error InvalidIdentifier();
    error InvalidOracleIndex();

    constructor(
        address tokenIssuer,
        address monetaryOracleAddress
    ) ControlledToken("Quitus", "QTS", tokenIssuer) {
        if (monetaryOracleAddress == address(0)) revert InvalidAddress();
        monetaryOracle = IMonetaryOracle(monetaryOracleAddress);

        if (monetaryOracle.currentIndex() == 0) revert InvalidOracleIndex();
    }

    /**
     * @notice Registra o identificador hash do precatório e emite QTS ao beneficiário.
     * @param precatorioIdHash Hash do identificador institucional do precatório.
     * @param beneficiary Endereço que receberá os QTS.
     * @param amount Valor em centavos. Ex.: 100000 = R$ 1.000,00.
     */
    function tokenizePrecatorio(
        bytes32 precatorioIdHash,
        address beneficiary,
        uint256 amount
    ) external onlyIssuer {
        if (precatorioIdHash == bytes32(0)) revert InvalidIdentifier();
        if (precatorios[precatorioIdHash].tokenized) revert PrecatorioAlreadyTokenized();

        precatorios[precatorioIdHash] = Precatorio({
            beneficiary: beneficiary,
            faceValue: amount,
            tokenizedAt: block.timestamp,
            tokenized: true
        });

        _mint(beneficiary, amount);

        emit PrecatorioTokenized(
            precatorioIdHash,
            beneficiary,
            amount,
            block.timestamp
        );
    }

    /**
     * @notice Materializa no saldo de uma conta a atualização monetária acumulada.
     * @dev Pode ser chamada por qualquer pessoa; o efeito sempre beneficia somente
     *      a própria conta informada conforme o índice do oráculo.
     */
    function syncBalance(address account) external returns (uint256) {
        if (account == address(0)) revert InvalidAddress();
        _syncAccount(account);
        return balances[account];
    }

    /**
     * @notice Mostra quanto o saldo teria após sincronização com o índice atual.
     * @dev Função somente de leitura; não altera totalSupply nem o saldo armazenado.
     */
    function previewBalance(address account) external view returns (uint256) {
        uint256 storedBalance = balances[account];
        if (storedBalance == 0) return 0;

        uint256 current = monetaryOracle.currentIndex();
        uint256 previous = lastAppliedIndex[account];

        if (previous == 0 || current <= previous) {
            return storedBalance;
        }

        return (storedBalance * current) / previous;
    }

    function _syncAccount(address account) internal override {
        uint256 current = monetaryOracle.currentIndex();
        if (current == 0) revert InvalidOracleIndex();

        uint256 previous = lastAppliedIndex[account];

        // Primeira interação da conta com QTS: começa a contar do índice atual.
        if (previous == 0) {
            lastAppliedIndex[account] = current;
            return;
        }

        if (current < previous) revert InvalidOracleIndex();

        if (current == previous) {
            return;
        }

        uint256 previousBalance = balances[account];

        if (previousBalance == 0) {
            lastAppliedIndex[account] = current;
            return;
        }

        uint256 adjustedBalance = (previousBalance * current) / previous;
        uint256 mintedAdjustment = adjustedBalance - previousBalance;

        lastAppliedIndex[account] = current;

        if (mintedAdjustment == 0) {
            return;
        }

        balances[account] = adjustedBalance;
        totalSupply += mintedAdjustment;

        emit Transfer(address(0), account, mintedAdjustment);
        emit MonetaryAdjustmentApplied(
            account,
            previous,
            current,
            previousBalance,
            adjustedBalance,
            mintedAdjustment
        );
    }
}
