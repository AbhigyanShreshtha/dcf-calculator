from collections.abc import Sequence

import numpy as np
import numpy_financial as npf
import pandas as pd
from fastapi import HTTPException, status

from app.domain.calculations import (
    build_sensitivity_matrix,
    calculate_enterprise_value,
    calculate_equity_value,
    calculate_intrinsic_value_per_share,
    calculate_terminal_value_exit_multiple,
    calculate_terminal_value_gordon,
    calculate_upside_downside,
    discount_cash_flows,
    project_capex,
    project_dna,
    project_ebit,
    project_fcfe,
    project_fcff,
    project_nopat,
    project_nwc,
    project_revenue,
)
from app.schemas.dcf import (
    BridgeItem,
    DcfAssumptions,
    DcfCalculationResponse,
    ForecastRow,
    MarginInput,
    ReverseDcfRequest,
    ReverseDcfResponse,
    RevenueGrowthInput,
    RevenueLinkedSeriesInput,
    ScenarioCompareRequest,
    ScenarioCompareResponse,
    ScenarioComparisonItem,
    SensitivityAxisConfig,
    SensitivityMatrixResponse,
    SensitivityRequest,
    TargetReturnRequest,
    TargetReturnResponse,
    TransparencyDetails,
)


class DcfService:
    def calculate(self, assumptions: DcfAssumptions) -> DcfCalculationResponse:
        growth_rates = self._resolve_growth_rates(assumptions)
        revenues = project_revenue(assumptions.current_revenue, growth_rates)
        margins = self._resolve_margin_series(assumptions)
        ebit = project_ebit(revenues, margins)
        tax_projection = project_nopat(
            ebit_values=ebit,
            tax_rate=assumptions.tax_rate,
            net_operating_losses=assumptions.net_operating_losses,
        )
        dna = self._resolve_revenue_linked_series(revenues, assumptions.dna_assumptions)
        capex = self._resolve_revenue_linked_series(revenues, assumptions.capex_assumptions, projection="capex")
        nwc = project_nwc(
            revenues=revenues,
            current_revenue=assumptions.current_revenue,
            mode=assumptions.nwc_assumptions.mode,
            percent_of_incremental_revenue=assumptions.nwc_assumptions.percent_of_incremental_revenue,
            explicit_values=assumptions.nwc_assumptions.values,
        )
        stock_based_compensation = self._resolve_revenue_linked_series(
            revenues,
            assumptions.stock_based_compensation,
            projection="stock_based_compensation",
        )
        net_borrowing = self._resolve_net_borrowing(assumptions)

        fcff = project_fcff(
            nopat=tax_projection["nopat"],
            dna=dna,
            capex=capex,
            change_in_nwc=nwc,
            stock_based_compensation=stock_based_compensation,
        )
        fcfe = project_fcfe(fcff=fcff, net_borrowing=net_borrowing)

        selected_cash_flows = fcff if assumptions.model_type == "fcff" else fcfe
        discount_projection = discount_cash_flows(
            cash_flows=selected_cash_flows,
            discount_rate=assumptions.discount_rate,
            mid_year_discounting=assumptions.mid_year_discounting,
            start_period=1,
        )
        pv_forecast_cash_flows = float(np.sum(discount_projection["present_values"]))
        terminal_ebitda = float(ebit[-1] + dna[-1])
        terminal_cash_flow = float(selected_cash_flows[-1])

        terminal_value, terminal_formula = self._calculate_terminal_value(
            assumptions=assumptions,
            terminal_cash_flow=terminal_cash_flow,
            terminal_ebitda=terminal_ebitda,
        )
        terminal_discount = discount_cash_flows(
            cash_flows=[terminal_value],
            discount_rate=assumptions.discount_rate,
            mid_year_discounting=assumptions.mid_year_discounting,
            start_period=assumptions.forecast_years,
        )
        pv_terminal_value = float(terminal_discount["present_values"][0])

        if assumptions.model_type == "fcff":
            enterprise_value = calculate_enterprise_value(pv_forecast_cash_flows, pv_terminal_value)
            equity_value = calculate_equity_value(
                enterprise_value=enterprise_value,
                cash=assumptions.cash,
                debt=assumptions.debt,
                preferred_equity=assumptions.preferred_equity,
                minority_interest=assumptions.minority_interest,
            )
        else:
            equity_value = calculate_enterprise_value(pv_forecast_cash_flows, pv_terminal_value)
            enterprise_value = equity_value - assumptions.cash + assumptions.debt + assumptions.preferred_equity + assumptions.minority_interest

        intrinsic_value_per_share = calculate_intrinsic_value_per_share(
            equity_value=equity_value,
            diluted_shares_outstanding=assumptions.diluted_shares_outstanding,
        )
        upside_downside_pct = calculate_upside_downside(
            intrinsic_value_per_share=intrinsic_value_per_share,
            current_market_price_per_share=assumptions.current_market_price_per_share,
        )
        buy_under_price = intrinsic_value_per_share * (1.0 - assumptions.margin_of_safety)
        terminal_value_contribution_pct = (
            (pv_terminal_value / (pv_forecast_cash_flows + pv_terminal_value)) * 100.0
            if (pv_forecast_cash_flows + pv_terminal_value) != 0
            else 0.0
        )

        forecast_frame = pd.DataFrame(
            {
                "year": np.arange(1, assumptions.forecast_years + 1, dtype=np.int64),
                "revenue": revenues,
                "growth_rate": growth_rates,
                "ebit_margin": margins,
                "ebit": ebit,
                "cash_taxes": tax_projection["cash_taxes"],
                "nopat": tax_projection["nopat"],
                "depreciation_and_amortization": dna,
                "stock_based_compensation": stock_based_compensation,
                "capex": capex,
                "change_in_nwc": nwc,
                "net_borrowing": net_borrowing,
                "fcff": fcff,
                "fcfe": fcfe,
                "discount_factor": discount_projection["discount_factors"],
                "pv_fcff": discount_cash_flows(
                    cash_flows=fcff,
                    discount_rate=assumptions.discount_rate,
                    mid_year_discounting=assumptions.mid_year_discounting,
                    start_period=1,
                )["present_values"],
                "pv_fcfe": discount_cash_flows(
                    cash_flows=fcfe,
                    discount_rate=assumptions.discount_rate,
                    mid_year_discounting=assumptions.mid_year_discounting,
                    start_period=1,
                )["present_values"],
                "remaining_nol": tax_projection["remaining_nol"],
            }
        )

        forecast_rows = [
            ForecastRow.model_validate(row)
            for row in forecast_frame.to_dict(orient="records")
        ]

        notes = [
            "All calculations keep float precision internally and round only in the UI.",
            "Taxes reflect a simple NOL carryforward model that applies losses against future positive EBIT.",
        ]
        if assumptions.model_type == "fcfe":
            notes.append("FCFE is modeled as FCFF plus user-supplied net borrowing assumptions.")
        if assumptions.mid_year_discounting:
            notes.append("Mid-year discounting uses period exponents of year - 0.5.")
        if assumptions.terminal_value_method == "exit_multiple" and assumptions.model_type == "fcfe":
            notes.append(
                "Exit multiple terminal value is translated from enterprise value to equity value using current bridge items held constant."
            )
        if not assumptions.mid_year_discounting:
            helper_npv = float(npf.npv(assumptions.discount_rate, np.concatenate(([0.0], selected_cash_flows))))
            if abs(helper_npv - pv_forecast_cash_flows) < 1e-6:
                notes.append("Forecast present value cross-check matches numpy_financial.npv.")

        formulas = [
            "Revenue_t = Revenue_(t-1) * (1 + Growth Rate_t)",
            "EBIT_t = Revenue_t * EBIT Margin_t",
            "NOPAT_t = EBIT_t - Cash Taxes_t",
            "FCFF_t = EBIT_t * (1 - Tax Rate) + D&A_t + SBC_t - Capex_t - Change in NWC_t",
            "FCFE_t = FCFF_t + Net Borrowing_t",
            "Intrinsic Value / Share = Equity Value / Diluted Shares Outstanding",
        ]

        transparency = TransparencyDetails(
            formulas=formulas,
            terminal_value_formula=terminal_formula,
            discount_factors=[float(value) for value in discount_projection["discount_factors"]],
            enterprise_to_equity_bridge=[
                BridgeItem(label="Enterprise Value", value=float(enterprise_value)),
                BridgeItem(label="Cash", value=float(assumptions.cash)),
                BridgeItem(label="Debt", value=float(-assumptions.debt)),
                BridgeItem(label="Preferred Equity", value=float(-assumptions.preferred_equity)),
                BridgeItem(label="Minority Interest", value=float(-assumptions.minority_interest)),
                BridgeItem(label="Equity Value", value=float(equity_value)),
            ],
            notes=notes,
        )

        return DcfCalculationResponse(
            company_name=assumptions.company_name,
            model_name=assumptions.model_name,
            scenario_name=assumptions.scenario_name,
            model_type=assumptions.model_type,
            enterprise_value=float(enterprise_value),
            equity_value=float(equity_value),
            intrinsic_value_per_share=float(intrinsic_value_per_share),
            current_price_per_share=assumptions.current_market_price_per_share,
            upside_downside_pct=upside_downside_pct,
            buy_under_price=float(buy_under_price),
            present_value_of_forecast_cash_flows=float(pv_forecast_cash_flows),
            present_value_of_terminal_value=float(pv_terminal_value),
            terminal_value=float(terminal_value),
            terminal_value_contribution_pct=float(terminal_value_contribution_pct),
            terminal_ebitda=float(terminal_ebitda),
            terminal_cash_flow=float(terminal_cash_flow),
            forecast_rows=forecast_rows,
            transparency=transparency,
        )

    def build_sensitivity(self, request: SensitivityRequest) -> SensitivityMatrixResponse:
        base_assumptions = request.assumptions
        wacc_values = self._generate_axis_values(
            config=request.wacc_axis,
            base_value=base_assumptions.discount_rate,
            default_step=0.01,
        )

        if request.matrix_type == "wacc_growth":
            column_values = self._generate_axis_values(
                config=request.terminal_growth_axis,
                base_value=base_assumptions.terminal_growth_rate or 0.02,
                default_step=0.005,
            )

            def calculator(wacc: float, growth: float) -> float:
                updated = self._validated_assumptions(
                    base_assumptions,
                    {
                        "discount_rate": wacc,
                        "terminal_value_method": "gordon_growth",
                        "terminal_growth_rate": growth,
                    },
                )
                return self.calculate(updated).intrinsic_value_per_share

        else:
            column_values = self._generate_axis_values(
                config=request.exit_multiple_axis,
                base_value=base_assumptions.terminal_ebitda_multiple or 12.0,
                default_step=1.0,
            )

            def calculator(wacc: float, multiple: float) -> float:
                updated = self._validated_assumptions(
                    base_assumptions,
                    {
                        "discount_rate": wacc,
                        "terminal_value_method": "exit_multiple",
                        "terminal_ebitda_multiple": multiple,
                    },
                )
                return self.calculate(updated).intrinsic_value_per_share

        if request.matrix_type == "wacc_growth" and float(np.max(column_values)) >= float(np.min(wacc_values)):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Every terminal growth assumption in the sensitivity matrix must be less than every WACC assumption.",
            )

        matrix = build_sensitivity_matrix(wacc_values, column_values, calculator)
        return SensitivityMatrixResponse(
            matrix_type=request.matrix_type,
            row_values=[float(value) for value in wacc_values],
            column_values=[float(value) for value in column_values],
            cells=[[float(cell) for cell in row] for row in matrix.tolist()],
            base_row_index=self._nearest_index(wacc_values, base_assumptions.discount_rate),
            base_column_index=self._nearest_index(
                column_values,
                base_assumptions.terminal_growth_rate
                if request.matrix_type == "wacc_growth"
                else (base_assumptions.terminal_ebitda_multiple or 12.0),
            ),
            currency_symbol=base_assumptions.currency_symbol,
        )

    def compare_scenarios(self, request: ScenarioCompareRequest) -> ScenarioCompareResponse:
        results = [self.calculate(scenario) for scenario in request.scenarios]
        first = request.scenarios[0]
        return ScenarioCompareResponse(
            company_name=first.company_name,
            model_name=first.model_name,
            currency_symbol=first.currency_symbol,
            results=[
                ScenarioComparisonItem(
                    scenario_name=result.scenario_name,
                    intrinsic_value_per_share=result.intrinsic_value_per_share,
                    enterprise_value=result.enterprise_value,
                    equity_value=result.equity_value,
                    current_price_per_share=result.current_price_per_share,
                    upside_downside_pct=result.upside_downside_pct,
                )
                for result in results
            ],
        )

    def reverse_dcf(self, request: ReverseDcfRequest) -> ReverseDcfResponse:
        assumptions = request.assumptions
        target_market_price = assumptions.current_market_price_per_share
        assert target_market_price is not None

        lower_bound, upper_bound = self._resolve_reverse_bounds(request)
        best_value = lower_bound
        best_price = self.calculate(self._apply_reverse_value(assumptions, request.solve_for, best_value)).intrinsic_value_per_share
        best_error = abs(best_price - target_market_price)
        converged = False
        iterations = 0

        for iterations in range(1, request.max_iterations + 1):
            midpoint = (lower_bound + upper_bound) / 2.0
            updated_assumptions = self._apply_reverse_value(assumptions, request.solve_for, midpoint)
            justified_price = self.calculate(updated_assumptions).intrinsic_value_per_share
            error = justified_price - target_market_price

            if abs(error) < best_error:
                best_value = midpoint
                best_price = justified_price
                best_error = abs(error)

            if abs(error) <= request.tolerance:
                converged = True
                best_value = midpoint
                best_price = justified_price
                best_error = abs(error)
                break

            if error < 0:
                lower_bound = midpoint
            else:
                upper_bound = midpoint

        return ReverseDcfResponse(
            solve_for=request.solve_for,
            target_market_price=target_market_price,
            implied_value=float(best_value),
            justified_price=float(best_price),
            iterations=iterations,
            converged=converged,
            error=float(best_error),
            assumption_label=(
                "Implied constant annual revenue growth"
                if request.solve_for == "revenue_growth"
                else "Implied target EBIT margin"
            ),
        )

    def target_return(self, request: TargetReturnRequest) -> TargetReturnResponse:
        calculation = self.calculate(request.assumptions)
        holding_period_years = request.holding_period_years or request.assumptions.forecast_years
        max_buy_price_today = calculation.intrinsic_value_per_share / ((1.0 + request.desired_annualized_return) ** holding_period_years)
        buy_under_price = calculation.intrinsic_value_per_share * (1.0 - request.margin_of_safety)

        implied_return = None
        current_price = request.assumptions.current_market_price_per_share
        if current_price and current_price > 0:
            implied_return = (calculation.intrinsic_value_per_share / current_price) ** (1.0 / holding_period_years) - 1.0

        return TargetReturnResponse(
            desired_annualized_return=request.desired_annualized_return,
            holding_period_years=holding_period_years,
            intrinsic_value_per_share=calculation.intrinsic_value_per_share,
            max_buy_price_today=float(max_buy_price_today),
            buy_under_price_with_margin_of_safety=float(buy_under_price),
            implied_annualized_return_at_current_price=None if implied_return is None else float(implied_return),
        )

    @staticmethod
    def _resolve_growth_rates(assumptions: DcfAssumptions) -> np.ndarray:
        if assumptions.revenue_growth.mode == "explicit":
            return np.asarray(assumptions.revenue_growth.rates, dtype=np.float64)
        return np.full(assumptions.forecast_years, assumptions.revenue_growth.constant_rate, dtype=np.float64)

    @staticmethod
    def _resolve_margin_series(assumptions: DcfAssumptions) -> np.ndarray:
        mode = assumptions.margin_assumptions.mode
        if mode == "explicit":
            return np.asarray(assumptions.margin_assumptions.values, dtype=np.float64)
        if mode == "fixed":
            return np.full(assumptions.forecast_years, assumptions.margin_assumptions.fixed_margin, dtype=np.float64)
        return np.linspace(
            assumptions.current_ebit_margin,
            assumptions.margin_assumptions.target_margin,
            assumptions.forecast_years,
            dtype=np.float64,
        )

    @staticmethod
    def _resolve_revenue_linked_series(
        revenues: Sequence[float],
        assumptions: RevenueLinkedSeriesInput,
        projection: str = "dna",
    ) -> np.ndarray:
        if projection == "capex":
            return project_capex(
                revenues=revenues,
                mode=assumptions.mode,
                percent_of_revenue=assumptions.percent_of_revenue,
                explicit_values=assumptions.values,
            )
        return project_dna(
            revenues=revenues,
            mode=assumptions.mode,
            percent_of_revenue=assumptions.percent_of_revenue,
            explicit_values=assumptions.values,
        )

    @staticmethod
    def _resolve_net_borrowing(assumptions: DcfAssumptions) -> np.ndarray:
        if assumptions.net_borrowing is None or len(assumptions.net_borrowing) == 0:
            return np.zeros(assumptions.forecast_years, dtype=np.float64)
        return np.asarray(assumptions.net_borrowing, dtype=np.float64)

    @staticmethod
    def _nearest_index(values: Sequence[float], target: float) -> int:
        series = np.asarray(values, dtype=np.float64)
        return int(np.argmin(np.abs(series - target)))

    @staticmethod
    def _generate_axis_values(config: SensitivityAxisConfig, base_value: float, default_step: float) -> np.ndarray:
        if config.values:
            return np.asarray(config.values, dtype=np.float64)

        if config.start is not None and config.end is not None and config.step is not None:
            values = np.arange(config.start, config.end + (config.step / 2.0), config.step, dtype=np.float64)
            return values

        half_span = config.count // 2
        start = base_value - (half_span * default_step)
        end = base_value + (half_span * default_step)
        return np.linspace(start, end, config.count, dtype=np.float64)

    @staticmethod
    def _calculate_terminal_value(
        assumptions: DcfAssumptions,
        terminal_cash_flow: float,
        terminal_ebitda: float,
    ) -> tuple[float, str]:
        if assumptions.terminal_value_method == "gordon_growth":
            terminal_value = calculate_terminal_value_gordon(
                final_cash_flow=terminal_cash_flow,
                discount_rate=assumptions.discount_rate,
                terminal_growth_rate=assumptions.terminal_growth_rate or 0.0,
            )
            formula = "TV = FCF_(n+1) / (Discount Rate - g)"
            return terminal_value, formula

        enterprise_terminal_value = calculate_terminal_value_exit_multiple(
            terminal_ebitda=terminal_ebitda,
            exit_multiple=assumptions.terminal_ebitda_multiple or 0.0,
        )
        if assumptions.model_type == "fcff":
            return enterprise_terminal_value, "TV = Terminal EBITDA * Exit Multiple"

        terminal_equity_value = calculate_equity_value(
            enterprise_value=enterprise_terminal_value,
            cash=assumptions.cash,
            debt=assumptions.debt,
            preferred_equity=assumptions.preferred_equity,
            minority_interest=assumptions.minority_interest,
        )
        return (
            terminal_equity_value,
            "Terminal Equity Value = (Terminal EBITDA * Exit Multiple) + Cash - Debt - Preferred Equity - Minority Interest",
        )

    @staticmethod
    def _resolve_reverse_bounds(request: ReverseDcfRequest) -> tuple[float, float]:
        if request.solve_for == "revenue_growth":
            lower_bound = request.lower_bound if request.lower_bound is not None else -0.3
            upper_bound = request.upper_bound if request.upper_bound is not None else 0.6
        else:
            lower_bound = request.lower_bound if request.lower_bound is not None else request.assumptions.current_ebit_margin
            upper_bound = request.upper_bound if request.upper_bound is not None else 0.7

        if lower_bound >= upper_bound:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Reverse DCF lower_bound must be less than upper_bound.",
            )
        return lower_bound, upper_bound

    @staticmethod
    def _apply_reverse_value(assumptions: DcfAssumptions, solve_for: str, value: float) -> DcfAssumptions:
        if solve_for == "revenue_growth":
            return DcfService._validated_assumptions(
                assumptions,
                {"revenue_growth": RevenueGrowthInput(mode="constant", constant_rate=value)},
            )

        margin_input = (
            MarginInput(mode="fixed", fixed_margin=value)
            if assumptions.margin_assumptions.mode == "fixed"
            else MarginInput(mode="interpolate", target_margin=value)
        )
        return DcfService._validated_assumptions(assumptions, {"margin_assumptions": margin_input})

    @staticmethod
    def _validated_assumptions(assumptions: DcfAssumptions, updates: dict[str, object]) -> DcfAssumptions:
        return DcfAssumptions.model_validate({**assumptions.model_dump(mode="python"), **updates})
