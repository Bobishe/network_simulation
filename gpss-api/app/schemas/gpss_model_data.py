from typing import Any, Optional, Union, Literal
from functools import cached_property

from pydantic import BaseModel, Field, AliasChoices, field_validator, computed_field, ConfigDict, model_validator


class CBaseModel(BaseModel):
    model_config = ConfigDict(extra='ignore')


class ModelData(CBaseModel):
    class Rng(CBaseModel):
        seed: int = 42

    class Sim(CBaseModel):
        duration: int

    class Time(CBaseModel):
        unit: Union[str, Literal['min']]

    class Model(CBaseModel):
        id: str

    class Packet(CBaseModel):
        mtu: int

    class Traffic(CBaseModel):
        class Capacity(CBaseModel):
            class Params(CBaseModel):
                maxBytes: int
                minBytes: int

            dist: str
            params: Params
        
        capacity: Capacity
    
    rng: Rng
    sim: Sim
    time: Time
    model: Model
    packet: Packet
    traffic: Traffic


class NodeData(CBaseModel):
    class Data(CBaseModel):
        class Generator(CBaseModel):
            lambda_: float = Field(validation_alias=AliasChoices('lambda'))
            typeData: int
            capacitySource: str
        
        class Interface(CBaseModel):
            class Queue(CBaseModel):
                q: int = Field(alias=AliasChoices('q_in', 'q_out'))

            class NextHop(CBaseModel):
                terminal: Optional[str] = None

            class Service(CBaseModel):
                mu: int = Field(alias=AliasChoices('mu_in', 'mu_out'))
                servers: int = Field(alias=AliasChoices('servers_in', 'servers_out'))
                dist: str = Field(alias=AliasChoices('dist_in', 'dist_out'))

            id: str
            idx: int
            name: str
            queue: Queue
            edgeId: str
            nextHop: Optional[NextHop] = None
            service: Service
            direction: str

            base_label: Optional[str] = None #
            
        class Processing(CBaseModel):
            class Route(CBaseModel):
                type: int
                outPort: int

            mu: float
            dist: str
            queue: int
            routingTable: list[Route]
            serviceLines: int

        label: str
        nodeType: str
        generator: Optional[Generator] = None
        interfaces: dict[str, Interface]
        processing: Optional[Processing] = None

        @field_validator('interfaces', mode='before')
        @classmethod
        def validator_interfaces(cls, value: list[dict]):
            return {interface['id']: interface for interface in value}
    
    id: str
    data: Data

    @model_validator(mode='before')
    @classmethod
    def validator_(cls, data: dict):
        interfaces = data['data']['interfaces']
        node_id = data['id']
        for interface in interfaces:
            direction = interface['direction']
            idx = interface['idx']
            interface.update({'base_label': f'{direction}_int{idx}_{node_id}'})
        return data


class EdgeData(CBaseModel):
    class Data(CBaseModel):
        class Channel(CBaseModel):
            class To(CBaseModel):
                nodeId: str
                portId: str

            id: str
            to: To

        channel: Channel

    data: Data
    

class ModelData(CBaseModel):
    model: ModelData
    nodes: dict[str, NodeData]
    edges: dict[str, EdgeData]

    @field_validator('nodes', mode='before')
    @classmethod
    def validator_nodes(cls, value: list[dict]):
        return {node_data['id']: node_data for node_data in value}

    @field_validator('edges', mode='before')
    @classmethod
    def validator_edges(cls, value: list[dict]):
        return {edge_data['data']['channel']['id']: edge_data for edge_data in value}
