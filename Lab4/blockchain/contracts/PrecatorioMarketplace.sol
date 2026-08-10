// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/**
 * @title PrecatorioMarketplace
 * @notice Marketplace simplificado para compra e venda de PrecatorioNFT.
 * @dev Implantado atrás de proxy UUPS. Enquanto válido, pode ser pausado,
 *      retomado e atualizado. `invalidate()` encerra permanentemente o proxy:
 *      novas listagens, compras, cancelamentos, retomada e upgrades ficam
 *      bloqueados.
 *
 *      O pagamento em ETH é apenas um mecanismo técnico da PoC.
 */
contract PrecatorioMarketplace is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardTransient
{
    struct Listing {
        address seller;
        uint256 tokenId;
        uint256 price;
        uint256 createdAt;
        bool active;
    }

    IERC721 public precatorioNFT;

    uint256 public nextListingId;
    uint256 public totalSales;
    uint256 public lastSalePrice;
    bool public invalidated;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => uint256) public activeListingByTokenId;


    event PrecatorioListed(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price,
        uint256 createdAt
    );

    event PrecatorioSold(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed seller,
        address buyer,
        uint256 price,
        uint256 soldAt
    );

    event ListingCancelled(
        uint256 indexed listingId,
        uint256 indexed tokenId,
        address indexed seller,
        uint256 cancelledAt
    );

    event ContractInvalidated(
        address indexed account,
        uint256 invalidatedAt
    );

    error InvalidAddress();
    error InvalidPrice();
    error InvalidPayment();
    error ListingNotFound();
    error ListingInactive();
    error TokenAlreadyListed();
    error NotTokenOwner();
    error MarketplaceNotApproved();
    error UnauthorizedSeller();
    error CannotBuyOwnListing();
    error TransferFailed();
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

    function initialize(
        address initialOwner,
        address precatorioNFTAddress
    ) public initializer {
        if (
            initialOwner == address(0) ||
            precatorioNFTAddress == address(0)
        ) {
            revert InvalidAddress();
        }

        __Ownable_init(initialOwner);
        __Pausable_init();

        precatorioNFT = IERC721(precatorioNFTAddress);
        nextListingId = 1;
    }

    /**
     * @notice Lista um precatório específico para venda.
     * @dev O NFT permanece na carteira do vendedor até a compra.
     */
    function list(
        uint256 tokenId,
        uint256 price
    ) external whenValid whenNotPaused returns (uint256 listingId) {
        if (price == 0) revert InvalidPrice();
        if (activeListingByTokenId[tokenId] != 0) {
            revert TokenAlreadyListed();
        }
        if (precatorioNFT.ownerOf(tokenId) != msg.sender) {
            revert NotTokenOwner();
        }

        bool approved = (
            precatorioNFT.getApproved(tokenId) == address(this) ||
            precatorioNFT.isApprovedForAll(msg.sender, address(this))
        );

        if (!approved) revert MarketplaceNotApproved();

        listingId = nextListingId++;

        listings[listingId] = Listing({
            seller: msg.sender,
            tokenId: tokenId,
            price: price,
            createdAt: block.timestamp,
            active: true
        });

        activeListingByTokenId[tokenId] = listingId;

        emit PrecatorioListed(
            listingId,
            tokenId,
            msg.sender,
            price,
            block.timestamp
        );
    }

    /**
     * @notice Compra o NFT de uma listagem ativa.
     * @dev Estado da listagem é atualizado antes das chamadas externas.
     *      Se a transferência do NFT ou o pagamento falhar, toda a transação
     *      é revertida pela EVM.
     */
    function buy(
        uint256 listingId
    ) external payable whenValid whenNotPaused nonReentrant {
        Listing storage listing = _activeListing(listingId);

        if (listing.seller == msg.sender) revert CannotBuyOwnListing();
        if (msg.value != listing.price) revert InvalidPayment();

        if (precatorioNFT.ownerOf(listing.tokenId) != listing.seller) {
            revert NotTokenOwner();
        }

        bool approved = (
            precatorioNFT.getApproved(listing.tokenId) == address(this) ||
            precatorioNFT.isApprovedForAll(
                listing.seller,
                address(this)
            )
        );

        if (!approved) revert MarketplaceNotApproved();

        listing.active = false;
        activeListingByTokenId[listing.tokenId] = 0;

        totalSales += 1;
        lastSalePrice = listing.price;

        precatorioNFT.safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );

        (bool sent, ) = payable(listing.seller).call{
            value: listing.price
        }("");

        if (!sent) revert TransferFailed();

        emit PrecatorioSold(
            listingId,
            listing.tokenId,
            listing.seller,
            msg.sender,
            listing.price,
            block.timestamp
        );
    }

    /**
     * @notice Cancela uma listagem ainda ativa.
     */
    function cancel(
        uint256 listingId
    ) external whenValid whenNotPaused {
        Listing storage listing = _activeListing(listingId);

        if (listing.seller != msg.sender) revert UnauthorizedSeller();

        listing.active = false;
        activeListingByTokenId[listing.tokenId] = 0;

        emit ListingCancelled(
            listingId,
            listing.tokenId,
            msg.sender,
            block.timestamp
        );
    }

    function pause() external onlyOwner whenValid {
        _pause();
    }

    function unpause() external onlyOwner whenValid {
        _unpause();
    }

    /**
     * @notice Invalida permanentemente este marketplace.
     * @dev Listagens históricas continuam consultáveis, mas nenhuma operação
     *      mutável nem novo upgrade pode ser executado.
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

    function _activeListing(
        uint256 listingId
    ) private view returns (Listing storage listing) {
        listing = listings[listingId];

        if (listing.seller == address(0)) revert ListingNotFound();
        if (!listing.active) revert ListingInactive();
    }

    function _authorizeUpgrade(
        address
    ) internal override onlyOwner whenValid {}
}
