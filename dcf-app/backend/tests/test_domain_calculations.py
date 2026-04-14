import pytest

from app.domain.calculations import (
    calculate_equity_value,
    calculate_intrinsic_value_per_share,
    calculate_terminal_value_exit_multiple,
    calculate_terminal_value_gordon,
    project_fcff,
)
from app.schemas.dcf import SensitivityRequest
from app.services.dcf_service import DcfService


def test_gordon_growth_terminal_value() -> None:
    result = calculate_terminal_value_gordon(final_cash_flow=100.0, discount_rate=0.1, terminal_growth_rate=0.03)
    assert result == pytest.approx(1471.4285714285716)


def test_exit_multiple_terminal_value() -> None:
    result = calculate_terminal_value_exit_multiple(terminal_ebitda=52.0, exit_multiple=12.0)
    assert result == pytest.approx(624.0)


def test_fcff_calculation() -> None:
    result = project_fcff(
        nopat=[100.0, 110.0],
        dna=[10.0, 12.0],
        capex=[20.0, 21.0],
        change_in_nwc=[5.0, 7.0],
        stock_based_compensation=[3.0, 4.0],
    )
    assert result.tolist() == pytest.approx([88.0, 98.0])


def test_equity_bridge() -> None:
    result = calculate_equity_value(
        enterprise_value=1000.0,
        cash=120.0,
        debt=250.0,
        preferred_equity=30.0,
        minority_interest=20.0,
    )
    assert result == pytest.approx(820.0)


def test_per_share_value() -> None:
    result = calculate_intrinsic_value_per_share(equity_value=820.0, diluted_shares_outstanding=40.0)
    assert result == pytest.approx(20.5)


def test_sensitivity_matrix_dimensions_and_base_case(base_assumptions) -> None:
    service = DcfService()
    base_result = service.calculate(base_assumptions)
    matrix = service.build_sensitivity(SensitivityRequest(assumptions=base_assumptions))

    assert len(matrix.cells) == 5
    assert all(len(row) == 5 for row in matrix.cells)
    assert matrix.cells[matrix.base_row_index][matrix.base_column_index] == pytest.approx(
        base_result.intrinsic_value_per_share
    )

