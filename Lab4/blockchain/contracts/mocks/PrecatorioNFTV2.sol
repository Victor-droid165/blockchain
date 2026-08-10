// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PrecatorioNFT} from "../PrecatorioNFT.sol";

/**
 * @dev Implementação de teste usada apenas para comprovar o upgrade UUPS.
 */
contract PrecatorioNFTV2 is PrecatorioNFT {
    function version() external pure returns (uint256) {
        return 2;
    }
}
