from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB

from .database import Base


class Topology(Base):
    __tablename__ = "topologies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    data = Column(JSONB, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
