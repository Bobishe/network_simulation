from typing import Optional, Literal
from time import monotonic
from datetime import datetime

from app.schemas.gpss_model_data import ModelData, NodeData
from app.schemas.gpss_code import GPSSCode


class Block:
    def __init__(self, data: ModelData):
        self.global_data: ModelData = data
        self.code_header: Optional[str] = ''
        self.code_footer: Optional[str] = ''
        self.code_margin: int = max(len(interface.base_label) 
                                    for node in data.nodes.values() 
                                    for interface in node.data.interfaces.values()) + 5
        self.code_width: int = self.code_margin * 4 + 16


class Node(Block):
    def __new__(cls, node_key: str, data: ModelData):
        node_data = data.nodes[node_key]
        match str(node_data.data.nodeType).lower():
            case 'as':
                return super().__new__(AS)
            case 'sc':
                return super().__new__(SC)
            case 'haps':
                return super().__new__(HAPS)
            case 'es':
                return super().__new__(ES)
            case 'ssop':
                return super().__new__(SSOP)
            case _:
                raise TypeError(f'Unexpected `nodeType` (`{node_data.data.nodeType}`) in NodeData.')

    def __init__(self, node_key: str, data: ModelData):
        super().__init__(data)
        self.data: NodeData = data.nodes[node_key]
        self.header_label = f' | {self.data.data.label}' if self.data.data.label is not None else ''
        
    def code(self) -> str:
        '''
        Функция вызова генератора кода.
        Для корректной работы требуется определение функции `_code(self)` в дочерних классах.
        '''
        header = f'*{self.code_header:=^{self.code_width}}*\n\n' if self.code_header is not None else ''
        code = self.code_generator().lstrip('\n').rstrip('\n')
        footer = f'\n\n*{self.code_footer:=^{self.code_width}}*' if self.code_footer is not None else ''
        return f'{header}{code}{footer}'
    
    def code_generator(self) -> str:
        raise NotImplementedError('Предполагается реализация и вызов в дочерних классах посредством вызова функции `code(self)`.')

    def next_int_name(self, interface: NodeData.Data.Interface, direction: Literal['in', 'out']) -> str:
            if direction == 'in':
                return f'processing_{self.data.id}'
            edge_channel = self.global_data.edges[interface.edgeId].data.channel
            # Check if this edge points to a terminal
            if edge_channel.is_terminal:
                # For terminal endpoints, return the terminal label directly
                return edge_channel.to.terminal
            # For node endpoints, get the next interface's base_label
            next_int_data = edge_channel.to
            next_interface = self.global_data.nodes[next_int_data.nodeId].data.interfaces[next_int_data.portId]
            return next_interface.base_label

    def gen_input_data(self) -> str:
        template = '{data__gen}{data__proc}{data__int}'
        template_gen = '{la:<{width}} EQU       {la_val}'
        template_proc = (
            '{service_name:<{width}} STORAGE   {service_lines}\n'
            '{queue:<{width}} EQU       {queue_val}\n'
            '{mu:<{width}} EQU       {mu_val}')
        template_int = (
            '{queue:<{width}} EQU       {queue_val}\n'
            '{mu:<{width}} EQU       {mu_val}')
        interfaces = [interface 
                      for interface in self.data.data.interfaces.values() 
                      if interface.queue.q > 0]
        return template.format(
            data__gen=template_gen.format(
                    width=self.code_margin,
                    la=f'la_gen_{self.data.id}',
                    la_val=self.data.data.generator.lambda_
                ) if self.data.data.generator is not None else '',
            data__proc=template_proc.format(
                width=self.code_margin,
                service_name=f'service_{self.data.id}',
                service_lines=self.data.data.processing.serviceLines,
                queue=f' q_{self.data.id}',
                queue_val=self.data.data.processing.queue,
                mu=f'mu_{self.data.id}',
                mu_val=self.data.data.processing.mu
            ) + '\n' if self.data.data.processing is not None else '',
            data__int='\n'.join(template_int.format(
                width=self.code_margin,
                queue=f' q_{interface.base_label}',
                queue_val=interface.queue.q,
                mu=f'mu_{interface.base_label}',
                mu_val=interface.service.mu
            ) for interface in interfaces
            ) + '\n' if interfaces else ''
        )

    def gen_interfaces_data(self, direction: Literal['in', 'out']) -> str:
        template = (
            '{name}'
            '{block:<{width}} ASSIGN    {key_int_idx},{val_int_idx}'
            '{indent}TEST L    Q${queue_name},{queue},{loss}'
            '{indent}QUEUE     {queue_name}'
            '{indent}SEIZE     {service_name}'
            '{indent}DEPART    {queue_name}'
            '{indent}ADVANCE   ({dist}(1,0,1/{mu}))'
            '{indent}RELEASE   {service_name}'
            '{indent}TRANSFER  ,{next_block}\n\n'
            '{loss:<{width}} SAVEVALUE {loss}_+,1'
            '{indent}TERMINATE')
        return '\n\n'.join(
            template.format(
                name=f'* {interface.name}\n' if interface.name is not None else '',
                block=interface.base_label,
                width=self.code_margin,
                key_int_idx=f'number_{direction}_int_{self.data.data.nodeType}',
                val_int_idx=interface.idx,
                indent='\n' + ' ' * (self.code_margin + 1),
                queue_name=f'queue_{interface.base_label}',
                queue=f'q_{interface.base_label}',
                loss=f'loss_{interface.base_label}',
                service_name=f'service_{interface.base_label}',
                dist=interface.service.dist,
                mu=f'mu_{interface.base_label}',
                next_block=self.next_int_name(interface=interface,
                                              direction=direction),
            ) for interface in self.data.data.interfaces.values()
            if interface.direction == direction
        ) 

    def gen_processing_data(self) -> str:
        template = (
            '* Обработка\n'
            '{proc_name:<{width}} TEST L    Q${queue_name},{queue},{loss}'
            '{indent}QUEUE     {queue_name}'
            '{indent}ENTER     {service_name},1'
            '{indent}DEPART    {queue_name}'
            '{indent}ADVANCE   ({dist}(1,0,1/{mu}))'
            '{indent}LEAVE     {service_name},1\n'
            '{routing}\n'
            '{loss:<{width}} SAVEVALUE {loss}_+,1'
            '{indent}TERMINATE')
        template_test_routing = '{indent}TEST E    P$type_data,{type},{route_name}'
        template_test =  '{route_name:<{width}} TRANSFER  ,{next_block}'
        indent = '\n' + ' ' * (self.code_margin + 1)
        out_interfaces = {interface.idx: interface 
                          for interface in self.data.data.interfaces.values() 
                          if interface.direction == 'out'}
        return template.format(
            proc_name=f'processing_{self.data.id}',
            width=self.code_margin,
            indent=indent,
            queue_name=f'queue_{self.data.id}',
            queue=f'q_{self.data.id}',
            loss=f'loss_{self.data.id}',
            service_name=f'service_{self.data.id}',
            dist=self.data.data.processing.dist,
            mu=f'mu_{self.data.id}',
            routing=''.join(template_test_routing.format(
                indent=indent,
                type=route.type,
                route_name=f'TEST_{self.data.id}_{route.outPort}'
            ) for route in self.data.data.processing.routingTable) + '\n\n' + '\n'.join(template_test.format(
                route_name=f'TEST_{self.data.id}_{route.outPort}',
                width=self.code_margin,
                next_block=out_interfaces[route.outPort].base_label
            ) for route in self.data.data.processing.routingTable) + '\n'
        ) 


