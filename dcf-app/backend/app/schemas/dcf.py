from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


ScenarioName = Literal["bear", "base", "bull", "custom"]
ModelType = Literal["fcff", "fcfe"]
RevenueGrowthMode = Literal["constant", "explicit"]
MarginMode = Literal["fixed", "interpolate", "explicit"]
SeriesMode = Literal["percent", "explicit"]
TerminalValueMethod = Literal["gordon_growth", "exit_multiple"]
SensitivityMatrixType = Literal["wacc_growth", "wacc_exit_multiple"]
ReverseSolveMode = Literal["revenue_growth", "operating_margin"]


class RevenueGrowthInput(BaseModel):
    mode: RevenueGrowthMode = "constant"
    constant_rate: float | None = 0.08
    rates: list[float] | None = None

    @field_validator("constant_rate")
    @classmethod
    def validate_constant_rate(cls, value: float | None) -> float | None:
        if value is None:
            return value
        if not -0.99 <= value <= 5.0:
            raise ValueError("Revenue growth rates must be between -99% and 500%.")
        return value

    @field_validator("rates")
    @classmethod
    def validate_rates(cls, value: list[float] | None) -> list[float] | None:
        if value is None:
            return value
        for rate in value:
            if not -0.99 <= rate <= 5.0:
                raise ValueError("Revenue growth rates must be between -99% and 500%.")
        return value

    @model_validator(mode="after")
    def validate_mode(self) -> "RevenueGrowthInput":
        if self.mode == "constant" and self.constant_rate is None:
            raise ValueError("A constant revenue growth rate is required when mode='constant'.")
        if self.mode == "explicit" and not self.rates:
            raise ValueError("Explicit revenue growth mode requires yearly growth rates.")
        return self


class RevenueLinkedSeriesInput(BaseModel):
    mode: SeriesMode = "percent"
    percent_of_revenue: float | None = 0.0
    values: list[float] | None = None

    @field_validator("percent_of_revenue")
    @classmethod
    def validate_percent(cls, value: float | None) -> float | None:
        if value is None:
            return value
        if not -1.0 <= value <= 1.0:
            raise ValueError("Revenue-linked percentages must be between -100% and 100%.")
        return value

    @field_validator("values")
    @classmethod
    def validate_values(cls, value: list[float] | None) -> list[float] | None:
        if value is None:
            return value
        for item in value:
            if item < 0:
                raise ValueError("Explicit yearly values cannot be negative.")
        return value

    @model_validator(mode="after")
    def validate_mode(self) -> "RevenueLinkedSeriesInput":
        if self.mode == "percent" and self.percent_of_revenue is None:
            raise ValueError("A percent of revenue is required when mode='percent'.")
        if self.mode == "explicit" and not self.values:
            raise ValueError("Explicit mode requires yearly values.")
        return self


class NwcInput(BaseModel):
    mode: SeriesMode = "percent"
    percent_of_incremental_revenue: float | None = 0.01
    values: list[float] | None = None

    @field_validator("percent_of_incremental_revenue")
    @classmethod
    def validate_percent(cls, value: float | None) -> float | None:
        if value is None:
            return value
        if not -2.0 <= value <= 2.0:
            raise ValueError("Change in NWC as a percent of incremental revenue must be between -200% and 200%.")
        return value

    @field_validator("values")
    @classmethod
    def validate_values(cls, value: list[float] | None) -> list[float] | None:
        return value

    @model_validator(mode="after")
    def validate_mode(self) -> "NwcInput":
        if self.mode == "percent" and self.percent_of_incremental_revenue is None:
            raise ValueError("A percent of incremental revenue is required when mode='percent'.")
        if self.mode == "explicit" and not self.values:
            raise ValueError("Explicit mode requires yearly NWC values.")
        return self


class MarginInput(BaseModel):
    mode: MarginMode = "interpolate"
    fixed_margin: float | None = None
    target_margin: float | None = 0.2
    values: list[float] | None = None

    @field_validator("fixed_margin", "target_margin")
    @classmethod
    def validate_margin(cls, value: float | None) -> float | None:
        if value is None:
            return value
        if not -1.0 <= value <= 1.0:
            raise ValueError("Margins must be between -100% and 100%.")
        return value

    @field_validator("values")
    @classmethod
    def validate_values(cls, value: list[float] | None) -> list[float] | None:
        if value is None:
            return value
        for margin in value:
            if not -1.0 <= margin <= 1.0:
                raise ValueError("Explicit margins must be between -100% and 100%.")
        return value

    @model_validator(mode="after")
    def validate_mode(self) -> "MarginInput":
        if self.mode == "fixed" and self.fixed_margin is None:
            raise ValueError("A fixed margin is required when mode='fixed'.")
        if self.mode == "interpolate" and self.target_margin is None:
            raise ValueError("A target margin is required when mode='interpolate'.")
        if self.mode == "explicit" and not self.values:
            raise ValueError("Explicit mode requires yearly margins.")
        return self


