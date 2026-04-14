from fastapi import HTTPException, status

from app.repositories.base import ValuationModelRepository
from app.schemas.models import (
    SavedModelCreateRequest,
    SavedModelSummary,
    SavedModelUpdateRequest,
    SavedValuationModel,
)
from app.services.dcf_service import DcfService


class ModelService:
    def __init__(self, repository: ValuationModelRepository, dcf_service: DcfService) -> None:
        self.repository = repository
        self.dcf_service = dcf_service

    def list_models(self) -> list[SavedModelSummary]:
        models = self.repository.list_models()
        summaries: list[SavedModelSummary] = []
        for model in models:
            default_scenario = self._get_default_scenario(model)
            calculation = self.dcf_service.calculate(default_scenario)
            summaries.append(
                SavedModelSummary(
                    id=model.id,
                    name=model.name,
                    description=model.description,
                    default_scenario=model.default_scenario,
                    company_name=default_scenario.company_name,
                    scenario_count=len(model.scenarios),
                    intrinsic_value_per_share=calculation.intrinsic_value_per_share,
                    current_price_per_share=calculation.current_price_per_share,
                    upside_downside_pct=calculation.upside_downside_pct,
                    updated_at=model.updated_at,
                )
            )
        return summaries

    def get_model(self, model_id: str) -> SavedValuationModel:
        model = self.repository.get_model(model_id)
        if model is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found.")
        return model

    def create_model(self, payload: SavedModelCreateRequest) -> SavedValuationModel:
        return self.repository.create_model(payload)

    def update_model(self, model_id: str, payload: SavedModelUpdateRequest) -> SavedValuationModel:
        model = self.repository.update_model(model_id, payload)
        if model is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found.")
        return model

    def delete_model(self, model_id: str) -> None:
        deleted = self.repository.delete_model(model_id)
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found.")

    def duplicate_model(self, model_id: str) -> SavedValuationModel:
        model = self.repository.duplicate_model(model_id)
        if model is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found.")
        return model

    @staticmethod
    def _get_default_scenario(model: SavedValuationModel):
        for scenario in model.scenarios:
            if scenario.scenario_name == model.default_scenario:
                return scenario
        return model.scenarios[0]

