from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app
from app.schemas.dcf import (
    DcfAssumptions,
    MarginInput,
    NwcInput,
    RevenueGrowthInput,
    RevenueLinkedSeriesInput,
)


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        database_url=f"sqlite:///{tmp_path / 'test.db'}",
        seed_demo_data=False,
        cors_origins=["http://localhost:5173"],
    )


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    app = create_app(settings)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def base_assumptions() -> DcfAssumptions:
    return DcfAssumptions(
        company_name="TestCo",
        model_name="TestCo Base",
        scenario_name="base",
        model_type="fcff",
        currency_symbol="$",
        current_revenue=1000.0,
        current_ebit_margin=0.2,
        tax_rate=0.25,
        forecast_years=5,
        revenue_growth=RevenueGrowthInput(mode="constant", constant_rate=0.08),
        margin_assumptions=MarginInput(mode="interpolate", target_margin=0.24),
        dna_assumptions=RevenueLinkedSeriesInput(mode="percent", percent_of_revenue=0.03),
        capex_assumptions=RevenueLinkedSeriesInput(mode="percent", percent_of_revenue=0.04),
        nwc_assumptions=NwcInput(mode="percent", percent_of_incremental_revenue=0.015),
        stock_based_compensation=RevenueLinkedSeriesInput(mode="percent", percent_of_revenue=0.01),
        net_operating_losses=0.0,
        discount_rate=0.1,
        mid_year_discounting=False,
        terminal_value_method="gordon_growth",
        terminal_growth_rate=0.03,
        cash=100.0,
        debt=250.0,
        preferred_equity=25.0,
        minority_interest=10.0,
        diluted_shares_outstanding=50.0,
        current_market_price_per_share=20.0,
        margin_of_safety=0.2,
    )