class AS(Node):
    def __init__(self, node_key, data):
        super().__init__(node_key, data)
        self.code_header = f'[Генератор трафика от абонентов кластера | {self.data.id}{self.header_label}]'
        
    def code_generator(self):
        template = (
            f'{self.gen_input_data()}\n'
            '{indent}GENERATE  ({val__dist}(1,0,1/{key__la_gen}))'
            '{indent}ASSIGN    {key__cap_data},(V${key__capacity})'
            '{indent}SPLIT     (P${key__cap_data}/{mtu})'
            '{indent}ASSIGN    {key__type_data},{val__type_data}'
            '{indent}TRANSFER  ,{key__out_int}\n\n'
            '{key__in_ints:<{width}}\n\n')
        return template.format(
            width=self.code_margin,
            indent='\n' + ' ' * (self.code_margin + 1),
            key__la_gen=f'la_gen_{self.data.id}',
            val__la_gen=self.data.data.generator.lambda_,
            val__dist=list(self.data.data.interfaces.values())[0].service.dist,
            key__cap_data=f'cap_data_AS',
            mtu=self.global_data.model.packet.mtu,
            key__capacity=self.data.data.generator.capacitySource,
            key__type_data='type_data',
            val__type_data=self.data.data.generator.typeData,
            key__out_int=','.join(self.next_int_name(interface=interface,
                                                     direction='out')
                                 for interface in self.data.data.interfaces.values()
                                 if interface.direction == 'out'),
            key__in_ints=f'\n'.join(
                '{key__in_int:<{width}} TERMINATE'.format(
                    width=self.code_margin,
                    key__in_int=interface.base_label) 
                for interface in self.data.data.interfaces.values()
                if interface.direction == 'in'))


