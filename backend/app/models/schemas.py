from pydantic import BaseModel, UUID4, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime

class ServiceStatus(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"

class TokenState(str, Enum):
    CREATED = "CREATED"
    WAITING = "WAITING"
    NEAR = "NEAR"
    CONFIRMING = "CONFIRMING"
    CONFIRMED = "CONFIRMED"
    CALLED = "CALLED"
    SERVING = "SERVING"
    DONE = "DONE"
    MISSED = "MISSED"
    EXPIRED = "EXPIRED"

class CounterStatus(str, Enum):
    FREE = "FREE"
    BUSY = "BUSY"
    OFFLINE = "OFFLINE"

# --- Service Models ---
class ServiceCreate(BaseModel):
    name: str
    latitude: float
    longitude: float
    presence_radius: Optional[float] = 100.0

class ServiceResponse(ServiceCreate):
    id: UUID4
    status: ServiceStatus
    created_at: datetime

# --- Token Models ---
class JoinQueueRequest(BaseModel):
    service_id: UUID4
    user_identifier: str # Could be UUID or DeviceID
    user_lat: float
    user_long: float

class TokenResponse(BaseModel):
    id: UUID4
    service_id: UUID4
    token_number: int
    state: TokenState
    issued_at: datetime
    # Include other fields as needed for UI

class VerifyPresenceRequest(BaseModel):
    token_id: UUID4
    lat: float
    long: float

# --- Flow Models ---
class EntryScanRequest(BaseModel):
    token_id: UUID4
    counter_id: UUID4

class ExitScanRequest(BaseModel):
    token_id: UUID4
    exit_code: str # Simple validation string or QR content
