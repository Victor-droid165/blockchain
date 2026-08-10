// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MonetaryOracle
 * @notice Mock de oráculo institucional para a atualização monetária da PoC.
 * @dev O índice é cumulativo e usa escala de 1e6:
 *      1_000_000 = 1,000000 (índice base)
 *      1_010_000 = 1,010000 (+1%)
 *
 *      Este contrato publica e consulta o índice. QuitusToken consome
 *      currentIndex() para materializar a atualização monetária de forma lazy.
 */
contract MonetaryOracle {
    uint256 public constant INDEX_SCALE = 1_000_000;

    address public immutable operator;
    uint256 public currentIndex;
    uint256 public lastUpdatedAt;

    event MonetaryIndexUpdated(
        uint256 previousIndex,
        uint256 newIndex,
        uint256 updatedAt
    );

    error Unauthorized();
    error InvalidAddress();
    error InvalidIndex();
    error IndexCannotDecrease();

    modifier onlyOperator() {
        if (msg.sender != operator) revert Unauthorized();
        _;
    }

    constructor(address oracleOperator) {
        if (oracleOperator == address(0)) revert InvalidAddress();

        operator = oracleOperator;
        currentIndex = INDEX_SCALE;
        lastUpdatedAt = block.timestamp;
    }

    /**
     * @notice Publica um novo índice monetário cumulativo.
     * @dev A PoC considera o índice monotônico para simplificar o experimento.
     * @param newIndex Novo índice na escala de 1e6.
     */
    function updateIndex(uint256 newIndex) external onlyOperator {
        if (newIndex == 0) revert InvalidIndex();
        if (newIndex < currentIndex) revert IndexCannotDecrease();

        uint256 previousIndex = currentIndex;

        currentIndex = newIndex;
        lastUpdatedAt = block.timestamp;

        emit MonetaryIndexUpdated(
            previousIndex,
            newIndex,
            block.timestamp
        );
    }

    /**
     * @notice Calcula quanto um valor representaria no índice atual.
     * @dev Não altera saldos nem emite QTS; serve como cálculo de referência.
     *      A materialização do saldo é responsabilidade de QuitusToken.
     * @param amount Valor expresso nas unidades internas do token.
     * @param referenceIndex Índice associado ao valor de referência.
     */
    function applyIndex(
        uint256 amount,
        uint256 referenceIndex
    ) external view returns (uint256) {
        if (
            referenceIndex == 0 ||
            referenceIndex > currentIndex
        ) {
            revert InvalidIndex();
        }

        return (amount * currentIndex) / referenceIndex;
    }
}
