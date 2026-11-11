from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field

ADDRESS_PATTERN = r"^0x[a-fA-F0-9]{40}$"


class EscrowCreate(BaseModel):
    order_number: str = Field(..., min_length=3, max_length=50)
    buyer_address: str = Field(..., pattern=ADDRESS_PATTERN)
    seller_address: Optional[str] = Field(None, pattern=ADDRESS_PATTERN)
    cop_per_usdc: Optional[float] = Field(None, gt=0)
    deadline_days: Optional[int] = Field(None, ge=1, le=365)


class EscrowResponse(BaseModel):
    id: int
    order_id: int
    order_number: Optional[str] = None
    order_ref: str
    buyer_address: str
    seller_address: str
    amount_units: str
    amount_usdc: float
    amount_cop: float
    cop_per_usdc: float
    status: str
    fund_tx_hash: Optional[str] = None
    release_tx_hash: Optional[str] = None
    refund_tx_hash: Optional[str] = None
    deadline: Optional[datetime] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EscrowDetailResponse(EscrowResponse):
    onchain: Optional[Dict[str, Any]] = None
    onchain_error: Optional[str] = None


class EscrowTxResponse(BaseModel):
    order_number: str
    status: str
    tx_hash: str
    block_number: Optional[int] = None
    escrow: EscrowResponse


class BlockchainStatusResponse(BaseModel):
    enabled: bool
    connected: bool
    chain_id: Optional[int] = None
    rpc_url: str
    escrow_address: Optional[str] = None
    usdc_address: Optional[str] = None
    seller_address: Optional[str] = None
    funder_address: Optional[str] = None
    usdc_balance: Optional[float] = None
    total_escrowed_usdc: Optional[float] = None
    block_number: Optional[int] = None
    explorer_url: Optional[str] = None
