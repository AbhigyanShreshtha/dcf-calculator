from fastapi import APIRouter, Depends

from app.api.dependencies import get_dcf_service
from app.schemas.dcf import (
    DcfAssumptions,
    DcfCalculationResponse,
    ReverseDcfRequest,
    ReverseDcfResponse,
    ScenarioCompareRequest,
    ScenarioCompareResponse,
    SensitivityMatrixResponse,
    SensitivityRequest,
    TargetReturnRequest,
    TargetReturnResponse,
)
from app.services.dcf_service import DcfService


router = APIRouter()


@router.post("/calculate", response_model=DcfCalculationResponse)
def calculate_dcf(
    assumptions: DcfAssumptions,
    service: DcfService = Depends(get_dcf_service),
) -> DcfCalculationResponse:
    return service.calculate(assumptions)


@router.post("/sensitivity", response_model=SensitivityMatrixResponse)
def calculate_sensitivity(
    request: SensitivityRequest,
    service: DcfService = Depends(get_dcf_service),
) -> SensitivityMatrixResponse:
    return service.build_sensitivity(request)


@router.post("/scenario/compare", response_model=ScenarioCompareResponse)
def compare_scenarios(
    request: ScenarioCompareRequest,
    service: DcfService = Depends(get_dcf_service),
) -> ScenarioCompareResponse:
    return service.compare_scenarios(request)


@router.post("/reverse", response_model=ReverseDcfResponse)
def reverse_dcf(
    request: ReverseDcfRequest,
    service: DcfService = Depends(get_dcf_service),
) -> ReverseDcfResponse:
    return service.reverse_dcf(request)


@router.post("/target-return", response_model=TargetReturnResponse)
def target_return(
    request: TargetReturnRequest,
    service: DcfService = Depends(get_dcf_service),
) -> TargetReturnResponse:
    return service.target_return(request)