class DcfAssumptions(BaseModel):
    company_name: str = Field(min_length=1, max_length=120)
    model_name: str = Field(min_length=1, max_length=120)
    scenario_name: ScenarioName = "base"
    model_type: ModelType = "fcff"
    currency_symbol: str = Field(default="$", min_length=1, max_length=4)

    current_revenue: float = Field(ge=0)
    current_ebit_margin: float = Field(ge=-1.0, le=1.0)
    tax_rate: float = Field(ge=0.0, le=1.0)
    forecast_years: int = Field(default=5, ge=3, le=15)

    revenue_growth: RevenueGrowthInput = Field(default_factory=RevenueGrowthInput)
    margin_assumptions: MarginInput = Field(default_factory=MarginInput)
    dna_assumptions: RevenueLinkedSeriesInput = Field(
        default_factory=lambda: RevenueLinkedSeriesInput(mode="percent", percent_of_revenue=0.03)
    )
    capex_assumptions: RevenueLinkedSeriesInput = Field(
        default_factory=lambda: RevenueLinkedSeriesInput(mode="percent", percent_of_revenue=0.04)
    )
    nwc_assumptions: NwcInput = Field(
        default_factory=lambda: NwcInput(mode="percent", percent_of_incremental_revenue=0.01)
    )
    stock_based_compensation: RevenueLinkedSeriesInput = Field(
        default_factory=lambda: RevenueLinkedSeriesInput(mode="percent", percent_of_revenue=0.0)
    )
    net_borrowing: list[float] | None = None
    net_operating_losses: float = Field(default=0.0, ge=0.0)

    discount_rate: float = Field(gt=-0.999, lt=1.0)
    mid_year_discounting: bool = False
    terminal_value_method: TerminalValueMethod = "gordon_growth"
    terminal_growth_rate: float | None = None
    terminal_ebitda_multiple: float | None = None

    cash: float = Field(default=0.0, ge=0.0)
    debt: float = Field(default=0.0, ge=0.0)
    preferred_equity: float = Field(default=0.0, ge=0.0)
    minority_interest: float = Field(default=0.0, ge=0.0)
    diluted_shares_outstanding: float = Field(gt=0.0)
    current_market_price_per_share: float | None = Field(default=None, ge=0.0)
    margin_of_safety: float = Field(default=0.2, ge=0.0, le=0.5)

    @field_validator("terminal_growth_rate")
    @classmethod
    def validate_terminal_growth(cls, value: float | None) -> float | None:
        if value is None:
            return value
        if not -0.99 <= value <= 0.15:
            raise ValueError("Terminal growth rates must be between -99% and 15%.")
        return value

    @field_validator("terminal_ebitda_multiple")
    @classmethod
    def validate_terminal_multiple(cls, value: float | None) -> float | None:
        if value is None:
            return value
        if value <= 0 or value > 100:
            raise ValueError("Terminal EBITDA multiples must be greater than 0x and less than or equal to 100x.")
        return value

    @model_validator(mode="after")
    def validate_assumptions(self) -> "DcfAssumptions":
        explicit_fields = {
            "revenue growth rates": self.revenue_growth.rates if self.revenue_growth.mode == "explicit" else None,
            "margin assumptions": self.margin_assumptions.values if self.margin_assumptions.mode == "explicit" else None,
            "D&A assumptions": self.dna_assumptions.values if self.dna_assumptions.mode == "explicit" else None,
            "capex assumptions": self.capex_assumptions.values if self.capex_assumptions.mode == "explicit" else None,
            "change in NWC assumptions": self.nwc_assumptions.values if self.nwc_assumptions.mode == "explicit" else None,
            "stock-based compensation assumptions": (
                self.stock_based_compensation.values if self.stock_based_compensation.mode == "explicit" else None
            ),
            "net borrowing assumptions": self.net_borrowing,
        }
        for label, values in explicit_fields.items():
            if values is not None and len(values) not in (0, self.forecast_years):
                raise ValueError(
                    f"Explicit {label} length must match forecast years ({self.forecast_years})."
                )

        if self.terminal_value_method == "gordon_growth":
            if self.terminal_growth_rate is None:
                raise ValueError("Terminal growth rate is required when using the Gordon Growth method.")
            if self.terminal_growth_rate >= self.discount_rate:
                raise ValueError("Terminal growth rate must be less than the discount rate for Gordon Growth.")

        if self.terminal_value_method == "exit_multiple" and self.terminal_ebitda_multiple is None:
            raise ValueError("Terminal EBITDA multiple is required when using the Exit Multiple method.")

        return self


class BridgeItem(BaseModel):
    label: str
    value: float


class ForecastRow(BaseModel):
    year: int
    revenue: float
    growth_rate: float
    ebit_margin: float
    ebit: float
    cash_taxes: float
    nopat: float
    depreciation_and_amortization: float
    stock_based_compensation: float
    capex: float
    change_in_nwc: float
    net_borrowing: float
    fcff: float
    fcfe: float
    discount_factor: float
    pv_fcff: float
    pv_fcfe: float
    remaining_nol: float