class SC(Node):
    def __init__(self, node_key, data):
        super().__init__(node_key, data)
        self.code_header = f'[КА с обработкой на борту | {self.data.id}{self.header_label}]'
    
    def code_generator(self):
        return (
            f'{self.gen_input_data()}\n\n'
            f'{self.gen_interfaces_data(direction='in')}\n\n\n'
            f'{self.gen_processing_data()}\n\n\n'
            f'{self.gen_interfaces_data(direction='out')}')


class HAPS(Node):
    def __init__(self, node_key, data):
        super().__init__(node_key, data)
        self.code_header = f'[HAPS с обработкой на борту | {self.data.id}{self.header_label}]'

    def code_generator(self):
        return (
            f'{self.gen_input_data()}\n\n'
            f'{self.gen_interfaces_data(direction='in')}\n\n\n'
            f'{self.gen_processing_data()}\n\n\n'
            f'{self.gen_interfaces_data(direction='out')}')


class ES(Node):
    def __init__(self, node_key, data):
        super().__init__(node_key, data)
        self.code_header = f'[Земная станция | {self.data.id}{self.header_label}]'

    def code_generator(self):
        return (
            f'{self.gen_input_data()}\n\n'
            f'{self.gen_interfaces_data(direction='in')}\n\n\n'
            f'{self.gen_processing_data()}\n\n\n'
            f'{self.gen_interfaces_data(direction='out')}')


class SSOP(Node):
    def __init__(self, node_key, data):
        super().__init__(node_key, data)
        self.code_header = f'[ССОП | {self.data.id}{self.header_label}]'
        
    def code_generator(self):
        template = (
            f'{self.gen_input_data()}\n\n'
            '{key__to:<{width}} TERMINATE\n'
            '{indent}GENERATE  ({val__dist}(1,0,1/{key__la_gen}))'
            '{indent}ASSIGN    {key__cap_data},(V${key__capacity})'
            '{indent}SPLIT     (P${key__cap_data}/{mtu})'
            '{indent}ASSIGN    {key__type_data},{val__type_data}'
            '{indent}TRANSFER  ,{key__in_int}\n\n'
            '{key__in_ints:<{width}}\n\n')
        return template.format(
            width=self.code_margin,
            indent='\n' + ' ' * (self.code_margin + 1),
            key__la_gen=f'la_gen_{self.data.id}',
            val__la_gen=self.data.data.generator.lambda_,
            val__dist=list(self.data.data.interfaces.values())[0].service.dist,
            key__cap_data=f'cap_data_SSOP',
            mtu=self.global_data.model.packet.mtu,
            key__capacity=self.data.data.generator.capacitySource,
            key__type_data='type_data',
            val__type_data=self.data.data.generator.typeData,
            key__in_int=','.join(self.next_int_name(interface=interface,
                                                     direction='out')
                                 for interface in self.data.data.interfaces.values()
                                 if interface.direction == 'out'),
            key__in_ints=f'\n'.join(
                '{key__in_int:<{width}} TERMINATE'.format(
                    width=self.code_margin,
                    key__in_int=interface.base_label) 
                for interface in self.data.data.interfaces.values()
                if interface.direction == 'in'))
    


