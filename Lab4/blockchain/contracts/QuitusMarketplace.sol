// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IMarketToken} from "./interfaces/IMarketToken.sol";

/**
 * @title QuitusMarketplace
 * @notice Livro de ordens simplificado para negociação de QTS na PoC.
 * @dev Usa ETH de teste apenas como mecanismo técnico de liquidação.
 *      O preço é expresso em wei por unidade interna de QTS
 *      (0,01 QTS, pois o token usa duas casas decimais).
 */
contract QuitusMarketplace {
    enum OrderSide {
        Sell,
        Buy
    }

    struct Order {
        address maker;
        OrderSide side;
        uint256 amount;
        uint256 remaining;
        uint256 pricePerUnitWei;
        uint256 createdAt;
        bool active;
    }

    IMarketToken public immutable quitusToken;

    uint256 public nextOrderId = 1;
    uint256 public totalTrades;
    uint256 public lastTradePriceWei;

    mapping(uint256 => Order) public orders;

    bool private locked;

    event OrderCreated(
        uint256 indexed orderId,
        address indexed maker,
        OrderSide side,
        uint256 amount,
        uint256 pricePerUnitWei,
        uint256 createdAt
    );

    event OrderFilled(
        uint256 indexed orderId,
        address indexed maker,
        address indexed taker,
        OrderSide side,
        uint256 amount,
        uint256 pricePerUnitWei,
        uint256 totalValueWei,
        uint256 remaining
    );

    event OrderCancelled(
        uint256 indexed orderId,
        address indexed maker,
        uint256 remaining,
        uint256 refundedWei
    );

    error InvalidAddress();
    error InvalidAmount();
    error InvalidPrice();
    error InvalidPayment();
    error OrderNotFound();
    error OrderInactive();
    error InvalidOrderSide();
    error InsufficientOrderAmount();
    error Unauthorized();
    error TransferFailed();
    error Reentrancy();

    modifier nonReentrant() {
        if (locked) revert Reentrancy();
        locked = true;
        _;
        locked = false;
    }

    constructor(address quitusTokenAddress) {
        if (quitusTokenAddress == address(0)) revert InvalidAddress();
        quitusToken = IMarketToken(quitusTokenAddress);
    }

    /**
     * @notice Cria uma oferta de venda de QTS.
     * @dev O vendedor deve aprovar o marketplace antes da execução da ordem.
     *      Os QTS não ficam em custódia do marketplace durante a espera.
     */
    function createSellOrder(
        uint256 amount,
        uint256 pricePerUnitWei
    ) external returns (uint256 orderId) {
        if (amount == 0) revert InvalidAmount();
        if (pricePerUnitWei == 0) revert InvalidPrice();

        orderId = _createOrder(
            msg.sender,
            OrderSide.Sell,
            amount,
            pricePerUnitWei
        );
    }

    /**
     * @notice Cria uma oferta de compra de QTS e mantém o ETH de teste em escrow.
     */
    function createBuyOrder(
        uint256 amount,
        uint256 pricePerUnitWei
    ) external payable returns (uint256 orderId) {
        if (amount == 0) revert InvalidAmount();
        if (pricePerUnitWei == 0) revert InvalidPrice();

        uint256 requiredValue = amount * pricePerUnitWei;
        if (msg.value != requiredValue) revert InvalidPayment();

        orderId = _createOrder(
            msg.sender,
            OrderSide.Buy,
            amount,
            pricePerUnitWei
        );
    }

    /**
     * @notice Compra QTS de uma ordem de venda.
     * @dev O comprador envia exatamente o ETH de teste correspondente à parcela.
     */
    function fillSellOrder(
        uint256 orderId,
        uint256 amount
    ) external payable nonReentrant {
        Order storage order = _getActiveOrder(orderId);

        if (order.side != OrderSide.Sell) revert InvalidOrderSide();
        if (amount == 0) revert InvalidAmount();
        if (amount > order.remaining) revert InsufficientOrderAmount();

        uint256 totalValue = amount * order.pricePerUnitWei;
        if (msg.value != totalValue) revert InvalidPayment();

        _applyFill(order, amount);

        bool tokenTransferred = quitusToken.transferFrom(
            order.maker,
            msg.sender,
            amount
        );
        if (!tokenTransferred) revert TransferFailed();

        _sendValue(order.maker, totalValue);

        _emitFill(orderId, order, msg.sender, amount, totalValue);
    }

    /**
     * @notice Vende QTS para uma ordem de compra.
     * @dev O ETH de teste correspondente já está em escrow desde a criação da ordem.
     */
    function fillBuyOrder(
        uint256 orderId,
        uint256 amount
    ) external nonReentrant {
        Order storage order = _getActiveOrder(orderId);

        if (order.side != OrderSide.Buy) revert InvalidOrderSide();
        if (amount == 0) revert InvalidAmount();
        if (amount > order.remaining) revert InsufficientOrderAmount();

        uint256 totalValue = amount * order.pricePerUnitWei;

        _applyFill(order, amount);

        bool tokenTransferred = quitusToken.transferFrom(
            msg.sender,
            order.maker,
            amount
        );
        if (!tokenTransferred) revert TransferFailed();

        _sendValue(msg.sender, totalValue);

        _emitFill(orderId, order, msg.sender, amount, totalValue);
    }

    /**
     * @notice Cancela a parte ainda aberta de uma ordem.
     * @dev Em ordens de compra, devolve o ETH de teste ainda reservado.
     */
    function cancelOrder(uint256 orderId) external nonReentrant {
        Order storage order = _getActiveOrder(orderId);

        if (order.maker != msg.sender) revert Unauthorized();

        uint256 remaining = order.remaining;
        uint256 refund;

        order.remaining = 0;
        order.active = false;

        if (order.side == OrderSide.Buy) {
            refund = remaining * order.pricePerUnitWei;
            _sendValue(order.maker, refund);
        }

        emit OrderCancelled(
            orderId,
            order.maker,
            remaining,
            refund
        );
    }

    function _createOrder(
        address maker,
        OrderSide side,
        uint256 amount,
        uint256 pricePerUnitWei
    ) private returns (uint256 orderId) {
        orderId = nextOrderId++;

        orders[orderId] = Order({
            maker: maker,
            side: side,
            amount: amount,
            remaining: amount,
            pricePerUnitWei: pricePerUnitWei,
            createdAt: block.timestamp,
            active: true
        });

        emit OrderCreated(
            orderId,
            maker,
            side,
            amount,
            pricePerUnitWei,
            block.timestamp
        );
    }

    function _getActiveOrder(
        uint256 orderId
    ) private view returns (Order storage order) {
        order = orders[orderId];

        if (order.maker == address(0)) revert OrderNotFound();
        if (!order.active) revert OrderInactive();
    }

    function _applyFill(Order storage order, uint256 amount) private {
        order.remaining -= amount;

        if (order.remaining == 0) {
            order.active = false;
        }

        totalTrades += 1;
        lastTradePriceWei = order.pricePerUnitWei;
    }

    function _emitFill(
        uint256 orderId,
        Order storage order,
        address taker,
        uint256 amount,
        uint256 totalValue
    ) private {
        emit OrderFilled(
            orderId,
            order.maker,
            taker,
            order.side,
            amount,
            order.pricePerUnitWei,
            totalValue,
            order.remaining
        );
    }

    function _sendValue(address to, uint256 amount) private {
        (bool sent, ) = payable(to).call{value: amount}("");
        if (!sent) revert TransferFailed();
    }
}