class TransparencyDetails(BaseModel):
    formulas: list[str]
    terminal_value_formula: str
    discount_factors: list[float]
    enterprise_to_equity_bridge: list[BridgeItem]
    notes: list[str]


class DcfCalculationResponse(BaseModel):
    company_name: str
    model_name: str
    scenario_name: ScenarioName
    model_type: ModelType
    enterprise_value: float
    equity_value: float
    intrinsic_value_per_share: float
    current_price_per_share: float | None
    upside_downside_pct: float | None
    buy_under_price: float
    present_value_of_forecast_cash_flows: float
    present_value_of_terminal_value: float
    terminal_value: float
    terminal_value_contribution_pct: float
    terminal_ebitda: float
    terminal_cash_flow: float
    forecast_rows: list[ForecastRow]
    transparency: TransparencyDetails


class SensitivityAxisConfig(BaseModel):
    values: list[float] | None = None
    start: float | None = None
    end: float | None = None
    step: float | None = None
    count: int = Field(default=5, ge=3, le=11)

    @field_validator("values")
    @classmethod
    def validate_values(cls, value: list[float] | None) -> list[float] | None:
        if value is None:
            return value
        if len(value) < 3:
            raise ValueError("Sensitivity axes require at least 3 values.")
        return value

    @model_validator(mode="after")
    def validate_axis(self) -> "SensitivityAxisConfig":
        has_range = self.start is not None and self.end is not None and self.step is not None
        if self.values is None and not has_range:
            return self
        if has_range and self.start is not None and self.end is not None and self.start > self.end:
            raise ValueError("Sensitivity axis start must be less than or equal to end.")
        if self.step is not None and self.step <= 0:
            raise ValueError("Sensitivity axis step must be positive.")
        return self


class SensitivityRequest(BaseModel):
    assumptions: DcfAssumptions
    matrix_type: SensitivityMatrixType = "wacc_growth"
    wacc_axis: SensitivityAxisConfig = Field(default_factory=SensitivityAxisConfig)
    terminal_growth_axis: SensitivityAxisConfig = Field(default_factory=SensitivityAxisConfig)
    exit_multiple_axis: SensitivityAxisConfig = Field(default_factory=SensitivityAxisConfig)


class SensitivityMatrixResponse(BaseModel):
    matrix_type: SensitivityMatrixType
    row_values: list[float]
    column_values: list[float]
    cells: list[list[float]]
    base_row_index: int
    base_column_index: int
    currency_symbol: str


class ScenarioCompareRequest(BaseModel):
    scenarios: list[DcfAssumptions]

    @model_validator(mode="after")
    def validate_scenarios(self) -> "ScenarioCompareRequest":
        if len(self.scenarios) < 2:
            raise ValueError("At least two scenarios are required for comparison.")
        scenario_names = [scenario.scenario_name for scenario in self.scenarios]
        if len(set(scenario_names)) != len(scenario_names):
            raise ValueError("Scenario names must be unique within a comparison set.")
        return self


class ScenarioComparisonItem(BaseModel):
    scenario_name: ScenarioName
    intrinsic_value_per_share: float
    enterprise_value: float
    equity_value: float
    current_price_per_share: float | None
    upside_downside_pct: float | None


class ScenarioCompareResponse(BaseModel):
    company_name: str
    model_name: str
    currency_symbol: str
    results: list[ScenarioComparisonItem]


class ReverseDcfRequest(BaseModel):
    assumptions: DcfAssumptions
    solve_for: ReverseSolveMode = "revenue_growth"
    lower_bound: float | None = None
    upper_bound: float | None = None
    tolerance: float = Field(default=1e-4, gt=0)
    max_iterations: int = Field(default=80, ge=10, le=500)

    @model_validator(mode="after")
    def validate_request(self) -> "ReverseDcfRequest":
        if self.assumptions.current_market_price_per_share is None:
            raise ValueError("A current market price per share is required for reverse DCF.")
        return self


class ReverseDcfResponse(BaseModel):
    solve_for: ReverseSolveMode
    target_market_price: float
    implied_value: float
    justified_price: float
    iterations: int
    converged: bool
    error: float
    assumption_label: str


class TargetReturnRequest(BaseModel):
    assumptions: DcfAssumptions
    desired_annualized_return: float = Field(gt=0.0, lt=1.0)
    holding_period_years: int | None = Field(default=None, ge=1, le=15)
    margin_of_safety: float = Field(default=0.0, ge=0.0, le=0.5)


class TargetReturnResponse(BaseModel):
    desired_annualized_return: float
    holding_period_years: int
    intrinsic_value_per_share: float
    max_buy_price_today: float
    buy_under_price_with_margin_of_safety: float
    implied_annualized_return_at_current_price: float | None
