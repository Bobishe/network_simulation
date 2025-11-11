# from pathlib import Path
from typing import Literal
import io

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.schemas.gpss_model_data import ModelData
from app.schemas.gpss_code import GPSSCode

from .gpss_generator import Generator


api_router = APIRouter(prefix='/gpss', tags=['Generator'])


@api_router.post('/gen', response_model=GPSSCode, description='Генерация GPSS-кода на основе входных парамеров.')
async def gpss_gen(model_data: ModelData) -> GPSSCode:
    result = Generator(data=model_data).code()
    
    # output_file = Path('latest_model.gss')
    # with open(output_file, 'w' if output_file.exists() else 'x', encoding='utf-8') as f:
    #     f.write(result.code)
    
    return result


@api_router.post('/gen-file', description='Генерация файла с расширением `.gps.txt` с GPSS-кодом на основе входных парамеров.')
async def gpss_gen_file(model_data: ModelData, encoding: Literal['utf-8', 'cp1251']='cp1251'):
    generator = Generator(data=model_data)
    code_data = generator.code(add_time=True)
    buffer = io.BytesIO(code_data.code.encode(encoding=encoding))
    return StreamingResponse(buffer, media_type='application/octet-stream', 
                             headers={'Content-Disposition': f'attachment; filename=model-{code_data.gen_date.strftime('%d-%m-%Y-%H-%M-%S')}.gps.txt'})
