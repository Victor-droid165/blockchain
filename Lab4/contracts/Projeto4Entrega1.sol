// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ControlledToken
 * @notice Implementação fungível mínima para a primeira entrega do Projeto 4.
 * @dev Usa duas casas decimais: 100 unidades representam R$ 1,00.
 *      Para a versão final, a equipe pode substituir esta base por OpenZeppelin ERC20.
 */
abstract contract ControlledToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 2;

    uint256 public totalSupply;
    address public immutable issuer;
    address public compensationManager;

    mapping(address => uint256) private balances;
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

    function _transfer(address from, address to, uint256 amount) internal {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

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

        totalSupply += amount;
        balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal {
        if (account == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        uint256 accountBalance = balances[account];
        if (accountBalance < amount) revert InsufficientBalance();

        unchecked {
            balances[account] = accountBalance - amount;
            totalSupply -= amount;
        }

        emit Transfer(account, address(0), amount);
    }
}

/**
 * @title QuitusToken
 * @notice Token QTS emitido a partir de um precatório validado pela instituição emissora.
 */
contract QuitusToken is ControlledToken {
    struct Precatorio {
        address beneficiary;
        uint256 faceValue;
        uint256 tokenizedAt;
        bool tokenized;
    }

    mapping(bytes32 => Precatorio) public precatorios;

    event PrecatorioTokenized(
        bytes32 indexed precatorioIdHash,
        address indexed beneficiary,
        uint256 amount,
        uint256 tokenizedAt
    );

    error PrecatorioAlreadyTokenized();
    error InvalidIdentifier();

    constructor(address tokenIssuer) ControlledToken("Quitus", "QTS", tokenIssuer) {}

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
}

/**
 * @title DebitusToken
 * @notice Token DBT emitido a partir de um crédito fiscal validado pela instituição emissora.
 */
contract DebitusToken is ControlledToken {
    struct FiscalCredit {
        address holder;
        uint256 faceValue;
        uint256 issuedAt;
        bool issued;
    }

    mapping(bytes32 => FiscalCredit) public fiscalCredits;

    event FiscalCreditIssued(
        bytes32 indexed fiscalCreditIdHash,
        address indexed holder,
        uint256 amount,
        uint256 issuedAt
    );

    error FiscalCreditAlreadyIssued();
    error InvalidIdentifier();

    constructor(address tokenIssuer) ControlledToken("Debitus", "DBT", tokenIssuer) {}

    /**
     * @notice Registra o hash de um crédito fiscal e emite DBT ao titular.
     * @param fiscalCreditIdHash Hash do identificador institucional do crédito fiscal.
     * @param holder Endereço que receberá os DBT.
     * @param amount Valor em centavos. Ex.: 40000 = R$ 400,00.
     */
    function issueFiscalCredit(
        bytes32 fiscalCreditIdHash,
        address holder,
        uint256 amount
    ) external onlyIssuer {
        if (fiscalCreditIdHash == bytes32(0)) revert InvalidIdentifier();
        if (fiscalCredits[fiscalCreditIdHash].issued) revert FiscalCreditAlreadyIssued();

        fiscalCredits[fiscalCreditIdHash] = FiscalCredit({
            holder: holder,
            faceValue: amount,
            issuedAt: block.timestamp,
            issued: true
        });

        _mint(holder, amount);

        emit FiscalCreditIssued(
            fiscalCreditIdHash,
            holder,
            amount,
            block.timestamp
        );
    }
}

interface ICompensableToken {
    function balanceOf(address account) external view returns (uint256);
    function burnForCompensation(address account, uint256 amount) external;
}

/**
 * @title CompensationManager
 * @notice Queima QTS e DBT de forma atômica para registrar a compensação.
 * @dev Se qualquer queima falhar, toda a transação é revertida pela EVM.
 */
contract CompensationManager {
    ICompensableToken public immutable quitusToken;
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

        quitusToken = ICompensableToken(quitusTokenAddress);
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
