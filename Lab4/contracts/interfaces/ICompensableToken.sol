// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICompensableToken {
    function balanceOf(address account) external view returns (uint256);
    function burnForCompensation(address account, uint256 amount) external;
}

interface IQuitusCompensableToken is ICompensableToken {
    function syncBalance(address account) external returns (uint256);
}
