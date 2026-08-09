// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ControlledToken
 * @notice Implementação fungível mínima usada pela prova de conceito.
 * @dev Usa duas casas decimais: 100 unidades representam R$ 1,00.
 *      Para uma versão de produção, a equipe deve considerar bibliotecas
 *      amplamente auditadas, como OpenZeppelin ERC20.
 */
abstract contract ControlledToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 2;

    uint256 public totalSupply;
    address public immutable issuer;
    address public compensationManager;

    mapping(address => uint256) internal balances;
    mapping(address => mapping(address => uint256)) private allowances;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event CompensationManagerUpdated(address indexed previousManager, address indexed newManager);

    error Unauthorized();
    error InvalidAddress();
    error InvalidAmount();
    error InsufficientBalance();
    error InsufficientAllowance();

    modifier onlyIssuer() {
        if (msg.sender != issuer) revert Unauthorized();
        _;
    }

    modifier onlyCompensationManager() {
        if (msg.sender != compensationManager) revert Unauthorized();
        _;
    }

    constructor(string memory tokenName, string memory tokenSymbol, address tokenIssuer) {
        if (tokenIssuer == address(0)) revert InvalidAddress();
        name = tokenName;
        symbol = tokenSymbol;
        issuer = tokenIssuer;
    }

    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return allowances[owner][spender];
    }

    function setCompensationManager(address newManager) external onlyIssuer {
        if (newManager == address(0)) revert InvalidAddress();
        address previousManager = compensationManager;
        compensationManager = newManager;
        emit CompensationManagerUpdated(previousManager, newManager);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        if (spender == address(0)) revert InvalidAddress();
        allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowances[from][msg.sender];
        if (currentAllowance < amount) revert InsufficientAllowance();

        unchecked {
            allowances[from][msg.sender] = currentAllowance - amount;
        }

        emit Approval(from, msg.sender, allowances[from][msg.sender]);
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @notice Queima saldo durante uma compensação coordenada pelo contrato autorizado.
     */
    function burnForCompensation(address account, uint256 amount) external onlyCompensationManager {
        _burn(account, amount);
    }

    /**
     * @dev Hook chamado antes de uma alteração de saldo.
     *      Tokens sem atualização monetária mantêm a implementação vazia.
     */
    function _syncAccount(address account) internal virtual {}

    function _transfer(address from, address to, uint256 amount) internal {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        _syncAccount(from);
        if (to != from) {
            _syncAccount(to);
        }

        uint256 fromBalance = balances[from];
        if (fromBalance < amount) revert InsufficientBalance();

        unchecked {
            balances[from] = fromBalance - amount;
        }
        balances[to] += amount;

        emit Transfer(from, to, amount);
    }

    function _mint(address account, uint256 amount) internal {
        if (account == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        _syncAccount(account);

        totalSupply += amount;
        balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal {
        if (account == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        _syncAccount(account);

        uint256 accountBalance = balances[account];
        if (accountBalance < amount) revert InsufficientBalance();

        unchecked {
            balances[account] = accountBalance - amount;
            totalSupply -= amount;
        }

        emit Transfer(account, address(0), amount);
    }
}
