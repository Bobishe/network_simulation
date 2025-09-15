from datetime import datetime
from typing import Any

from pydantic import BaseModel


class TopologyCreate(BaseModel):
    name: str
    data: Any


class TopologyUpdate(BaseModel):
    """Schema for updating an existing topology.

    Only the `data` field is required. The `name` field is optional so that
    clients can update the topology's structure without needing to resend the
    name, which previously caused validation errors when omitted.
    """

    data: Any
    name: str | None = None


class Topology(BaseModel):
    id: int
    name: str
    data: Any
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
