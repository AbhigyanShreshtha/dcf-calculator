from fastapi import APIRouter, Depends, Response, status

from app.api.dependencies import get_model_service
from app.schemas.models import (
    SavedModelCreateRequest,
    SavedModelSummary,
    SavedModelUpdateRequest,
    SavedValuationModel,
)
from app.services.model_service import ModelService


router = APIRouter()


@router.get("", response_model=list[SavedModelSummary])
def list_models(service: ModelService = Depends(get_model_service)) -> list[SavedModelSummary]:
    return service.list_models()


@router.post("", response_model=SavedValuationModel, status_code=status.HTTP_201_CREATED)
def create_model(
    payload: SavedModelCreateRequest,
    service: ModelService = Depends(get_model_service),
) -> SavedValuationModel:
    return service.create_model(payload)


@router.get("/{model_id}", response_model=SavedValuationModel)
def get_model(model_id: str, service: ModelService = Depends(get_model_service)) -> SavedValuationModel:
    return service.get_model(model_id)


@router.put("/{model_id}", response_model=SavedValuationModel)
def update_model(
    model_id: str,
    payload: SavedModelUpdateRequest,
    service: ModelService = Depends(get_model_service),
) -> SavedValuationModel:
    return service.update_model(model_id, payload)


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_model(model_id: str, service: ModelService = Depends(get_model_service)) -> Response:
    service.delete_model(model_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{model_id}/duplicate", response_model=SavedValuationModel, status_code=status.HTTP_201_CREATED)
def duplicate_model(model_id: str, service: ModelService = Depends(get_model_service)) -> SavedValuationModel:
    return service.duplicate_model(model_id)

