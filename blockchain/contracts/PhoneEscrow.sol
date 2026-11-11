// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PhoneEscrow
 * @notice Custodia en USDC (u otro ERC-20) el pago de una orden de ElectroPhone.
 *
 * Flujo:
 *   1. La tienda (FUNDER_ROLE) deposita el equivalente en USDC del pedido.
 *   2. Si el cliente confirma la entrega (o el árbitro lo decide), los fondos
 *      se liberan al vendedor.
 *   3. Si hay un problema, el vendedor o el árbitro pueden reembolsar al
 *      comprador. Pasada la fecha límite, el propio comprador puede reclamar
 *      el reembolso.
 *
 * Cada orden se identifica por un `orderRef` (keccak256 del número de orden),
 * calculado fuera de la cadena por el backend.
 */
contract PhoneEscrow is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant FUNDER_ROLE = keccak256("FUNDER_ROLE");
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");

    enum Status {
        None,
        Funded,
        Released,
        Refunded
    }

    struct Escrow {
        address buyer;
        address seller;
        uint256 amount;
        uint256 deadline;
        Status status;
    }

    IERC20 public immutable token;

    mapping(bytes32 => Escrow) private _escrows;

    /// @notice Suma de todos los fondos actualmente custodiados.
    uint256 public totalEscrowed;

    event EscrowFunded(
        bytes32 indexed orderRef,
        address indexed buyer,
        address indexed seller,
        uint256 amount,
        uint256 deadline
    );
    event EscrowReleased(bytes32 indexed orderRef, address indexed seller, uint256 amount);
    event EscrowRefunded(bytes32 indexed orderRef, address indexed buyer, uint256 amount);

    error InvalidAddress();
    error InvalidAmount();
    error InvalidDeadline();
    error EscrowAlreadyExists();
    error EscrowNotFunded();
    error NotAuthorized();

    constructor(address token_, address admin) {
        if (token_ == address(0) || admin == address(0)) revert InvalidAddress();
        token = IERC20(token_);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FUNDER_ROLE, admin);
        _grantRole(ARBITER_ROLE, admin);
    }

    /**
     * @notice Deposita los fondos de una orden en custodia.
     * @dev El llamador debe haber aprobado previamente `amount` tokens a este contrato.
     * @param orderRef keccak256 del número de orden (ORD-XXXXXXXX).
     * @param buyer Dirección que recibirá el reembolso.
     * @param seller Dirección que recibirá el pago al liberar.
     * @param amount Monto en unidades base del token (USDC = 6 decimales).
     * @param deadline Fecha límite (unix) tras la cual el comprador puede reclamar.
     */
    function fundEscrow(
        bytes32 orderRef,
        address buyer,
        address seller,
        uint256 amount,
        uint256 deadline
    ) external onlyRole(FUNDER_ROLE) nonReentrant {
        if (orderRef == bytes32(0)) revert InvalidAddress();
        if (buyer == address(0) || seller == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (deadline <= block.timestamp) revert InvalidDeadline();
        if (_escrows[orderRef].status != Status.None) revert EscrowAlreadyExists();

        _escrows[orderRef] = Escrow({
            buyer: buyer,
            seller: seller,
            amount: amount,
            deadline: deadline,
            status: Status.Funded
        });
        totalEscrowed += amount;

        token.safeTransferFrom(msg.sender, address(this), amount);

        emit EscrowFunded(orderRef, buyer, seller, amount, deadline);
    }

    /**
     * @notice Libera los fondos al vendedor.
     * @dev Puede llamarlo el comprador (confirma entrega) o un árbitro.
     */
    function release(bytes32 orderRef) external nonReentrant {
        Escrow storage escrow = _escrows[orderRef];
        if (escrow.status != Status.Funded) revert EscrowNotFunded();

        bool isBuyer = msg.sender == escrow.buyer;
        bool isArbiter = hasRole(ARBITER_ROLE, msg.sender);
        if (!isBuyer && !isArbiter) revert NotAuthorized();

        escrow.status = Status.Released;
        totalEscrowed -= escrow.amount;

        token.safeTransfer(escrow.seller, escrow.amount);

        emit EscrowReleased(orderRef, escrow.seller, escrow.amount);
    }

    /**
     * @notice Reembolsa los fondos al comprador.
     * @dev Puede llamarlo el vendedor, un árbitro, o el comprador una vez
     *      vencida la fecha límite.
     */
    function refund(bytes32 orderRef) external nonReentrant {
        Escrow storage escrow = _escrows[orderRef];
        if (escrow.status != Status.Funded) revert EscrowNotFunded();

        bool isSeller = msg.sender == escrow.seller;
        bool isArbiter = hasRole(ARBITER_ROLE, msg.sender);
        bool isBuyerAfterDeadline = msg.sender == escrow.buyer && block.timestamp >= escrow.deadline;
        if (!isSeller && !isArbiter && !isBuyerAfterDeadline) revert NotAuthorized();

        escrow.status = Status.Refunded;
        totalEscrowed -= escrow.amount;

        token.safeTransfer(escrow.buyer, escrow.amount);

        emit EscrowRefunded(orderRef, escrow.buyer, escrow.amount);
    }

    /// @notice Devuelve los datos completos de un escrow.
    function getEscrow(bytes32 orderRef) external view returns (Escrow memory) {
        return _escrows[orderRef];
    }

    /// @notice Devuelve solo el estado de un escrow.
    function escrowStatus(bytes32 orderRef) external view returns (Status) {
        return _escrows[orderRef].status;
    }
}
