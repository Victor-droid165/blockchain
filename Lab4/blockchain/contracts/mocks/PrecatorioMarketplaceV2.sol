// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PrecatorioMarketplace} from "../PrecatorioMarketplace.sol";

/**
 * @dev Implementação usada somente para validar o fluxo de upgrade UUPS.
 */
contract PrecatorioMarketplaceV2 is PrecatorioMarketplace {
    function version() external pure returns (uint256) {
        return 2;
    }
}
