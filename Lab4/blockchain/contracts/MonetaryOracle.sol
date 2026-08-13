// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/**
 * @title MonetaryOracle
 * @notice Oráculo institucional (mock) de atualização monetária da PoC.
 * @dev Publica um índice acumulado de correção com precisão de 1e18.
 *      O valor atualizado de um precatório é `faceValue * currentIndex / 1e18`.
 *      Na solução real, o índice seria alimentado por fonte institucional
 *      (SELIC/IPCA-E); aqui o owner faz o papel dessa fonte.
 *
 *      Implantado atrás de proxy UUPS. Enquanto válido, pode ser pausado,
 *      retomado e atualizado. `invalidate()` encerra permanentemente o proxy:
 *      novas publicações de índice, retomada e upgrades ficam bloqueados.
 */
contract MonetaryOracle is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    /// @notice Precisão fixa do índice: 1e18 representa o fator neutro 1,0.
    uint256 public constant INDEX_PRECISION = 1e18;

    uint256 public currentIndex;
    uint256 public lastUpdateAt;
    uint256 public totalUpdates;
    bool public invalidated;

    event IndexUpdated(
        uint256 previousIndex,
        uint256 newIndex,
        address indexed operator,
        uint256 updatedAt
    );

    event ContractInvalidated(
        address indexed account,
        uint256 invalidatedAt
    );

    error InvalidAddress();
    error IndexBelowCurrent();
    error ContractInvalidatedPermanently();
    error OwnershipRenouncementDisabled();

    modifier whenValid() {
        if (invalidated) revert ContractInvalidatedPermanently();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        if (initialOwner == address(0)) revert InvalidAddress();

        __Ownable_init(initialOwner);
        __Pausable_init();

        currentIndex = INDEX_PRECISION;
        lastUpdateAt = block.timestamp;
    }

    /**
     * @notice Publica um novo índice acumulado de correção monetária.
     * @dev O índice é monotônico: correção monetária acumulada não regride.
     *      Republicar o mesmo valor é permitido (atualiza `lastUpdateAt`).
     */
    function updateIndex(
        uint256 newIndex
    ) external onlyOwner whenValid whenNotPaused {
        if (newIndex < currentIndex) revert IndexBelowCurrent();

        uint256 previousIndex = currentIndex;

        currentIndex = newIndex;
        lastUpdateAt = block.timestamp;
        totalUpdates += 1;

        emit IndexUpdated(
            previousIndex,
            newIndex,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Valor de face corrigido pelo índice vigente.
     * @param faceValue Valor de face em centavos.
     */
    function adjustedValue(
        uint256 faceValue
    ) external view returns (uint256) {
        return (faceValue * currentIndex) / INDEX_PRECISION;
    }

    /**
     * @notice Interrompe temporariamente a publicação de índices.
     */
    function pause() external onlyOwner whenValid {
        _pause();
    }

    /**
     * @notice Retoma um contrato apenas pausado.
     * @dev Um contrato invalidado nunca pode ser retomado.
     */
    function unpause() external onlyOwner whenValid {
        _unpause();
    }

    /**
     * @notice Invalida permanentemente este proxy.
     * @dev O último índice publicado permanece legível na blockchain, mas
     *      novas publicações, retomada e upgrades deixam de ser permitidos.
     */
    function invalidate() external onlyOwner whenValid {
        invalidated = true;

        if (!paused()) {
            _pause();
        }

        emit ContractInvalidated(msg.sender, block.timestamp);
    }

    function transferOwnership(
        address newOwner
    ) public override whenValid {
        super.transferOwnership(newOwner);
    }

    /**
     * @dev Desabilitado para evitar que a PoC perca definitivamente a conta
     *      capaz de pausar, atualizar ou invalidar o contrato.
     */
    function renounceOwnership() public pure override {
        revert OwnershipRenouncementDisabled();
    }

    function _authorizeUpgrade(
        address
    ) internal override onlyOwner whenValid {}
}
