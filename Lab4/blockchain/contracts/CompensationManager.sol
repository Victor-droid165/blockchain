// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

interface IPrecatorioNFT {
    function ownerOf(uint256 tokenId) external view returns (address);

    function precatorios(
        uint256 tokenId
    )
        external
        view
        returns (bytes32 identifier, uint256 faceValue, uint256 registeredAt);

    function burnForCompensation(uint256 tokenId) external;
}

interface IMonetaryOracle {
    function currentIndex() external view returns (uint256);

    function adjustedValue(uint256 faceValue) external view returns (uint256);
}

/**
 * @title CompensationManager
 * @notice Compensação atômica entre precatórios (PrecatorioNFT) e débitos
 *         fiscais mock, o núcleo da proposta Quitus & Debitus.
 * @dev O contrato mantém um registro mock de débitos fiscais (papel da
 *      Fazenda, exercido pelo owner) e executa a compensação em uma única
 *      transação indivisível: o NFT do precatório é queimado e o débito é
 *      abatido pelo valor de face corrigido pelo `MonetaryOracle`. Se
 *      qualquer passo reverter, a EVM desfaz a transação inteira.
 *
 *      Implantado atrás de proxy UUPS, com o mesmo ciclo de vida dos demais
 *      contratos da PoC: pausa temporária e invalidação permanente.
 */
contract CompensationManager is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    struct FiscalDebt {
        bytes32 identifier;
        address debtor;
        uint256 originalAmount;
        uint256 outstanding;
        uint256 registeredAt;
    }

    /// @dev Registro permanente de uma compensação executada: faz o papel
    ///      do termo de quitação consultável on-chain.
    struct Compensation {
        uint256 tokenId;
        uint256 debtId;
        address creditor;
        uint256 faceValue;
        uint256 adjustedValue;
        uint256 executedAt;
    }

    IPrecatorioNFT public precatorioNFT;
    IMonetaryOracle public monetaryOracle;

    uint256 public nextDebtId;
    uint256 public nextCompensationId;
    bool public invalidated;

    mapping(uint256 => FiscalDebt) public debts;
    mapping(bytes32 => bool) public debtIdentifiersUsed;
    mapping(uint256 => Compensation) public compensations;

    event FiscalDebtRegistered(
        uint256 indexed debtId,
        bytes32 indexed identifier,
        address indexed debtor,
        uint256 amount,
        uint256 registeredAt
    );

    event CompensationExecuted(
        uint256 compensationId,
        uint256 indexed tokenId,
        uint256 indexed debtId,
        address indexed creditor,
        uint256 faceValue,
        uint256 adjustedValue,
        uint256 remainingDebt,
        uint256 executedAt
    );

    event ContractInvalidated(
        address indexed account,
        uint256 invalidatedAt
    );

    error InvalidAddress();
    error InvalidIdentifier();
    error InvalidDebtAmount();
    error IdentifierAlreadyUsed();
    error DebtNotFound();
    error NotTokenOwner();
    error UnauthorizedDebtor();
    error DebtSmallerThanCredit();
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
        address precatorioNFTAddress,
        address monetaryOracleAddress
    ) public initializer {
        if (
            initialOwner == address(0) ||
            precatorioNFTAddress == address(0) ||
            monetaryOracleAddress == address(0)
        ) {
            revert InvalidAddress();
        }

        __Ownable_init(initialOwner);
        __Pausable_init();

        precatorioNFT = IPrecatorioNFT(precatorioNFTAddress);
        monetaryOracle = IMonetaryOracle(monetaryOracleAddress);
        nextDebtId = 1;
        nextCompensationId = 1;
    }

    /**
     * @notice Registra um débito fiscal mock (papel da Fazenda na PoC).
     * @param identifier Identificador abstrato e único do débito (ex.: CDA).
     * @param debtor Conta devedora, que também precisa ser a credora do
     *        precatório no momento da compensação.
     * @param amount Valor do débito em centavos.
     */
    function registerDebt(
        bytes32 identifier,
        address debtor,
        uint256 amount
    ) external onlyOwner whenValid whenNotPaused returns (uint256 debtId) {
        if (debtor == address(0)) revert InvalidAddress();
        if (identifier == bytes32(0)) revert InvalidIdentifier();
        if (amount == 0) revert InvalidDebtAmount();
        if (debtIdentifiersUsed[identifier]) revert IdentifierAlreadyUsed();

        debtId = nextDebtId++;
        debtIdentifiersUsed[identifier] = true;

        debts[debtId] = FiscalDebt({
            identifier: identifier,
            debtor: debtor,
            originalAmount: amount,
            outstanding: amount,
            registeredAt: block.timestamp
        });

        emit FiscalDebtRegistered(
            debtId,
            identifier,
            debtor,
            amount,
            block.timestamp
        );
    }

    /**
     * @notice Compensa um precatório com um débito fiscal em uma única
     *         transação indivisível.
     * @dev O chamador precisa ser, ao mesmo tempo, o proprietário atual do
     *      NFT e o devedor do débito. O crédito consumido é o valor de face
     *      corrigido pelo oráculo no momento da execução. O débito precisa
     *      comportar o crédito inteiro: o NFT não admite consumo parcial, e
     *      reverter é o que protege o credor de perder o valor residual.
     */
    function compensate(
        uint256 tokenId,
        uint256 debtId
    ) external whenValid whenNotPaused returns (uint256 compensationId) {
        FiscalDebt storage debt = debts[debtId];

        if (debt.debtor == address(0)) revert DebtNotFound();
        if (precatorioNFT.ownerOf(tokenId) != msg.sender) {
            revert NotTokenOwner();
        }
        if (debt.debtor != msg.sender) revert UnauthorizedDebtor();

        (, uint256 faceValue, ) = precatorioNFT.precatorios(tokenId);
        uint256 credit = monetaryOracle.adjustedValue(faceValue);

        if (debt.outstanding < credit) revert DebtSmallerThanCredit();

        debt.outstanding -= credit;

        compensationId = nextCompensationId++;

        compensations[compensationId] = Compensation({
            tokenId: tokenId,
            debtId: debtId,
            creditor: msg.sender,
            faceValue: faceValue,
            adjustedValue: credit,
            executedAt: block.timestamp
        });

        // Queima na mesma transação: se falhar, o abatimento acima também
        // é revertido pela EVM.
        precatorioNFT.burnForCompensation(tokenId);

        emit CompensationExecuted(
            compensationId,
            tokenId,
            debtId,
            msg.sender,
            faceValue,
            credit,
            debt.outstanding,
            block.timestamp
        );
    }

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
     * @dev Débitos e termos de compensação continuam consultáveis, mas
     *      nenhuma operação mutável nem novo upgrade pode ser executado.
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
