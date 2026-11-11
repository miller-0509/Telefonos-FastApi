// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @notice Stablecoin de prueba con 6 decimales para desarrollo local.
 *         En producción se reemplaza por la dirección real de USDC.
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;

    constructor() ERC20("USD Coin (Mock)", "USDC") Ownable(msg.sender) {}

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /// @notice Permite al owner acuñar tokens de prueba.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
