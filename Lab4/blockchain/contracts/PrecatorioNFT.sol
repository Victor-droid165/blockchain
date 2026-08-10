// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC721PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";

/**
 * @title PrecatorioNFT
 * @notice Representa cada precatório da PoC como um NFT ERC-721 individual.
 * @dev Implantado atrás de um proxy UUPS. Enquanto válido, pode ser pausado,
 *      retomado e atualizado. `invalidate()` encerra permanentemente o proxy:
 *      mint, aprovações, transferências, unpause e upgrades ficam bloqueados.
 */
contract PrecatorioNFT is
    Initializable,
    ERC721PausableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    struct Precatorio {
        bytes32 identifier;
        uint256 faceValue;
        uint256 registeredAt;
    }

    uint256 public nextTokenId;
    bool public invalidated;

    mapping(uint256 => Precatorio) public precatorios;
    mapping(bytes32 => bool) public identifiersUsed;

    event PrecatorioMinted(
        uint256 indexed tokenId,
        bytes32 indexed identifier,
        address indexed owner,
        uint256 faceValue,
        uint256 registeredAt
    );

    event ContractInvalidated(
        address indexed account,
        uint256 invalidatedAt
    );

    error InvalidAddress();
    error InvalidIdentifier();
    error InvalidFaceValue();
    error IdentifierAlreadyUsed();
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

        __ERC721_init("Precatorio", "PREC");
        __ERC721Pausable_init();
        __Pausable_init();
        __Ownable_init(initialOwner);

        nextTokenId = 1;
    }

    /**
     * @notice Cria um NFT a partir da entrada mínima usada pela PoC.
     * @param to Proprietário inicial do precatório.
     * @param identifier Identificador abstrato e único do ativo.
     * @param faceValue Valor de face em centavos.
     */
    function mintPrecatorio(
        address to,
        bytes32 identifier,
        uint256 faceValue
    ) external onlyOwner whenValid whenNotPaused returns (uint256 tokenId) {
        if (to == address(0)) revert InvalidAddress();
        if (identifier == bytes32(0)) revert InvalidIdentifier();
        if (faceValue == 0) revert InvalidFaceValue();
        if (identifiersUsed[identifier]) revert IdentifierAlreadyUsed();

        tokenId = nextTokenId++;
        identifiersUsed[identifier] = true;

        precatorios[tokenId] = Precatorio({
            identifier: identifier,
            faceValue: faceValue,
            registeredAt: block.timestamp
        });

        _safeMint(to, tokenId);

        emit PrecatorioMinted(
            tokenId,
            identifier,
            to,
            faceValue,
            block.timestamp
        );
    }

    /**
     * @notice Interrompe temporariamente mint e transferências.
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
     * @notice Invalida permanentemente este proxy e seu estado operacional.
     * @dev A blockchain continua preservando código, estado e histórico para
     *      consulta, mas operações mutáveis e upgrades deixam de ser permitidos.
     */
    function invalidate() external onlyOwner whenValid {
        invalidated = true;

        if (!paused()) {
            _pause();
        }

        emit ContractInvalidated(msg.sender, block.timestamp);
    }

    function approve(
        address to,
        uint256 tokenId
    ) public override whenValid whenNotPaused {
        super.approve(to, tokenId);
    }

    function setApprovalForAll(
        address operator,
        bool approved
    ) public override whenValid whenNotPaused {
        super.setApprovalForAll(operator, approved);
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

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override whenValid returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _authorizeUpgrade(
        address
    ) internal override onlyOwner whenValid {}
}
