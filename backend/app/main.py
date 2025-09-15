from fastapi import Depends, FastAPI, HTTPException
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
    return db.query(models.Topology).order_by(models.Topology.updated_at.desc()).all()


@app.put("/topologies/{topology_id}", response_model=schemas.Topology)
def update_topology(
    topology_id: int, topology: schemas.TopologyUpdate, db: Session = Depends(get_db)
):
    db_topology = (
        db.query(models.Topology).filter(models.Topology.id == topology_id).first()
    )
    if db_topology is None:
        raise HTTPException(status_code=404, detail="topology not found")

    db_topology.data = topology.data
    if topology.name is not None:
        db_topology.name = topology.name
    db.add(db_topology)
    db.commit()
    db.refresh(db_topology)
    return db_topology
