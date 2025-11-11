from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class GPSSCode(BaseModel):
    code: str
    gen_time: Optional[float] = None
    gen_date: Optional[datetime] = None
