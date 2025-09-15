from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

from . import models, schemas
from .database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/topologies", response_model=schemas.Topology)
def create_topology(topology: schemas.TopologyCreate, db: Session = Depends(get_db)):
    db_topology = models.Topology(name=topology.name, data=topology.data)
    db.add(db_topology)
    db.commit()
    db.refresh(db_topology)
    return db_topology


@app.get("/topologies", response_model=list[schemas.Topology])
def list_topologies(db: Session = Depends(get_db)):
    return db.query(models.Topology).order_by(models.Topology.created_at.desc()).all()
