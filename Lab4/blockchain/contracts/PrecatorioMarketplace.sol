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

    /// @dev Lado de demanda do livro de ofertas: um lance em ETH de teste
    ///      escrowado pelo próprio contrato até aceitação ou cancelamento.
    struct Offer {
        address buyer;
        uint256 tokenId;
        uint256 amount;
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

    uint256 public nextOfferId;
    mapping(uint256 => Offer) public offers;
    mapping(address => mapping(uint256 => uint256)) public activeOfferByBuyerAndToken;

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

    /// @dev Lado de demanda: um comprador propôs um lance por um `tokenId`,
    ///      sem depender de o proprietário ter criado uma listagem antes.
    event OfferMade(
        uint256 indexed offerId,
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 amount,
        uint256 createdAt
    );

    event OfferCancelled(
        uint256 indexed offerId,
        uint256 indexed tokenId,
        address indexed buyer,
        uint256 cancelledAt
    );

    /// @dev Preenche o histórico de preços do mercado secundário junto com
    ///      `PrecatorioSold`: a venda pode se originar de uma listagem a
    ///      preço fixo (`buy`) ou da aceitação de um lance (`acceptOffer`).
    event OfferAccepted(
        uint256 indexed offerId,
        uint256 indexed tokenId,
        address indexed seller,
        address buyer,
        uint256 amount,
        uint256 acceptedAt
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
    error InvalidOfferAmount();
    error OfferNotFound();
    error OfferInactive();
    error UnauthorizedBuyer();
    error CannotOfferOwnToken();
    error OfferAlreadyActiveForToken();
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
        nextOfferId = 1;
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

    /**
     * @notice Lado de demanda do livro de ofertas: propõe um lance em ETH de
     *         teste por um precatório específico, sem exigir listagem prévia.
     * @dev O valor do lance fica escrowado no contrato até aceitação ou
     *      cancelamento. Cada comprador mantém no máximo uma oferta ativa
     *      por `tokenId`.
     */
    function makeOffer(
        uint256 tokenId
    ) external payable whenValid whenNotPaused returns (uint256 offerId) {
        if (msg.value == 0) revert InvalidOfferAmount();
        if (precatorioNFT.ownerOf(tokenId) == msg.sender) {
            revert CannotOfferOwnToken();
        }
        if (activeOfferByBuyerAndToken[msg.sender][tokenId] != 0) {
            revert OfferAlreadyActiveForToken();
        }

        offerId = nextOfferId++;

        offers[offerId] = Offer({
            buyer: msg.sender,
            tokenId: tokenId,
            amount: msg.value,
            createdAt: block.timestamp,
            active: true
        });

        activeOfferByBuyerAndToken[msg.sender][tokenId] = offerId;

        emit OfferMade(
            offerId,
            tokenId,
            msg.sender,
            msg.value,
            block.timestamp
        );
    }

    /**
     * @notice Retira um lance ainda ativo e devolve o ETH escrowado.
     * @dev Deliberadamente sem `whenValid`/`whenNotPaused`: como o lance
     *      mantém ETH escrowado neste contrato, o comprador precisa sempre
     *      conseguir recuperar o próprio valor, mesmo com o marketplace
     *      pausado ou permanentemente invalidado. Não há operação de domínio
     *      aqui, só a devolução de um saldo que já pertence ao chamador.
     */
    function cancelOffer(
        uint256 offerId
    ) external nonReentrant {
        Offer storage offer = _activeOffer(offerId);

        if (offer.buyer != msg.sender) revert UnauthorizedBuyer();

        offer.active = false;
        activeOfferByBuyerAndToken[msg.sender][offer.tokenId] = 0;

        emit OfferCancelled(
            offerId,
            offer.tokenId,
            msg.sender,
            block.timestamp
        );

        (bool sent, ) = payable(msg.sender).call{value: offer.amount}("");
        if (!sent) revert TransferFailed();
    }

    /**
     * @notice Lado da oferta aceita o lance de um comprador pelo precatório.
     * @dev Só o proprietário atual do `tokenId` pode aceitar, e o marketplace
     *      precisa estar aprovado, igual ao fluxo de `buy`. Uma listagem a
     *      preço fixo eventualmente ativa para o mesmo `tokenId` é encerrada
     *      na mesma transação para não sobreviver à troca de proprietário.
     */
    function acceptOffer(
        uint256 offerId
    ) external whenValid whenNotPaused nonReentrant {
        Offer storage offer = _activeOffer(offerId);

        if (precatorioNFT.ownerOf(offer.tokenId) != msg.sender) {
            revert NotTokenOwner();
        }

        bool approved = (
            precatorioNFT.getApproved(offer.tokenId) == address(this) ||
            precatorioNFT.isApprovedForAll(msg.sender, address(this))
        );

        if (!approved) revert MarketplaceNotApproved();

        address buyer = offer.buyer;
        uint256 tokenId = offer.tokenId;
        uint256 amount = offer.amount;

        offer.active = false;
        activeOfferByBuyerAndToken[buyer][tokenId] = 0;

        uint256 existingListingId = activeListingByTokenId[tokenId];
        if (existingListingId != 0) {
            Listing storage existingListing = listings[existingListingId];
            existingListing.active = false;
            activeListingByTokenId[tokenId] = 0;

            emit ListingCancelled(
                existingListingId,
                tokenId,
                existingListing.seller,
                block.timestamp
            );
        }

        totalSales += 1;
        lastSalePrice = amount;

        precatorioNFT.safeTransferFrom(msg.sender, buyer, tokenId);

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        if (!sent) revert TransferFailed();

        emit OfferAccepted(
            offerId,
            tokenId,
            msg.sender,
            buyer,
            amount,
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

    function _activeOffer(
        uint256 offerId
    ) private view returns (Offer storage offer) {
        offer = offers[offerId];

        if (offer.buyer == address(0)) revert OfferNotFound();
        if (!offer.active) revert OfferInactive();
    }

    function _authorizeUpgrade(
        address
    ) internal override onlyOwner whenValid {}
}
