import pytest
from pydantic import ValidationError

from app.schemas.dcf import DcfAssumptions


def test_terminal_growth_must_be_less_than_discount_rate(base_assumptions: DcfAssumptions) -> None:
    with pytest.raises(ValidationError):
        DcfAssumptions.model_validate(
            {
                **base_assumptions.model_dump(mode="python"),
                "terminal_growth_rate": 0.1,
                "discount_rate": 0.1,
            }
        )

