from fastapi import Depends, Request

from app.core.config import Settings, get_settings
from app.repositories.sqlite_model_repository import SQLiteValuationModelRepository
from app.services.dcf_service import DcfService
from app.services.model_service import ModelService


def get_app_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_model_repository(settings: Settings = Depends(get_app_settings)) -> SQLiteValuationModelRepository:
    return SQLiteValuationModelRepository(settings)


def get_dcf_service() -> DcfService:
    return DcfService()


def get_model_service(
    repository: SQLiteValuationModelRepository = Depends(get_model_repository),
    dcf_service: DcfService = Depends(get_dcf_service),
) -> ModelService:
    return ModelService(repository=repository, dcf_service=dcf_service)