class Generator(Block):
    def __init__(self, data: ModelData):
        super().__init__(data)
        self.data: ModelData = data

    def code(self, add_time: bool = False) -> GPSSCode:
        start_time = monotonic()
        header_1_text = '[Настройки модели 1]'
        header_1 = f'*{header_1_text:=^{self.code_width}}*\n\n'
        footer_1 = f'\n\n*' + '=' * self.code_width + '*'
        header_2_text = '[Настройки модели 2]'
        header_2 = f'*{header_2_text:=^{self.code_width}}*\n'
        footer_2 = f'\n\n*' + '=' * self.code_width + '*'
        indent = '\n' + ' ' * (self.code_margin + 1)
        
        config_2_template = (
            '{indent}GENERATE  {duration}'
            '{indent}TERMINATE 1'
            '{indent}START     1')

        # Generate capacity distribution expression based on distribution type
        dist_type = self.data.model.traffic.capacity.dist.lower()
        params = self.data.model.traffic.capacity.params
        rn = params.rn if params.rn else 1

        if dist_type == 'duniform':
            # DUNIFORM(RNj, min, max) - Discrete uniform distribution
            dist_expr = f'DUNIFORM({rn},{params.min},{params.max})'
        elif dist_type == 'binomial':
            # Binomial(RNj, n, p) - Binomial distribution
            dist_expr = f'Binomial({rn},{params.n},{params.p})'
        elif dist_type == 'negbinom':
            # NEGBINOM(RNj, nc, p) - Negative binomial distribution
            dist_expr = f'NEGBINOM({rn},{params.nc},{params.p})'
        elif dist_type == 'geometric':
            # GEOMETRIC(RNj, p) - Geometric distribution
            dist_expr = f'GEOMETRIC({rn},{params.p})'
        elif dist_type == 'poisson':
            # POISSON(RNj, m) - Poisson distribution
            dist_expr = f'POISSON({rn},{params.m})'
        else:
            # Fallback to DUNIFORM for unknown distributions
            dist_expr = f'DUNIFORM({rn},{params.min},{params.max})'

        config_1_template = '{var:<{width}} VARIABLE  ({dist_expr})'
        config_1 = config_1_template.format(
            width=self.code_margin,
            var='capacity',
            dist_expr=dist_expr)
        config_2 = config_2_template.format(
            indent=indent,
            duration=self.global_data.model.sim.duration)
        nodes_code = '\n'.join(
            Node(node_id, self.data).code()
            for node_id in self.data.nodes.keys())
        result = GPSSCode(
            code=(
                f'{header_1}{config_1}{footer_1}\n'
                f'{nodes_code}'
                f'\n{header_2}{config_2}{footer_2}\n'),
            gen_time=monotonic() - start_time,
            gen_date=datetime.now()
        )
        if add_time:
            header_0_text = '[Информация о процессе генерации]'
            header_0 = f'*{header_0_text:=^{self.code_width}}*\n\n'
            footer_0 = f'\n\n*' + '=' * self.code_width + '*'
            result.code = (
                f'{header_0}'
                f'* Дата генерации кода : {result.gen_date}\n'
                f'* Время генерации кода: {result.gen_time} сек'
                f'{footer_0}\n'
                f'{result.code}')
        return result
