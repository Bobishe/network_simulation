from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_V1_STR: str = '/api'

    class Config:
        env_file = '.env'
        extra = 'ignore'


settings = Settings()
