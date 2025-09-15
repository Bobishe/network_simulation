from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
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


@app.websocket("/ws/topology")
async def topology_updates(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive_json()
            topology_id = message.get("id")
            data = message.get("data")
            if topology_id is None or data is None:
                await websocket.send_json({"error": "id and data required"})
                continue
            topology = db.query(models.Topology).filter(models.Topology.id == topology_id).first()
            if topology is None:
                await websocket.send_json({"error": "topology not found"})
                continue
            topology.data = data
            db.add(topology)
            db.commit()
            db.refresh(topology)
            await websocket.send_json(
                {"status": "updated", "topology": schemas.Topology.from_orm(topology).dict()}
            )
    except WebSocketDisconnect:
        pass
