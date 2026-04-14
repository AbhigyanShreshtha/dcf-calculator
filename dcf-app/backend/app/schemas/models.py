from pydantic import BaseModel, Field, model_validator

from app.schemas.dcf import DcfAssumptions


class SavedModelCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=400)
    default_scenario: str = "base"
    scenarios: list[DcfAssumptions]

    @model_validator(mode="after")
    def validate_payload(self) -> "SavedModelCreateRequest":
        if not self.scenarios:
            raise ValueError("At least one scenario is required.")
        scenario_names = [scenario.scenario_name for scenario in self.scenarios]
        if len(set(scenario_names)) != len(scenario_names):
            raise ValueError("Scenario names must be unique.")
        if self.default_scenario not in scenario_names:
            raise ValueError("Default scenario must match one of the saved scenario names.")
        return self


class SavedModelUpdateRequest(SavedModelCreateRequest):
    pass


class SavedValuationModel(SavedModelCreateRequest):
    id: str
    created_at: str
    updated_at: str


class SavedModelSummary(BaseModel):
    id: str
    name: str
    description: str | None
    default_scenario: str
    company_name: str
    scenario_count: int
    intrinsic_value_per_share: float
    current_price_per_share: float | None
    upside_downside_pct: float | None
    updated_at: str

