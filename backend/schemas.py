from datetime import datetime
from typing import Any

from pydantic import BaseModel


class TopologyCreate(BaseModel):
    name: str
    data: Any


class Topology(BaseModel):
    id: int
    name: str
    data: Any
    created_at: datetime

    class Config:
        orm_mode = True
